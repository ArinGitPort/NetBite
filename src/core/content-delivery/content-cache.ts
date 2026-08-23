import * as SQLite from 'expo-sqlite';

import type { RemoteCurriculumPackage } from '@/core/content-delivery/types';

type MetaRow = { value: string };
type ReleaseRow = { package_json: string };

export class ContentCache {
  private database?: Promise<SQLite.SQLiteDatabase>;

  private async db() {
    if (!this.database) this.database = SQLite.openDatabaseAsync('netbite-content.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS curriculum_releases (
          release_id TEXT PRIMARY KEY NOT NULL,
          release_version INTEGER NOT NULL,
          package_json TEXT NOT NULL,
          activated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS curriculum_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    });
    return this.database;
  }

  private async meta(key: string) {
    const row = await (await this.db()).getFirstAsync<MetaRow>('SELECT value FROM curriculum_meta WHERE key = ?', key);
    return row?.value;
  }

  async getActive() {
    const releaseId = await this.meta('active_release');
    if (!releaseId) return undefined;
    const row = await (await this.db()).getFirstAsync<ReleaseRow>('SELECT package_json FROM curriculum_releases WHERE release_id = ?', releaseId);
    if (!row) return undefined;
    try { return JSON.parse(row.package_json) as RemoteCurriculumPackage; } catch { return undefined; }
  }

  async activate(content: RemoteCurriculumPackage) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const active = await transaction.getFirstAsync<MetaRow>("SELECT value FROM curriculum_meta WHERE key = 'active_release'");
      await transaction.runAsync('INSERT OR REPLACE INTO curriculum_releases (release_id, release_version, package_json, activated_at) VALUES (?, ?, ?, ?)', content.manifest.releaseId, content.manifest.releaseVersion, JSON.stringify(content), new Date().toISOString());
      if (active?.value && active.value !== content.manifest.releaseId) await transaction.runAsync("INSERT OR REPLACE INTO curriculum_meta (key, value) VALUES ('previous_release', ?)", active.value);
      await transaction.runAsync("INSERT OR REPLACE INTO curriculum_meta (key, value) VALUES ('active_release', ?)", content.manifest.releaseId);
      await transaction.runAsync("DELETE FROM curriculum_releases WHERE release_id NOT IN (SELECT value FROM curriculum_meta WHERE key IN ('active_release','previous_release'))");
    });
  }

  async restorePrevious() {
    const db = await this.db();
    let restored: RemoteCurriculumPackage | undefined;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const active = await transaction.getFirstAsync<MetaRow>("SELECT value FROM curriculum_meta WHERE key = 'active_release'");
      const previous = await transaction.getFirstAsync<MetaRow>("SELECT value FROM curriculum_meta WHERE key = 'previous_release'");
      if (!previous?.value) return;
      const row = await transaction.getFirstAsync<ReleaseRow>('SELECT package_json FROM curriculum_releases WHERE release_id = ?', previous.value);
      if (!row) return;
      try { restored = JSON.parse(row.package_json) as RemoteCurriculumPackage; } catch { return; }
      await transaction.runAsync("INSERT OR REPLACE INTO curriculum_meta (key, value) VALUES ('active_release', ?)", previous.value);
      if (active?.value) await transaction.runAsync("INSERT OR REPLACE INTO curriculum_meta (key, value) VALUES ('previous_release', ?)", active.value);
    });
    return restored;
  }
}
