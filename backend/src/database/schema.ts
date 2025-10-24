import sqlite3 from 'sqlite3';

export interface Database {
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}

export class DatabaseConnection {
  private db: sqlite3.Database;

  constructor(dbPath: string = './database/cybernauts.db') {
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');

        // Create users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create hobbies table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS hobbies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
          )
        `);

        // Create user_hobbies junction table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS user_hobbies (
            user_id TEXT NOT NULL,
            hobby_id TEXT NOT NULL,
            PRIMARY KEY (user_id, hobby_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
          )
        `);

        // Create friendships table (ordered to prevent duplicates)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS friendships (
            id TEXT PRIMARY KEY,
            user_id_1 TEXT NOT NULL,
            user_id_2 TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE,
            CHECK (user_id_1 != user_id_2),
            CHECK (user_id_1 < user_id_2),
            UNIQUE (user_id_1, user_id_2)
          )
        `);

        // Create indexes for performance
        this.db.run('CREATE INDEX IF NOT EXISTS idx_user_hobbies_user_id ON user_hobbies(user_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_user_hobbies_hobby_id ON user_hobbies(hobby_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON friendships(user_id_1)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON friendships(user_id_2)');

        resolve();
      });
    });
  }

  getDatabase(): Database {
    return {
      run: async (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          this.db.run(sql, params, function(err: Error | null) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      get: async (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          this.db.get(sql, params, (err: Error | null, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: async (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          this.db.all(sql, params, (err: Error | null, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      },
      close: async () => {
        return new Promise((resolve, reject) => {
          this.db.close((err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };
  }
}

// Popularity score calculation function
export async function calculatePopularityScore(db: Database, userId: string): Promise<number> {
  // Count unique friends
  const friendsResult = await db.get(`
    SELECT COUNT(DISTINCT CASE
      WHEN user_id_1 = ? THEN user_id_2
      WHEN user_id_2 = ? THEN user_id_1
    END) as friend_count
    FROM friendships
    WHERE user_id_1 = ? OR user_id_2 = ?
  `, [userId, userId, userId, userId]);

  const friendCount = friendsResult?.friend_count || 0;

  // Count shared hobbies with friends
  const sharedHobbiesResult = await db.get(`
    SELECT COUNT(DISTINCT uh2.hobby_id) as shared_hobby_count
    FROM user_hobbies uh1
    JOIN user_hobbies uh2 ON uh1.hobby_id = uh2.hobby_id
    JOIN friendships f ON (
      (f.user_id_1 = ? AND f.user_id_2 = uh2.user_id) OR
      (f.user_id_2 = ? AND f.user_id_1 = uh2.user_id)
    )
    WHERE uh1.user_id = ? AND uh2.user_id != ?
  `, [userId, userId, userId, userId]);

  const sharedHobbyCount = sharedHobbiesResult?.shared_hobby_count || 0;

  // Calculate total score
  return friendCount + (sharedHobbyCount * 0.5);
}
