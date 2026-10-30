import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

function migratedDatabase(beforeRepair?: (db: DatabaseSync) => void) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  const files = readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    if (file === "0032_fix_remaining_legacy_user_fks.sql") {
      beforeRepair?.(db);
      db.exec("PRAGMA foreign_keys = ON");
    }
    db.exec(readFileSync(`migrations/${file}`, "utf8"));
  }
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

describe("migrated database", () => {
  it("preserves existing reviews and email logs when repairing legacy foreign keys", () => {
    const db = migratedDatabase((db) => {
      db.exec(`
        INSERT INTO "user" (id, name, email) VALUES ('migration_user', 'Reader', 'reader@example.test');
        INSERT INTO apps (id, name, slug) VALUES ('migration_app', 'App', 'migration-app');
        INSERT INTO purchases (id, user_id, app_id, amount_cents) VALUES ('migration_purchase', 'migration_user', 'migration_app', 999);
        INSERT INTO reviews (id, user_id, app_id, purchase_id, rating, title) VALUES ('migration_review', 'migration_user', 'migration_app', 'migration_purchase', 5, 'Kept review');
        INSERT INTO email_log (id, user_id, email, event_type, subject) VALUES ('migration_email', 'migration_user', 'reader@example.test', 'receipt', 'Kept email');
      `);
    });
    try {
      expect(db.prepare("SELECT title FROM reviews WHERE id = 'migration_review'").get()?.title).toBe("Kept review");
      expect(db.prepare("SELECT subject FROM email_log WHERE id = 'migration_email'").get()?.subject).toBe("Kept email");
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      db.exec("DELETE FROM apps WHERE id = 'migration_app'");
      expect(db.prepare("SELECT * FROM reviews WHERE id = 'migration_review'").get()).toBeUndefined();
    } finally {
      db.close();
    }
  });
  it("uses existing tables for every foreign key", () => {
    const db = migratedDatabase();
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
      const names = new Set(tables.map(({ name }) => name));
      for (const { name } of tables) {
        const keys = db.prepare(`PRAGMA foreign_key_list("${name}")`).all() as { table: string }[];
        for (const key of keys) expect(names.has(key.table), `${name} references missing ${key.table}`).toBe(true);
      }
      db.exec("DELETE FROM apps WHERE id = 'e2e_nonexistent'");
    } finally {
      db.close();
    }
  });
});
