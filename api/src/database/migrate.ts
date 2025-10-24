import { getDatabase } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

export async function runMigrations(): Promise<void> {
  const db = await getDatabase();

  try {
    // Insert default hobbies
    const defaultHobbies = [
      'Reading', 'Gaming', 'Cooking', 'Hiking', 'Photography',
      'Music', 'Painting', 'Dancing', 'Sports', 'Traveling',
      'Coding', 'Gardening', 'Yoga', 'Swimming', 'Writing'
    ];

    for (const hobbyName of defaultHobbies) {
      await db.getDatabase().run(
        'INSERT OR IGNORE INTO hobbies (id, name) VALUES (?, ?)',
        [uuidv4(), hobbyName]
      );
    }

    // Insert sample users
    const sampleUsers = [
      { username: 'Alice', age: 28 },
      { username: 'Bob', age: 32 },
      { username: 'Charlie', age: 25 },
      { username: 'Diana', age: 30 },
      { username: 'Eve', age: 27 }
    ];

    for (const user of sampleUsers) {
      await db.getDatabase().run(
        'INSERT OR IGNORE INTO users (id, username, age) VALUES (?, ?, ?)',
        [uuidv4(), user.username, user.age]
      );
    }

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
