import { DatabaseConnection } from './schema.js';

let dbInstance: DatabaseConnection | null = null;

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
    await dbInstance.initialize();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.getDatabase().close();
    dbInstance = null;
  }
}
