"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const promises = require("fs/promises");
const Database = require("better-sqlite3");
let db = null;
function getDB() {
  if (!db) {
    const dbPath = path.join(electron.app.getPath("userData"), "torneo.sqlite");
    try {
      db = new Database(dbPath);
      initSchema(db);
    } catch (e) {
      console.error("Error opening database:", e);
      throw e;
    }
  }
  return db;
}
function closeDB() {
  if (db) {
    console.log("Closing database connection...");
    db.close();
    db = null;
  }
}
function initSchema(database) {
  const schema = `
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT, -- Dominical Nocturno, etc.
      category TEXT -- Prebenjamín, etc.
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT,
      tournament_id INTEGER,
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      team_id INTEGER,
      number INTEGER,
      custom_goals INTEGER DEFAULT 0,
      custom_fouls INTEGER DEFAULT 0,
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team_id INTEGER,
      away_team_id INTEGER,
      home_score INTEGER DEFAULT 0,
      away_score INTEGER DEFAULT 0,
      matchday INTEGER,
      date TEXT,
      status TEXT DEFAULT 'scheduled',
      stage TEXT DEFAULT 'regular', -- regular, quarter, semi, final
      FOREIGN KEY(home_team_id) REFERENCES teams(id),
      FOREIGN KEY(away_team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      player_id INTEGER,
      count INTEGER DEFAULT 1,
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fouls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      player_id INTEGER,
      count INTEGER DEFAULT 1,
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `;
  database.exec(schema);
  try {
    const columns = database.prepare("PRAGMA table_info(teams)").all();
    const hasTournamentId = columns.some((c) => c.name === "tournament_id");
    if (!hasTournamentId) {
      database.prepare("ALTER TABLE teams ADD COLUMN tournament_id INTEGER").run();
      console.log("Migrated: Added 'tournament_id' column to teams");
      const defaultTournament = database.prepare("SELECT id FROM tournaments WHERE name = 'Torneo Default'").get();
      let tournamentId = defaultTournament?.id;
      if (!tournamentId) {
        const info = database.prepare("INSERT INTO tournaments (name, type, category) VALUES (?, ?, ?)").run("Torneo Default", "Dominical Matutino", "Libre");
        tournamentId = info.lastInsertRowid;
      }
      database.prepare("UPDATE teams SET tournament_id = ? WHERE tournament_id IS NULL").run(tournamentId);
    } else {
      database.prepare("UPDATE tournaments SET type = 'Dominical Matutino' WHERE name = 'Torneo Default' AND type = 'General'").run();
    }
  } catch (e) {
    console.error("Migration check failed (teams):", e);
  }
  try {
    const columns = database.prepare("PRAGMA table_info(matches)").all();
    const hasStage = columns.some((c) => c.name === "stage");
    if (!hasStage) {
      database.prepare("ALTER TABLE matches ADD COLUMN stage TEXT DEFAULT 'regular'").run();
      console.log("Migrated: Added 'stage' column to matches");
    }
  } catch (e) {
    console.error("Migration check failed (matches):", e);
  }
  try {
    const columns = database.prepare("PRAGMA table_info(players)").all();
    const hasCustomGoals = columns.some((c) => c.name === "custom_goals");
    const hasCustomFouls = columns.some((c) => c.name === "custom_fouls");
    if (!hasCustomGoals) {
      database.prepare("ALTER TABLE players ADD COLUMN custom_goals INTEGER DEFAULT 0").run();
      console.log("Migrated: Added 'custom_goals' column to players");
    }
    if (!hasCustomFouls) {
      database.prepare("ALTER TABLE players ADD COLUMN custom_fouls INTEGER DEFAULT 0").run();
      console.log("Migrated: Added 'custom_fouls' column to players");
    }
  } catch (e) {
    console.error("Migration check failed (players):", e);
  }
}
function setupIPC() {
  const db2 = {
    prepare: (source) => getDB().prepare(source),
    transaction: (fn) => getDB().transaction(fn)
  };
  electron.ipcMain.handle("get-tournaments", () => {
    return db2.prepare("SELECT * FROM tournaments ORDER BY id DESC").all();
  });
  electron.ipcMain.handle("create-tournament", (_, { name, type, category }) => {
    const stmt = db2.prepare("INSERT INTO tournaments (name, type, category) VALUES (?, ?, ?)");
    const info = stmt.run(name, type, category);
    return { id: info.lastInsertRowid, name, type, category };
  });
  electron.ipcMain.handle("get-tournament-details", (_, id) => {
    return db2.prepare("SELECT * FROM tournaments WHERE id = ?").get(id);
  });
  electron.ipcMain.handle("update-tournament", (_, { id, name, type, category }) => {
    console.log("Updating tournament:", id, name);
    const stmt = db2.prepare("UPDATE tournaments SET name = ?, type = ?, category = ? WHERE id = ?");
    stmt.run(name, type, category, id);
    return { id, name, type, category };
  });
  electron.ipcMain.handle("delete-tournament", (_, id) => {
    if (!id) return false;
    const teams = db2.prepare("SELECT id FROM teams WHERE tournament_id = ?").all(id);
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length > 0) {
      const teamIdsStr = teamIds.join(",");
      const matches = db2.prepare(`SELECT id FROM matches WHERE home_team_id IN (${teamIdsStr}) OR away_team_id IN (${teamIdsStr})`).all();
      const matchIds = matches.map((m) => m.id);
      const transaction = db2.transaction(() => {
        if (matchIds.length > 0) {
          const matchIdsStr = matchIds.join(",");
          db2.prepare(`DELETE FROM goals WHERE match_id IN (${matchIdsStr})`).run();
          db2.prepare(`DELETE FROM fouls WHERE match_id IN (${matchIdsStr})`).run();
          db2.prepare(`DELETE FROM matches WHERE id IN (${matchIdsStr})`).run();
        }
        db2.prepare(`DELETE FROM players WHERE team_id IN (${teamIdsStr})`).run();
        db2.prepare(`DELETE FROM teams WHERE id IN (${teamIdsStr})`).run();
        db2.prepare("DELETE FROM tournaments WHERE id = ?").run(id);
      });
      try {
        transaction();
        return true;
      } catch (e) {
        console.error("Delete tournament failed:", e);
        return false;
      }
    } else {
      try {
        db2.prepare("DELETE FROM tournaments WHERE id = ?").run(id);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  });
  electron.ipcMain.handle("get-teams", (_, tournamentId) => {
    if (!tournamentId) return [];
    return db2.prepare("SELECT * FROM teams WHERE tournament_id = ? ORDER BY name").all(tournamentId);
  });
  electron.ipcMain.handle("add-team", (_, { name, logo, tournamentId }) => {
    const stmt = db2.prepare("INSERT INTO teams (name, logo, tournament_id) VALUES (?, ?, ?)");
    const info = stmt.run(name, logo, tournamentId);
    return { id: info.lastInsertRowid, name, logo, tournament_id: tournamentId };
  });
  electron.ipcMain.handle("update-team", (_, { id, name, logo }) => {
    const stmt = db2.prepare("UPDATE teams SET name = ?, logo = ? WHERE id = ?");
    stmt.run(name, logo, id);
    return true;
  });
  electron.ipcMain.handle("delete-team", (_, id) => {
    try {
      db2.prepare("DELETE FROM teams WHERE id = ?").run(id);
      return true;
    } catch (e) {
      return false;
    }
  });
  electron.ipcMain.handle("get-players", (_, teamId) => {
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
        ${teamId ? "WHERE p.team_id = ?" : ""}
        GROUP BY p.id
        ORDER BY t.name, p.name
    `;
    const players = teamId ? db2.prepare(query).all(teamId) : db2.prepare(query).all();
    return players.map((p) => ({
      ...p,
      goals: p.match_goals + (p.custom_goals || 0),
      fouls: p.match_fouls + (p.custom_fouls || 0)
    }));
  });
  electron.ipcMain.handle("add-player", (_, { name, team_id, number }) => {
    const stmt = db2.prepare("INSERT INTO players (name, team_id, number) VALUES (?, ?, ?)");
    const info = stmt.run(name, team_id, number);
    return { id: info.lastInsertRowid, name, team_id, number };
  });
  electron.ipcMain.handle("update-player", (_, { id, name, number, team_id, custom_goals, custom_fouls }) => {
    const stmt = db2.prepare(`
        UPDATE players 
        SET name = ?, number = ?, team_id = ?, custom_goals = ?, custom_fouls = ? 
        WHERE id = ?
     `);
    stmt.run(name, number, team_id, custom_goals || 0, custom_fouls || 0, id);
    return true;
  });
  electron.ipcMain.handle("delete-player", (_, id) => {
    db2.prepare("DELETE FROM players WHERE id = ?").run(id);
    return true;
  });
  electron.ipcMain.handle("get-matches", (_, { matchday, stage, tournamentId }) => {
    if (!tournamentId) return [];
    let query = `
        SELECT m.*, t1.name as home_team, t2.name as away_team 
        FROM matches m
        LEFT JOIN teams t1 ON m.home_team_id = t1.id
        LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE t1.tournament_id = ?
    `;
    const params = [tournamentId];
    if (matchday) {
      query += " AND matchday = ?";
      params.push(matchday);
    }
    if (stage) {
      query += " AND stage = ?";
      params.push(stage);
    }
    query += " ORDER BY matchday DESC, id DESC";
    return db2.prepare(query).all(...params);
  });
  electron.ipcMain.handle("add-match", (_, { home_team_id, away_team_id, matchday, date, stage }) => {
    const stmt = db2.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(home_team_id, away_team_id, matchday, date, stage || "regular");
    return info.lastInsertRowid;
  });
  electron.ipcMain.handle("update-match-score", (_, { id, homeScore, awayScore, scorers, foulers }) => {
    const updateMatch = db2.prepare(`
        UPDATE matches 
        SET home_score = ?, away_score = ?, status = 'played' 
        WHERE id = ?
    `);
    const insertGoal = db2.prepare("INSERT INTO goals (match_id, player_id, count) VALUES (?, ?, ?)");
    const insertFoul = db2.prepare("INSERT INTO fouls (match_id, player_id, count) VALUES (?, ?, ?)");
    const deleteGoals = db2.prepare("DELETE FROM goals WHERE match_id = ?");
    const deleteFouls = db2.prepare("DELETE FROM fouls WHERE match_id = ?");
    const transaction = db2.transaction(() => {
      updateMatch.run(homeScore, awayScore, id);
      deleteGoals.run(id);
      deleteFouls.run(id);
      if (scorers) for (const s of scorers) insertGoal.run(id, s.playerId, s.count);
      if (foulers) for (const s of foulers) insertFoul.run(id, s.playerId, s.count);
    });
    try {
      transaction();
      return true;
    } catch (e) {
      return false;
    }
  });
  electron.ipcMain.handle("generate-fixture", (_, { startDate, startTime, matchDuration, matchInterval, tournamentId }) => {
    if (!tournamentId) return false;
    const teams = db2.prepare("SELECT id FROM teams WHERE tournament_id = ?").all(tournamentId);
    if (teams.length < 2) return false;
    const interval = matchInterval || 7;
    const duration = matchDuration || 40;
    let currentDate;
    if (startDate && startTime) {
      currentDate = /* @__PURE__ */ new Date(`${startDate}T${startTime}`);
    } else {
      currentDate = /* @__PURE__ */ new Date();
      currentDate.setHours(9, 0, 0, 0);
    }
    let pool = [...teams.map((t) => t.id)];
    if (pool.length % 2 !== 0) {
      pool.push(-1);
    }
    const n = pool.length;
    const rounds = n - 1;
    const matchesPerRound = n / 2;
    const insertMatch = db2.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage) VALUES (?, ?, ?, ?, ?)");
    const transaction = db2.transaction(() => {
      for (let r = 0; r < rounds; r++) {
        const matchday = r + 1;
        let matchdayBaseDate = new Date(currentDate);
        matchdayBaseDate.setDate(matchdayBaseDate.getDate() + r * interval);
        if (startDate && startTime) {
          const [h, m] = startTime.split(":").map(Number);
          matchdayBaseDate.setHours(h, m, 0, 0);
        }
        for (let i = 0; i < matchesPerRound; i++) {
          const t1 = pool[i];
          const t2 = pool[n - 1 - i];
          if (t1 !== -1 && t2 !== -1) {
            let matchDate = new Date(matchdayBaseDate);
            matchDate.setMinutes(matchDate.getMinutes() + i * duration);
            if (matchday % 2 === 0) {
              insertMatch.run(t1, t2, matchday, matchDate.toISOString(), "regular");
            } else {
              insertMatch.run(t2, t1, matchday, matchDate.toISOString(), "regular");
            }
          }
        }
        const fixed = pool[0];
        const moving = pool.slice(1);
        const last = moving.pop();
        moving.unshift(last);
        pool = [fixed, ...moving];
      }
    });
    try {
      transaction();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  electron.ipcMain.handle("generate-playoffs", (_, { stage, startDate, startTime, tournamentId }) => {
    if (!tournamentId) return false;
    console.log(`Generating playoffs for ${stage}. Date: ${startDate}, Time: ${startTime}, Tournament: ${tournamentId}`);
    const getStandingsInternal = () => {
      const teams = db2.prepare("SELECT * FROM teams WHERE tournament_id = ?").all(tournamentId);
      const matches = db2.prepare(`
                SELECT m.* FROM matches m
                JOIN teams t ON m.home_team_id = t.id
                WHERE m.status = 'played' AND m.stage = 'regular' AND t.tournament_id = ?
            `).all(tournamentId);
      const standings = teams.map((team) => ({ id: team.id, PTS: 0, DG: 0, GF: 0, GC: 0 }));
      const teamMap = new Map(standings.map((s) => [s.id, s]));
      for (const m of matches) {
        const home = teamMap.get(m.home_team_id);
        const away = teamMap.get(m.away_team_id);
        if (home && away) {
          home.GF += m.home_score;
          home.GC += m.away_score;
          away.GF += m.away_score;
          away.GC += m.home_score;
          if (m.home_score > m.away_score) home.PTS += 3;
          else if (m.home_score < m.away_score) away.PTS += 3;
          else {
            home.PTS += 1;
            away.PTS += 1;
          }
        }
      }
      standings.forEach((s) => s.DG = s.GF - s.GC);
      return standings.sort((a, b) => {
        if (b.PTS !== a.PTS) return b.PTS - a.PTS;
        if (b.DG !== a.DG) return b.DG - a.DG;
        return b.GF - a.GF;
      });
    };
    const existingMatches = db2.prepare(`
            SELECT count(*) as count FROM matches m
            JOIN teams t ON m.home_team_id = t.id
            WHERE m.stage = ? AND t.tournament_id = ?
        `).get(stage, tournamentId);
    if (existingMatches.count > 0) {
      throw new Error(`Los partidos de ${stage} ya fueron generados.`);
    }
    const calculatePlayoffDate = () => {
      if (startDate && startTime) {
        const combined = `${startDate}T${startTime}`;
        const d = new Date(combined);
        console.log(`Parsing date: ${combined} -> ${d.toISOString()}`);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        } else {
          throw new Error("Fecha u hora inválida proporcionada.");
        }
      }
      console.log("No date provided, using NOW");
      return (/* @__PURE__ */ new Date()).toISOString();
    };
    const playoffDate = calculatePlayoffDate();
    const transaction = db2.transaction(() => {
      if (stage === "quarter") {
        const table = getStandingsInternal();
        const top8 = table.slice(0, 8);
        if (top8.length < 8) throw new Error("Not enough teams for Top 8");
        const insert = db2.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'quarter', 'scheduled')");
        const d = playoffDate;
        insert.run(top8[0].id, top8[7].id, d);
        insert.run(top8[1].id, top8[6].id, d);
        insert.run(top8[2].id, top8[5].id, d);
        insert.run(top8[3].id, top8[4].id, d);
      } else if (stage === "semi") {
        const quarters = db2.prepare(`
                    SELECT m.* FROM matches m
                    JOIN teams t ON m.home_team_id = t.id
                    WHERE m.stage = 'quarter' AND t.tournament_id = ?
                    ORDER BY m.id
                `).all(tournamentId);
        if (quarters.length !== 4) throw new Error("Quarters not finished or invalid count");
        if (quarters.some((m) => m.status !== "played")) throw new Error("Finish Quarter finals first");
        const getWinner = (m) => m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
        const w1 = getWinner(quarters[0]);
        const w2 = getWinner(quarters[3]);
        const w3 = getWinner(quarters[1]);
        const w4 = getWinner(quarters[2]);
        const insert = db2.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'semi', 'scheduled')");
        const d = playoffDate;
        insert.run(w1, w2, d);
        insert.run(w3, w4, d);
      } else if (stage === "final") {
        const semis = db2.prepare(`
                    SELECT m.* FROM matches m
                    JOIN teams t ON m.home_team_id = t.id
                    WHERE m.stage = 'semi' AND t.tournament_id = ?
                    ORDER BY m.id
                `).all(tournamentId);
        if (semis.length !== 2) throw new Error("Semis not finished");
        if (semis.some((m) => m.status !== "played")) throw new Error("Finish Semis first");
        const getWinner = (m) => m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
        const w1 = getWinner(semis[0]);
        const w2 = getWinner(semis[1]);
        const insert = db2.prepare("INSERT INTO matches (home_team_id, away_team_id, matchday, date, stage, status) VALUES (?, ?, 0, ?, 'final', 'scheduled')");
        insert.run(w1, w2, playoffDate);
      }
    });
    try {
      transaction();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  electron.ipcMain.handle("get-standings", (_, tournamentId) => {
    if (!tournamentId) return [];
    const teams = db2.prepare("SELECT * FROM teams WHERE tournament_id = ?").all(tournamentId);
    const matches = db2.prepare(`
            SELECT m.* FROM matches m
            JOIN teams t ON m.home_team_id = t.id
            WHERE m.status = 'played' AND m.stage = 'regular' AND t.tournament_id = ?
        `).all(tournamentId);
    const standings = teams.map((team) => ({
      id: team.id,
      name: team.name,
      logo: team.logo,
      PJ: 0,
      PG: 0,
      PE: 0,
      PP: 0,
      GF: 0,
      GC: 0,
      DG: 0,
      PTS: 0
    }));
    const teamMap = new Map(standings.map((s) => [s.id, s]));
    for (const m of matches) {
      const home = teamMap.get(m.home_team_id);
      const away = teamMap.get(m.away_team_id);
      if (home && away) {
        home.PJ++;
        away.PJ++;
        home.GF += m.home_score;
        home.GC += m.away_score;
        away.GF += m.away_score;
        away.GC += m.home_score;
        if (m.home_score > m.away_score) {
          home.PG++;
          home.PTS += 3;
          away.PP++;
        } else if (m.home_score < m.away_score) {
          away.PG++;
          away.PTS += 3;
          home.PP++;
        } else {
          home.PE++;
          home.PTS += 1;
          away.PE++;
          away.PTS += 1;
        }
      }
    }
    standings.forEach((s) => {
      s.DG = s.GF - s.GC;
    });
    return standings.sort((a, b) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS;
      if (b.DG !== a.DG) return b.DG - a.DG;
      return b.GF - a.GF;
    });
  });
  electron.ipcMain.handle("get-top-scorers", (_, tournamentId) => {
    if (!tournamentId) return [];
    return db2.prepare(`
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
  electron.ipcMain.handle("reset-tournament", (_, tournamentId) => {
    if (!tournamentId) return false;
    const teams = db2.prepare("SELECT id FROM teams WHERE tournament_id = ?").all(tournamentId);
    if (teams.length === 0) return true;
    const teamIds = teams.map((t) => t.id).join(",");
    const matches = db2.prepare(`SELECT id FROM matches WHERE home_team_id IN (${teamIds})`).all();
    const matchIds = matches.map((m) => m.id).join(",");
    const transaction = db2.transaction(() => {
      if (matchIds.length > 0) {
        db2.prepare(`DELETE FROM goals WHERE match_id IN (${matchIds})`).run();
        db2.prepare(`DELETE FROM fouls WHERE match_id IN (${matchIds})`).run();
        db2.prepare(`DELETE FROM matches WHERE id IN (${matchIds})`).run();
      }
      db2.prepare(`UPDATE players SET custom_goals = 0, custom_fouls = 0 WHERE team_id IN (${teamIds})`).run();
    });
    try {
      transaction();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  electron.ipcMain.handle("swap-matches", (_, { matchId1, matchId2 }) => {
    const getMatch = db2.prepare("SELECT date FROM matches WHERE id = ?");
    const updateMatch = db2.prepare("UPDATE matches SET date = ? WHERE id = ?");
    const m1 = getMatch.get(matchId1);
    const m2 = getMatch.get(matchId2);
    if (!m1 || !m2) return false;
    const transaction = db2.transaction(() => {
      updateMatch.run(m2.date, matchId1);
      updateMatch.run(m1.date, matchId2);
    });
    try {
      transaction();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  electron.ipcMain.handle("seed-players", (_, tournamentId) => {
    if (!tournamentId) return false;
    const getTeams = db2.prepare("SELECT id, name FROM teams WHERE tournament_id = ?");
    const getPlayerCount = db2.prepare("SELECT COUNT(*) as count FROM players WHERE team_id = ?");
    const insertPlayer = db2.prepare("INSERT INTO players (name, number, team_id) VALUES (?, ?, ?)");
    const teams = getTeams.all(tournamentId);
    if (teams.length === 0) {
      console.warn(`Attempted to seed players for tournament ${tournamentId} but no teams found.`);
      return false;
    }
    const transaction = db2.transaction(() => {
      for (const team of teams) {
        const countResult = getPlayerCount.get(team.id);
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
    try {
      transaction();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  });
  electron.ipcMain.handle("backup-database", async () => {
    const dbPath = path.join(electron.app.getPath("userData"), "torneo.sqlite");
    const { canceled, filePath } = await electron.dialog.showSaveDialog({
      title: "Guardar Copia de Seguridad",
      defaultPath: `respaldo-torneo-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sqlite`,
      filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }]
    });
    if (canceled || !filePath) return false;
    try {
      await promises.copyFile(dbPath, filePath);
      return true;
    } catch (e) {
      console.error("Backup failed:", e);
      return false;
    }
  });
  electron.ipcMain.handle("restore-database", async () => {
    const dbPath = path.join(electron.app.getPath("userData"), "torneo.sqlite");
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      title: "Seleccionar Archivo de Respaldo",
      properties: ["openFile"],
      filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }]
    });
    if (canceled || filePaths.length === 0) return false;
    const backupPath = filePaths[0];
    try {
      closeDB();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await promises.copyFile(backupPath, dbPath);
      console.log(`Database restored from ${backupPath}`);
      getDB();
      return true;
    } catch (e) {
      console.error("Restore failed:", e);
      try {
        getDB();
      } catch (err) {
        console.error("Critical: Could not re-open DB after failed restore", err);
      }
      return false;
    }
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: "Liga Futbol 7",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    },
    icon: path.join(__dirname, "../../resources/icon.png")
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  setupIPC();
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
