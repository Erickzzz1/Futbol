const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron'); // Cannot use electron app here if running cleanly with node

// Manually define path since we aren't in electron runtime
// Assuming Windows standard path if running via node for testing
// But better to use the runtime database path logic if possible.
// Or just hardcode to where we expect it: %APPDATA%/...
// Actually, for development, I'll put db in project root or just use the same logic as prod if I can.
// Let's use './database.db' in the project root for local dev convenience if we change the create logic,
// BUT `database.ts` uses `app.getPath('userData')`.
// I will create a temporary db in userData by guessing the path or asking the user to run it via electron?
// I'll make the Main process run the seed if the DB is empty.

// BETTER APPROACH: Add a `seed` IPC handler or auto-seed on init if empty.
// I'll modify `database.ts` to seed if empty.

/*
  Teams from image:
  VILLAS, RADIO LS, DEP DELGADO, JOGA BONITO, RESTOS DEL BARRIO, EXCELENCIA, 
  DOUGLAS, TAQUERIA 7, EL REGRESO, BLACK SHARKS, LA FAMILIA, INTER, 
  HULL CITY, IMEX, PARIS, BARBERENA
*/

module.exports = {
    teams: [
        'VILLAS', 'RADIO LS', 'DEP DELGADO', 'JOGA BONITO', 'RESTOS DEL BARRIO', 'EXCELENCIA',
        'DOUGLAS', 'TAQUERIA 7', 'EL REGRESO', 'BLACK SHARKS', 'LA FAMILIA', 'INTER',
        'HULL CITY', 'IMEX', 'PARIS', 'BARBERENA'
    ]
};
