import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { getDB } from './database';
// Mock Types to avoid import issues if not shared properly, or just use 'any' for IPC internal logic if laziness prefers
// But let's verify if we can import from src/types or duplicate minimal interfaces.
// IPC main process cannot easily import from src (frontend). Best to define local interfaces.

interface Match {
    id: number;
    home_team_id: number;
    away_team_id: number;
    home_score: number;
    away_score: number;
    matchday: number;
    stage: string;
    date: string;
    status: 'scheduled' | 'played';
}

interface Team {
    id: number;
    name: string;
    logo?: string;
}

export function setupIPC() {
    const db = getDB();
    // --- Teams ---
    ipcMain.handle('get-teams', () => {
        return db.prepare('SELECT * FROM teams ORDER BY name').all();
    });

    ipcMain.handle('add-team', (_, { name, logo }) => {
        const stmt = db.prepare('INSERT INTO teams (name, logo) VALUES (?, ?)');
        const info = stmt.run(name, logo);
        return { id: info.lastInsertRowid, name, logo };
    });

    ipcMain.handle('update-team', (_, { id, name, logo }) => {
        const stmt = db.prepare('UPDATE teams SET name = ?, logo = ? WHERE id = ?');
        stmt.run(name, logo, id);
        return true;
    });

    ipcMain.handle('delete-team', (_, id) => {
        try {
            db.prepare('DELETE FROM teams WHERE id = ?').run(id);
            return true;
        } catch (e) {
            return false;
        }
    });

    // --- Players ---
    ipcMain.handle('get-players', (_, teamId) => {
        const query = `
        SELECT 
            p.*, 
            t.name as team_name,
            COALESCE(SUM(g.count), 0) as match_goals,
            COALESCE(SUM(f.count), 0) as match_fouls
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN goals g ON p.id = g.player_id
        LEFT JOIN fouls f ON p.id = f.player_id
        ${teamId ? 'WHERE p.team_id = ?' : ''}
        GROUP BY p.id
        ORDER BY t.name, p.name
    `;
        const players = teamId ? db.prepare(query).all(teamId) : db.prepare(query).all();
        return players.map((p: any) => ({
            ...p,
            goals: p.match_goals + (p.custom_goals || 0),
            fouls: p.match_fouls + (p.custom_fouls || 0)
        }));
    });

    ipcMain.handle('add-player', (_, { name, team_id, number }) => {
        const stmt = db.prepare('INSERT INTO players (name, team_id, number) VALUES (?, ?, ?)');
        const info = stmt.run(name, team_id, number);
        return { id: info.lastInsertRowid, name, team_id, number };
    });

    ipcMain.handle('update-player', (_, { id, name, number, team_id, custom_goals, custom_fouls }) => {
        const stmt = db.prepare(`
        UPDATE players 
        SET name = ?, number = ?, team_id = ?, custom_goals = ?, custom_fouls = ? 
        WHERE id = ?
     `);
        stmt.run(name, number, team_id, custom_goals || 0, custom_fouls || 0, id);
        return true;
    });

    ipcMain.handle('delete-player', (_, id) => {
        db.prepare('DELETE FROM players WHERE id = ?').run(id);
        return true;
    });

    // --- Matches ---
    ipcMain.handle('get-matches', (_, { matchday, stage }) => {
        let query = `
        SELECT m.*, t1.name as home_team, t2.name as away_team 
        FROM matches m
        LEFT JOIN teams t1 ON m.home_team_id = t1.id
        LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE 1=1
    `;
        const params: any[] = [];

        if (matchday) {
            query += ' AND matchday = ?';
            params.push(matchday);
        }
        if (stage) {
            query += ' AND stage = ?';
            params.push(stage);
        }

        query += ' ORDER BY matchday DESC, id DESC';
        return db.prepare(query).all(...params);
    });

    ipcMain.handle('add-match', (_, { home_team_id, away_team_id, matchday, date, stage }) => {
        const stmt = db.prepare('INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage) VALUES (?, ?, ?, ?, ?)');
        // Default to 'regular' if stage not provided
        const info = stmt.run(home_team_id, away_team_id, matchday, date, stage || 'regular');
        return info.lastInsertRowid;
    });

    ipcMain.handle('update-match-score', (_, { id, homeScore, awayScore, scorers, foulers }) => {
        const updateMatch = db.prepare(`
        UPDATE matches 
        SET home_score = ?, away_score = ?, status = 'played' 
        WHERE id = ?
    `);
        const insertGoal = db.prepare('INSERT INTO goals (match_id, player_id, count) VALUES (?, ?, ?)');
        const insertFoul = db.prepare('INSERT INTO fouls (match_id, player_id, count) VALUES (?, ?, ?)');
        const deleteGoals = db.prepare('DELETE FROM goals WHERE match_id = ?');
        const deleteFouls = db.prepare('DELETE FROM fouls WHERE match_id = ?');

        const transaction = db.transaction(() => {
            updateMatch.run(homeScore, awayScore, id);
            deleteGoals.run(id);
            deleteFouls.run(id);
            if (scorers) for (const s of scorers) insertGoal.run(id, s.playerId, s.count);
            if (foulers) for (const s of foulers) insertFoul.run(id, s.playerId, s.count);
        });

        try { transaction(); return true; } catch (e) { return false; }
    });

    // --- Automation ---
    ipcMain.handle('generate-fixture', (_, { startDate, startTime, matchDuration, matchInterval }) => {
        // 1. Get all teams
        const teams = db.prepare('SELECT id FROM teams').all() as { id: number }[];
        if (teams.length < 2) return false;

        // Default values
        const interval = matchInterval || 7;
        const duration = matchDuration || 40; // minutes

        let currentDate: Date;
        if (startDate && startTime) {
            currentDate = new Date(`${startDate}T${startTime}`);
        } else {
            // Fallback if not provided, though UI should provide it.
            currentDate = new Date();
            currentDate.setHours(9, 0, 0, 0);
        }

        // Circle Method
        let pool = [...teams.map(t => t.id)];
        if (pool.length % 2 !== 0) {
            pool.push(-1); // -1 = Bye
        }

        const n = pool.length;
        const rounds = n - 1;
        const matchesPerRound = n / 2;

        const insertMatch = db.prepare('INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage) VALUES (?, ?, ?, ?, ?)');

        const transaction = db.transaction(() => {
            for (let r = 0; r < rounds; r++) {
                // Round r+1
                const matchday = r + 1;

                // Calculate base date for this matchday
                // Matchday 1 = currentDate
                // Matchday 2 = currentDate + interval days
                let matchdayBaseDate = new Date(currentDate);
                matchdayBaseDate.setDate(matchdayBaseDate.getDate() + (r * interval));

                // Reset time for the start of the matchday
                if (startDate && startTime) {
                    const [h, m] = startTime.split(':').map(Number);
                    matchdayBaseDate.setHours(h, m, 0, 0);
                }

                for (let i = 0; i < matchesPerRound; i++) {
                    const t1 = pool[i];
                    const t2 = pool[n - 1 - i];

                    if (t1 !== -1 && t2 !== -1) {
                        // Calculate specific match time
                        // We add duration * i minutes to the base time
                        let matchDate = new Date(matchdayBaseDate);
                        matchDate.setMinutes(matchDate.getMinutes() + (i * duration));

                        // Alternate home/away based on round for fairness (simple alt)
                        if (matchday % 2 === 0) {
                            insertMatch.run(t1, t2, matchday, matchDate.toISOString(), 'regular');
                        } else {
                            insertMatch.run(t2, t1, matchday, matchDate.toISOString(), 'regular');
                        }
                    }
                }
                // Rotate pool: keep [0] fixed, rotate the rest
                const fixed = pool[0];
                const moving = pool.slice(1);
                const last = moving.pop()!;
                moving.unshift(last);
                pool = [fixed, ...moving];
            }
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });

    ipcMain.handle('generate-playoffs', (_, { stage, startDate, startTime }) => {
        console.log(`Generating playoffs for ${stage}. Date: ${startDate}, Time: ${startTime}`);
        // Helper to calculate standings inside backend
        // We can reuse the logic from get-standings but we need the raw data
        // For brevity, let's copy the logic or extract it.
        // Since we need to sort to find top 8.

        const getStandingsInternal = () => {
            const teams = db.prepare('SELECT * FROM teams').all() as any[];
            const matches = db.prepare("SELECT * FROM matches WHERE status = 'played' AND stage = 'regular'").all() as any[];

            const standings = teams.map(team => ({ id: team.id, PTS: 0, DG: 0, GF: 0, GC: 0 }));
            const teamMap = new Map(standings.map(s => [s.id, s]));

            for (const m of matches) {
                const home = teamMap.get(m.home_team_id);
                const away = teamMap.get(m.away_team_id);
                if (home && away) {
                    home.GF += m.home_score; home.GC += m.away_score;
                    away.GF += m.away_score; away.GC += m.home_score;
                    if (m.home_score > m.away_score) home.PTS += 3;
                    else if (m.home_score < m.away_score) away.PTS += 3;
                    else { home.PTS += 1; away.PTS += 1; }
                }
            }
            standings.forEach(s => s.DG = s.GF - s.GC);
            return standings.sort((a, b) => {
                if (b.PTS !== a.PTS) return b.PTS - a.PTS;
                if (b.DG !== a.DG) return b.DG - a.DG;
                return b.GF - a.GF;
            });
        };

        // Deduplication check
        const existingMatches = db.prepare('SELECT count(*) as count FROM matches WHERE stage = ?').get(stage) as { count: number };
        if (existingMatches.count > 0) {
            throw new Error(`Los partidos de ${stage} ya fueron generados.`);
        }

        const calculatePlayoffDate = () => {
            if (startDate && startTime) {
                const combined = `${startDate}T${startTime}`;
                const d = new Date(combined);
                console.log(`Parsing date: ${combined} -> ${d.toISOString()}`); // explicit log
                if (!isNaN(d.getTime())) {
                    return d.toISOString();
                } else {
                    throw new Error("Fecha u hora inválida proporcionada.");
                }
            }
            // Fallback only if NO date provided (should not happen with new default state)
            console.log("No date provided, using NOW");
            return new Date().toISOString();
        };

        const playoffDate = calculatePlayoffDate();

        const transaction = db.transaction(() => {
            if (stage === 'quarter') {
                // 1. Get Top 8
                const table = getStandingsInternal();
                const top8 = table.slice(0, 8);
                if (top8.length < 8) throw new Error("Not enough teams for Top 8");

                const insert = db.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'quarter', 'scheduled')");
                const d = playoffDate;

                // 1 vs 8
                insert.run(top8[0].id, top8[7].id, d);
                // 2 vs 7
                insert.run(top8[1].id, top8[6].id, d);
                // 3 vs 6
                insert.run(top8[2].id, top8[5].id, d);
                // 4 vs 5
                insert.run(top8[3].id, top8[4].id, d);

            } else if (stage === 'semi') {
                // Logic: Find winners of 'quarter' matches
                // This is tricky. We need to know WHICH match corresponds to 1v8 etc. 
                // Simplification: We assume the Quarter finals are stored in ID order: 1v8, 2v7, 3v6, 4v5.
                // A better way is to look at the teams. 
                // But for this MVP: 
                // Fetch 'quarter' matches. Identify winner.
                const quarters = db.prepare("SELECT * FROM matches WHERE stage = 'quarter' ORDER BY id").all() as any[];
                if (quarters.length !== 4) throw new Error("Quarters not finished or invalid count");
                if (quarters.some(m => m.status !== 'played')) throw new Error("Finish Quarter finals first");

                const getWinner = (m: any) => m.home_score > m.away_score ? m.home_team_id : m.away_team_id; // No penalties logic yet, assume winner exists

                // Bracket: Winner(1v8) vs Winner(4v5)  AND Winner(2v7) vs Winner(3v6)
                // Order of insertion was: 1v8, 2v7, 3v6, 4v5.
                // quarters[0] = 1v8
                // quarters[1] = 2v7
                // quarters[2] = 3v6
                // quarters[3] = 4v5

                const w1 = getWinner(quarters[0]);
                const w2 = getWinner(quarters[3]);
                const w3 = getWinner(quarters[1]);
                const w4 = getWinner(quarters[2]);

                const insert = db.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'semi', 'scheduled')");
                const d = playoffDate;

                insert.run(w1, w2, d);
                insert.run(w3, w4, d);

            } else if (stage === 'final') {
                const semis = db.prepare("SELECT * FROM matches WHERE stage = 'semi' ORDER BY id").all() as any[];
                if (semis.length !== 2) throw new Error("Semis not finished");
                if (semis.some(m => m.status !== 'played')) throw new Error("Finish Semis first");

                const getWinner = (m: any) => m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
                const w1 = getWinner(semis[0]);
                const w2 = getWinner(semis[1]);

                const insert = db.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'final', 'scheduled')");
                insert.run(w1, w2, playoffDate);
            }
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });

    // --- Stats ---
    ipcMain.handle('get-standings', () => {
        // Only REGULAR season counts for standings table
        const teams = db.prepare('SELECT * FROM teams').all() as any[];
        const matches = db.prepare("SELECT * FROM matches WHERE status = 'played' AND stage = 'regular'").all() as any[];

        const standings = teams.map(team => ({
            id: team.id,
            name: team.name,
            logo: team.logo,
            PJ: 0, PG: 0, PE: 0, PP: 0, GF: 0, GC: 0, DG: 0, PTS: 0
        }));

        const teamMap = new Map(standings.map(s => [s.id, s]));

        for (const m of matches) {
            const home = teamMap.get(m.home_team_id);
            const away = teamMap.get(m.away_team_id);

            if (home && away) {
                home.PJ++; away.PJ++;
                home.GF += m.home_score; home.GC += m.away_score;
                away.GF += m.away_score; away.GC += m.home_score;
                if (m.home_score > m.away_score) { home.PG++; home.PTS += 3; away.PP++; }
                else if (m.home_score < m.away_score) { away.PG++; away.PTS += 3; home.PP++; }
                else { home.PE++; home.PTS += 1; away.PE++; away.PTS += 1; }
            }
        }
        standings.forEach(s => { s.DG = s.GF - s.GC; });
        return standings.sort((a, b) => {
            if (b.PTS !== a.PTS) return b.PTS - a.PTS;
            if (b.DG !== a.DG) return b.DG - a.DG;
            return b.GF - a.GF;
        });
    });

    ipcMain.handle('get-top-scorers', () => {
        return db.prepare(`
        SELECT 
            p.name, 
            t.name as team, 
            (COALESCE(SUM(g.count), 0) + p.custom_goals) as goals
        FROM players p
        JOIN teams t ON p.team_id = t.id
        LEFT JOIN goals g ON p.id = g.player_id
        LEFT JOIN matches m ON g.match_id = m.id
        WHERE m.stage = 'regular' OR m.stage IS NULL
        GROUP BY p.id
        HAVING goals > 0
        ORDER BY goals DESC
        LIMIT 10
     `).all();
    });

    ipcMain.handle('reset-tournament', () => {
        const deleteMatches = db.prepare('DELETE FROM matches');
        const deleteGoals = db.prepare('DELETE FROM goals');
        const deleteFouls = db.prepare('DELETE FROM fouls');
        const resetPlayers = db.prepare('UPDATE players SET custom_goals = 0, custom_fouls = 0');

        const transaction = db.transaction(() => {
            deleteGoals.run();
            deleteFouls.run();
            deleteMatches.run();
            resetPlayers.run();
            try { db.prepare("DELETE FROM sqlite_sequence WHERE name='matches'").run(); } catch (e) { }
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });

    ipcMain.handle('swap-matches', (_, { matchId1, matchId2 }) => {
        const getMatch = db.prepare('SELECT date FROM matches WHERE id = ?');
        const updateMatch = db.prepare('UPDATE matches SET date = ? WHERE id = ?');

        const m1 = getMatch.get(matchId1) as Match;
        const m2 = getMatch.get(matchId2) as Match;

        if (!m1 || !m2) return false;

        const transaction = db.transaction(() => {
            updateMatch.run(m2.date, matchId1);
            updateMatch.run(m1.date, matchId2);
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });

    ipcMain.handle('seed-players', () => {
        const getTeams = db.prepare('SELECT id, name FROM teams');
        const getPlayerCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE team_id = ?');
        const insertPlayer = db.prepare('INSERT INTO players (name, number, team_id) VALUES (?, ?, ?)');

        const teams = getTeams.all() as Team[];

        const transaction = db.transaction(() => {
            for (const team of teams) {
                const countResult = getPlayerCount.get(team.id) as { count: number };
                let count = countResult.count;

                let added = 0;
                while (count < 8) {
                    added++;
                    const randomNum = Math.floor(Math.random() * 99) + 1;
                    // Check if number exists logic skipped for seeded players for simplicity/speed or assume low collision risk/don't care for fillers
                    // Actually, let's try to be slightly smart? No, just random is fine for "fillers". 
                    // To avoid unique constraint error if any (schema doesn't enforce unique number per team usually, but good practice):
                    // Schema: CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, number INTEGER, team_id INTEGER, custom_goals INTEGER DEFAULT 0, custom_fouls INTEGER DEFAULT 0, FOREIGN KEY(team_id) REFERENCES teams(id));
                    insertPlayer.run(`Jugador ${added} - ${team.name.substring(0, 3).toUpperCase()}`, randomNum, team.id);
                    count++;
                }
            }
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });
}
// Force reload
