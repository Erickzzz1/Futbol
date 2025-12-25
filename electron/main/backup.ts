import { app } from 'electron';
import { join } from 'path';
import { copyFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';

export async function performAutoBackup() {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = join(userDataPath, 'torneo.sqlite');
        const backupsDir = join(userDataPath, 'backups');

        if (!existsSync(dbPath)) {
            console.warn("No database found to backup.");
            return;
        }

        if (!existsSync(backupsDir)) {
            await mkdir(backupsDir, { recursive: true });
        }

        // Create Backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = join(backupsDir, `backup-${timestamp}.sqlite`);

        await copyFile(dbPath, backupPath);
        console.log(`Auto-Backup created: ${backupPath}`);

        // Rotate Backups (Keep last 10)
        const files = await readdir(backupsDir);
        const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'));

        if (backupFiles.length > 10) {
            // Sort by creation time (using stats or filename if reliable, filename is ISO so lexical sort works)
            backupFiles.sort(); // Oldest first due to ISO timestamp naming

            const toDelete = backupFiles.slice(0, backupFiles.length - 10);
            for (const file of toDelete) {
                await unlink(join(backupsDir, file));
                console.log(`Rotated old backup: ${file}`);
            }
        }

    } catch (e) {
        console.error("Auto-Backup failed:", e);
    }
}
