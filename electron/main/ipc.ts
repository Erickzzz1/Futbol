import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import { copyFile } from 'fs/promises';
import { join } from 'path';
import { getDB, closeDB } from './database';

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
    tournament_id: number;
}

export function setupIPC() {
    // Fix: Use a proxy to always get the current DB instance (handles close/re-open on restore)
    const db = {
        prepare: (source: string) => getDB().prepare(source),
        transaction: <T>(fn: (...args: any[]) => T) => getDB().transaction(fn)
    };

    // --- Tournaments ---
    ipcMain.handle('get-tournaments', () => {
        return db.prepare('SELECT * FROM tournaments ORDER BY id DESC').all();
    });

    ipcMain.handle('create-tournament', (_, { name, type, category }) => {
        const stmt = db.prepare('INSERT INTO tournaments (name, type, category) VALUES (?, ?, ?)');
        const info = stmt.run(name, type, category);
        return { id: info.lastInsertRowid, name, type, category };
    });

    ipcMain.handle('get-tournament-details', (_, id) => {
        return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    });

    ipcMain.handle('update-tournament', (_, { id, name, type, category }) => {
        console.log("Updating tournament:", id, name);
        const stmt = db.prepare('UPDATE tournaments SET name = ?, type = ?, category = ? WHERE id = ?');
        stmt.run(name, type, category, id);
        return { id, name, type, category };
    });

    ipcMain.handle('delete-tournament', (_, id) => {
        if (!id) return false;

        // Cascade delete: Goals/Fouls -> Matches -> Players -> Teams -> Tournament

        // 1. Get all teams
        const teams = db.prepare('SELECT id FROM teams WHERE tournament_id = ?').all(id) as { id: number }[];
        const teamIds = teams.map(t => t.id);

        if (teamIds.length > 0) {
            const teamIdsStr = teamIds.join(',');

            // 2. Get matches involving these teams
            const matches = db.prepare(`SELECT id FROM matches WHERE home_team_id IN (${teamIdsStr}) OR away_team_id IN (${teamIdsStr})`).all() as { id: number }[];
            const matchIds = matches.map(m => m.id);

            const transaction = db.transaction(() => {
                if (matchIds.length > 0) {
                    const matchIdsStr = matchIds.join(',');
                    db.prepare(`DELETE FROM goals WHERE match_id IN (${matchIdsStr})`).run();
                    db.prepare(`DELETE FROM cards WHERE match_id IN (${matchIdsStr})`).run();
                    db.prepare(`DELETE FROM matches WHERE id IN (${matchIdsStr})`).run();
                }

                db.prepare(`DELETE FROM players WHERE team_id IN (${teamIdsStr})`).run();
                db.prepare(`DELETE FROM teams WHERE id IN (${teamIdsStr})`).run();
                db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
            });

            try { transaction(); return true; } catch (e) { console.error("Delete tournament failed:", e); return false; }
        } else {
            // No teams, just delete tournament
            try {
                db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
                return true;
            } catch (e) { console.error(e); return false; }
        }
    });

    // --- Teams ---
    ipcMain.handle('get-teams', (_, tournamentId) => {
        if (!tournamentId) return [];
        return db.prepare('SELECT * FROM teams WHERE tournament_id = ? ORDER BY name').all(tournamentId);
    });

    ipcMain.handle('add-team', (_, { name, logo, tournamentId }) => {
        const stmt = db.prepare('INSERT INTO teams (name, logo, tournament_id) VALUES (?, ?, ?)');
        const info = stmt.run(name, logo, tournamentId);
        return { id: info.lastInsertRowid, name, logo, tournament_id: tournamentId };
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
            COALESCE(SUM(CASE WHEN c.type = 'yellow' THEN c.count ELSE 0 END), 0) as match_yellow,
            COALESCE(SUM(CASE WHEN c.type = 'red' THEN c.count ELSE 0 END), 0) as match_red
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN goals g ON p.id = g.player_id
        LEFT JOIN cards c ON p.id = c.player_id
        ${teamId ? 'WHERE p.team_id = ?' : ''}
        GROUP BY p.id
        ORDER BY t.name, p.name
    `;
        const players = teamId ? db.prepare(query).all(teamId) : db.prepare(query).all();
        return players.map((p: any) => ({
            ...p,
            goals: p.match_goals + (p.custom_goals || 0),
            yellow_cards: p.match_yellow + (p.custom_yellow || 0),
            red_cards: p.match_red + (p.custom_red || 0)
        }));
    });

    ipcMain.handle('add-player', (_, { name, team_id, number }) => {
        const stmt = db.prepare('INSERT INTO players (name, team_id, number) VALUES (?, ?, ?)');
        const info = stmt.run(name, team_id, number);
        return { id: info.lastInsertRowid, name, team_id, number };
    });

    ipcMain.handle('update-player', (_, { id, name, number, team_id, custom_goals, custom_yellow, custom_red }) => {
        const stmt = db.prepare(`
        UPDATE players 
        SET name = ?, number = ?, team_id = ?, custom_goals = ?, custom_yellow = ?, custom_red = ?
        WHERE id = ?
     `);
        stmt.run(name, number, team_id, custom_goals || 0, custom_yellow || 0, custom_red || 0, id);
        return true;
    });

    ipcMain.handle('delete-player', (_, id) => {
        db.prepare('DELETE FROM players WHERE id = ?').run(id);
        return true;
    });

    // --- Matches ---
    ipcMain.handle('get-matches', (_, { matchday, stage, tournamentId }) => {
        if (!tournamentId) return [];
        let query = `
        SELECT m.*, t1.name as home_team, t2.name as away_team 
        FROM matches m
        LEFT JOIN teams t1 ON m.home_team_id = t1.id
        LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE t1.tournament_id = ?
    `;
        const params: any[] = [tournamentId];

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

    ipcMain.handle('update-match-score', (_, { id, homeScore, awayScore, scorers, cards }) => {
        const updateMatch = db.prepare(`
        UPDATE matches 
        SET home_score = ?, away_score = ?, status = 'played' 
        WHERE id = ?
    `);
        const insertGoal = db.prepare('INSERT INTO goals (match_id, player_id, count) VALUES (?, ?, ?)');
        // Updated to insert cards
        const insertCard = db.prepare('INSERT INTO cards (match_id, player_id, type, count) VALUES (?, ?, ?, ?)');
        const deleteGoals = db.prepare('DELETE FROM goals WHERE match_id = ?');
        const deleteCards = db.prepare('DELETE FROM cards WHERE match_id = ?');

        const transaction = db.transaction(() => {
            updateMatch.run(homeScore, awayScore, id);
            deleteGoals.run(id);
            deleteCards.run(id);
            if (scorers) for (const s of scorers) insertGoal.run(id, s.playerId, s.count);
            // Cards: { playerId, type, count }
            if (cards) for (const c of cards) insertCard.run(id, c.playerId, c.type, c.count);
        });

        try { transaction(); return true; } catch (e) { return false; }
    });

    // --- Automation ---
    ipcMain.handle('generate-fixture', (_, { startDate, startTime, matchDuration, matchInterval, tournamentId }) => {
        if (!tournamentId) return false;
        // 1. Get all teams for this tournament
        const teams = db.prepare('SELECT id FROM teams WHERE tournament_id = ?').all(tournamentId) as { id: number }[];
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

    ipcMain.handle('generate-playoffs', (_, { stage, startDate, startTime, tournamentId }) => {
        if (!tournamentId) return false;
        console.log(`Generating playoffs for ${stage}. Date: ${startDate}, Time: ${startTime}, Tournament: ${tournamentId}`);
        // Helper to calculate standings inside backend
        // We can reuse the logic from get-standings but we need the raw data

        const getStandingsInternal = () => {
            const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(tournamentId) as any[];
            // Only regular season matches for this tournament
            const matches = db.prepare(`
                SELECT m.* FROM matches m
                JOIN teams t ON m.home_team_id = t.id
                WHERE m.status = 'played' AND m.stage = 'regular' AND t.tournament_id = ?
            `).all(tournamentId) as any[];

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

        // Deduplication check - also need to scope by tournament
        const existingMatches = db.prepare(`
            SELECT count(*) as count FROM matches m
            JOIN teams t ON m.home_team_id = t.id
            WHERE m.stage = ? AND t.tournament_id = ?
        `).get(stage, tournamentId) as { count: number };

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
                // Logic: Find winners of 'quarter' matches within this tournament
                const quarters = db.prepare(`
                    SELECT m.* FROM matches m
                    JOIN teams t ON m.home_team_id = t.id
                    WHERE m.stage = 'quarter' AND t.tournament_id = ?
                    ORDER BY m.id
                `).all(tournamentId) as any[];

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
                const semis = db.prepare(`
                    SELECT m.* FROM matches m
                    JOIN teams t ON m.home_team_id = t.id
                    WHERE m.stage = 'semi' AND t.tournament_id = ?
                    ORDER BY m.id
                `).all(tournamentId) as any[];

                if (semis.length !== 2) throw new Error("Semis not finished");
                if (semis.some(m => m.status !== 'played')) throw new Error("Finish Semis first");

                const getWinner = (m: any) => m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
                const w1 = getWinner(semis[0]);
                const w2 = getWinner(semis[1]);

                const insert = db.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'final', 'scheduled')");
                insert.run(w1, w2, playoffDate);
            }
        });

        try { transaction(); return true; } catch (e) {
            console.error(e);
            return false;
        }
    });

    // --- Stats ---
    ipcMain.handle('get-standings', (_, tournamentId) => {
        if (!tournamentId) return [];

        // Fetch settings or use defaults
        const settingsRaw = db.prepare('SELECT key, value FROM settings WHERE tournament_id = ?').all(tournamentId) as { key: string, value: string }[];
        const settings = settingsRaw.reduce((acc, curr) => ({ ...acc, [curr.key]: Number(curr.value) }), {
            points_win: 3,
            points_draw: 1,
            points_loss: 0
        });

        const ptsWin = settings.points_win;
        const ptsDraw = settings.points_draw;
        const ptsLoss = settings.points_loss;

        // Only REGULAR season counts for standings table
        const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(tournamentId) as any[];
        const matches = db.prepare(`
            SELECT m.* FROM matches m
            JOIN teams t ON m.home_team_id = t.id
            WHERE m.status = 'played' AND m.stage = 'regular' AND t.tournament_id = ?
        `).all(tournamentId) as any[];

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

                if (m.home_score > m.away_score) {
                    home.PG++; home.PTS += ptsWin;
                    away.PP++; away.PTS += ptsLoss;
                } else if (m.home_score < m.away_score) {
                    away.PG++; away.PTS += ptsWin;
                    home.PP++; home.PTS += ptsLoss;
                } else {
                    home.PE++; home.PTS += ptsDraw;
                    away.PE++; away.PTS += ptsDraw;
                }
            }
        }
        standings.forEach(s => { s.DG = s.GF - s.GC; });
        return standings.sort((a, b) => {
            if (b.PTS !== a.PTS) return b.PTS - a.PTS;
            if (b.DG !== a.DG) return b.DG - a.DG;
            return b.GF - a.GF;
        });
    });

    ipcMain.handle('search-global', (_, tournamentId, query) => {
        const term = `%${query}%`;

        const teams = db.prepare(`
            SELECT * FROM teams 
            WHERE tournament_id = ? AND name LIKE ? 
            LIMIT 5
        `).all(tournamentId, term);

        const players = db.prepare(`
            SELECT p.*, t.name as team_name 
            FROM players p
            JOIN teams t ON p.team_id = t.id
            WHERE t.tournament_id = ? AND p.name LIKE ?
            LIMIT 5
        `).all(tournamentId, term);

        const matches = db.prepare(`
            SELECT m.*, 
                   t1.name as home_team, 
                   t2.name as away_team 
            FROM matches m
            JOIN teams t1 ON m.home_team_id = t1.id
            JOIN teams t2 ON m.away_team_id = t2.id
            WHERE t1.tournament_id = ? AND (t1.name LIKE ? OR t2.name LIKE ?)
            ORDER BY m.date DESC
            LIMIT 5
        `).all(tournamentId, term, term);

        // Normalize matches for frontend if needed, but since we select t1.name as home_team etc, it matches the expected struct mostly.
        // Wait, standard getMatches returns home_team as string name.
        // The original query was: SELECT * FROM matches ... which returns home_team_id. 
        // The frontend expects home_team (string name).
        // My previous wrong query assumed matches had home_team string column or similar.
        // Actually, getMatches IPC usually joins.
        // Let's make sure the return shape matches what GlobalSearch expects. GlobalSearch uses m.home_team which is text.
        // So this query is correct: selecting t1.name as home_team.

        return { teams, players, matches };
    });

    ipcMain.handle('get-settings', (_, tournamentId) => {
        if (!tournamentId) return {};
        const rows = db.prepare('SELECT key, value FROM settings WHERE tournament_id = ?').all(tournamentId) as { key: string, value: string }[];
        const defaults = { points_win: '3', points_draw: '1', points_loss: '0' };
        const stored = rows.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        return { ...defaults, ...stored };
    });

    ipcMain.handle('update-setting', (_, { tournamentId, key, value }) => {
        db.prepare('INSERT INTO settings (tournament_id, key, value) VALUES (?, ?, ?) ON CONFLICT(tournament_id, key) DO UPDATE SET value = ?')
            .run(tournamentId, key, String(value), String(value));
        return true;
    });

    ipcMain.handle('get-top-scorers', (_, tournamentId) => {
        if (!tournamentId) return [];
        return db.prepare(`
        SELECT 
            p.name, 
            t.name as team, 
            (COALESCE(SUM(g.count), 0) + p.custom_goals) as goals
        FROM players p
        JOIN teams t ON p.team_id = t.id
        LEFT JOIN goals g ON p.id = g.player_id
        LEFT JOIN matches m ON g.match_id = m.id
        WHERE t.tournament_id = ? AND (m.stage = 'regular' OR m.stage IS NULL)
        GROUP BY p.id
        HAVING goals > 0
        ORDER BY goals DESC
        LIMIT 10
     `).all(tournamentId);
    });

    ipcMain.handle('get-top-cards', (_, tournamentId) => {
        if (!tournamentId) return [];
        return db.prepare(`
        SELECT 
            p.name, 
            t.name as team, 
            (COALESCE(SUM(CASE WHEN c.type = 'yellow' THEN c.count ELSE 0 END), 0) + p.custom_yellow) as yellow,
            (COALESCE(SUM(CASE WHEN c.type = 'red' THEN c.count ELSE 0 END), 0) + p.custom_red) as red
        FROM players p
        JOIN teams t ON p.team_id = t.id
        LEFT JOIN cards c ON p.id = c.player_id
        LEFT JOIN matches m ON c.match_id = m.id
        WHERE t.tournament_id = ? AND (m.stage = 'regular' OR m.stage IS NULL)
        GROUP BY p.id
        HAVING yellow > 0 OR red > 0
        ORDER BY red DESC, yellow DESC
        LIMIT 10
     `).all(tournamentId);
    });

    // Treasury Handlers
    ipcMain.handle('get-treasury-summary', (_, tournamentId) => {
        if (!tournamentId) return [];
        // Get all teams and their payments
        const teams = db.prepare('SELECT id, name FROM teams WHERE tournament_id = ?').all(tournamentId) as any[];
        const payments = db.prepare('SELECT * FROM payments WHERE tournament_id = ?').all(tournamentId) as any[];

        return teams.map(t => {
            const teamPayments = payments.filter(p => p.team_id === t.id);
            const totalDebt = teamPayments.reduce((acc, p) => acc + (p.status === 'pending' ? p.amount : 0), 0);
            return {
                ...t,
                totalDebt,
                payments: teamPayments
            };
        });
    });

    ipcMain.handle('add-payment-obligation', (_, { tournamentId, teamId, concept, amount }) => {
        db.prepare("INSERT INTO payments (tournament_id, team_id, concept, amount, status) VALUES (?, ?, ?, ?, 'pending')")
            .run(tournamentId, teamId, concept, amount);
        return true;
    });

    ipcMain.handle('update-payment-status', (_, { id, status }) => {
        const dateStr = status === 'paid' ? new Date().toISOString() : null;
        db.prepare('UPDATE payments SET status = ?, date_paid = ? WHERE id = ?').run(status, dateStr, id);
        return true;
    });

    ipcMain.handle('delete-payment', (_, id) => {
        db.prepare('DELETE FROM payments WHERE id = ?').run(id);
        return true;
    });

    ipcMain.handle('generate-bulk-payments', (_, { tournamentId, type, amount, matchday }) => {
        if (!tournamentId) return false;
        const amountVal = Number(amount);
        if (isNaN(amountVal) || amountVal <= 0) return false;

        const transaction = db.transaction(() => {
            if (type === 'inscription') {
                const teams = db.prepare("SELECT id FROM teams WHERE tournament_id = ?").all(tournamentId) as { id: number }[];
                const insert = db.prepare("INSERT INTO payments (tournament_id, team_id, concept, amount, status) VALUES (?, ?, 'Inscripción', ?, 'pending')");
                for (const t of teams) {
                    const exists = db.prepare("SELECT id FROM payments WHERE tournament_id = ? AND team_id = ? AND concept = 'Inscripción'").get(tournamentId, t.id);
                    if (!exists) insert.run(tournamentId, t.id, amountVal);
                }
            } else if (type === 'matchday' && matchday) {
                // Get all matches for the matchday involving teams from this tournament
                const matchesAll = db.prepare(`
                    SELECT home_team_id, away_team_id FROM matches 
                    WHERE matchday = ? AND (home_team_id IN (SELECT id FROM teams WHERE tournament_id = ?) OR away_team_id IN (SELECT id FROM teams WHERE tournament_id = ?))
                `).all(matchday, tournamentId, tournamentId) as { home_team_id: number, away_team_id: number }[];

                const insert = db.prepare("INSERT INTO payments (tournament_id, team_id, concept, amount, status) VALUES (?, ?, ?, ?, 'pending')");
                const concept = `Arbitraje J${matchday}`;

                for (const m of matchesAll) {
                    const existsHome = db.prepare("SELECT id FROM payments WHERE tournament_id = ? AND team_id = ? AND concept = ?").get(tournamentId, m.home_team_id, concept);
                    if (!existsHome) insert.run(tournamentId, m.home_team_id, concept, amountVal);

                    const existsAway = db.prepare("SELECT id FROM payments WHERE tournament_id = ? AND team_id = ? AND concept = ?").get(tournamentId, m.away_team_id, concept);
                    if (!existsAway) insert.run(tournamentId, m.away_team_id, concept, amountVal);
                }
            }
        });

        try {
            transaction();
            return true;
        } catch (e) {
            console.error("Bulk payments failed", e);
            return false;
        }
    });

    ipcMain.handle('reset-tournament', (_, tournamentId) => {
        if (!tournamentId) return false;

        // Delete matches where one of the teams belongs to the tournament.
        const teams = db.prepare('SELECT id FROM teams WHERE tournament_id = ?').all(tournamentId) as { id: number }[];
        if (teams.length === 0) return true; // Nothing to reset

        const teamIds = teams.map(t => t.id).join(','); // Safe since IDs are numbers

        // Matches to delete
        const matches = db.prepare(`SELECT id FROM matches WHERE home_team_id IN (${teamIds})`).all() as { id: number }[];
        const matchIds = matches.map(m => m.id).join(',');

        const transaction = db.transaction(() => {
            if (matchIds.length > 0) {
                db.prepare(`DELETE FROM goals WHERE match_id IN (${matchIds})`).run();
                db.prepare(`DELETE FROM cards WHERE match_id IN (${matchIds})`).run();
                db.prepare(`DELETE FROM matches WHERE id IN (${matchIds})`).run();
            }

            // Delete all payments for teams in this tournament
            db.prepare(`DELETE FROM payments WHERE team_id IN (${teamIds})`).run();

            // Reset players custom stats
            db.prepare(`UPDATE players SET custom_goals = 0, custom_yellow = 0, custom_red = 0 WHERE team_id IN (${teamIds})`).run();
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

    ipcMain.handle('seed-players', (_, tournamentId) => {
        if (!tournamentId) return false;
        const getTeams = db.prepare('SELECT id, name FROM teams WHERE tournament_id = ?');
        const getPlayerCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE team_id = ?');
        const insertPlayer = db.prepare('INSERT INTO players (name, number, team_id) VALUES (?, ?, ?)');

        const teams = getTeams.all(tournamentId) as Team[];

        if (teams.length === 0) {
            console.warn(`Attempted to seed players for tournament ${tournamentId} but no teams found.`);
            return false;
        }

        const transaction = db.transaction(() => {
            for (const team of teams) {
                const countResult = getPlayerCount.get(team.id) as { count: number };
                let count = countResult.count;

                let added = 0;
                while (count < 8) {
                    added++;
                    const randomNum = Math.floor(Math.random() * 99) + 1;
                    insertPlayer.run(`Jugador ${added} - ${team.name.substring(0, 3).toUpperCase()}`, randomNum, team.id);
                    count++;
                }
            }
        });

        try { transaction(); return true; } catch (e) { console.error(e); return false; }
    });

    ipcMain.handle('backup-database', async () => {
        const dbPath = join(app.getPath('userData'), 'torneo.sqlite');
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Guardar Copia de Seguridad',
            defaultPath: `respaldo-torneo-${new Date().toISOString().split('T')[0]}.sqlite`,
            filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
        });

        if (canceled || !filePath) return false;

        try {
            await copyFile(dbPath, filePath);
            return true;
        } catch (e) {
            console.error('Backup failed:', e);
            return false;
        }
    });

    ipcMain.handle('restore-database', async () => {
        const dbPath = join(app.getPath('userData'), 'torneo.sqlite');
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Seleccionar Archivo de Respaldo',
            properties: ['openFile'],
            filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
        });

        if (canceled || filePaths.length === 0) return false;
        const backupPath = filePaths[0];

        try {
            // 1. Close existing connection
            closeDB();

            // 2. Wait a bit to ensure lock is released (optional but safe)
            await new Promise(resolve => setTimeout(resolve, 500));

            // 3. Overwrite file
            await copyFile(backupPath, dbPath);
            console.log(`Database restored from ${backupPath}`);

            // 4. Re-open to verify/migrations
            getDB();

            return true;
        } catch (e) {
            console.error('Restore failed:', e);
            // Attempt to re-open if it failed so app doesn't crash on next usage
            try { getDB(); } catch (err) { console.error("Critical: Could not re-open DB after failed restore", err); }
            return false;
        }
    });
}
