import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDB() {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'torneo.sqlite');
    console.log('Database path:', dbPath);
    db = new Database(dbPath);
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
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

  // Migration: Add tournament_id to teams if not exists
  try {
    const columns = database.prepare("PRAGMA table_info(teams)").all() as any[];
    const hasTournamentId = columns.some(c => c.name === 'tournament_id');
    if (!hasTournamentId) {
      database.prepare("ALTER TABLE teams ADD COLUMN tournament_id INTEGER").run();
      console.log("Migrated: Added 'tournament_id' column to teams");

      // Seed default tournament if needed and assign existing teams
      const defaultTournament = database.prepare("SELECT id FROM tournaments WHERE name = 'Torneo Default'").get() as { id: number };
      let tournamentId = defaultTournament?.id;

      if (!tournamentId) {
        // Default changed to Dominical Matutino as requested
        const info = database.prepare("INSERT INTO tournaments (name, type, category) VALUES (?, ?, ?)").run('Torneo Default', 'Dominical Matutino', 'Libre');
        tournamentId = info.lastInsertRowid as number;
      }

      database.prepare("UPDATE teams SET tournament_id = ? WHERE tournament_id IS NULL").run(tournamentId);
    } else {
      // Fix for existing migration if it ran with "General"
      database.prepare("UPDATE tournaments SET type = 'Dominical Matutino' WHERE name = 'Torneo Default' AND type = 'General'").run();
    }
  } catch (e) {
    console.error("Migration check failed (teams):", e);
  }

  // Migration for existing databases to add 'stage' column if it doesn't exist
  try {
    const columns = database.prepare("PRAGMA table_info(matches)").all() as any[];
    const hasStage = columns.some(c => c.name === 'stage');
    if (!hasStage) {
      database.prepare("ALTER TABLE matches ADD COLUMN stage TEXT DEFAULT 'regular'").run();
      console.log("Migrated: Added 'stage' column to matches");
    }
  } catch (e) {
    console.error("Migration check failed (matches):", e);
  }

  // Migration for players table (custom_goals, custom_fouls)
  try {
    const columns = database.prepare("PRAGMA table_info(players)").all() as any[];
    const hasCustomGoals = columns.some(c => c.name === 'custom_goals');
    const hasCustomFouls = columns.some(c => c.name === 'custom_fouls');

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
