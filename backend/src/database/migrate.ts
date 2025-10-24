import { supabase } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

export async function runMigrations(): Promise<void> {
  try {
    // Insert default hobbies - only insert if they don't exist
    const defaultHobbies = [
      'Reading', 'Gaming', 'Cooking', 'Hiking', 'Photography',
      'Music', 'Painting', 'Dancing', 'Sports', 'Traveling',
      'Coding', 'Gardening', 'Yoga', 'Swimming', 'Writing'
    ];

    for (const hobbyName of defaultHobbies) {
      // Check if hobby already exists
      const { data: existing } = await supabase
        .from('hobbies')
        .select('id')
        .eq('name', hobbyName)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('hobbies')
          .insert({ id: uuidv4(), name: hobbyName });

        if (error) throw error;
      }
    }

    // Insert sample users - only insert if they don't exist
    const sampleUsers = [
      { username: 'Alice', age: 28 },
      { username: 'Bob', age: 32 },
      { username: 'Charlie', age: 25 },
      { username: 'Diana', age: 30 },
      { username: 'Eve', age: 27 }
    ];

    for (const user of sampleUsers) {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('users')
          .insert({ id: uuidv4(), username: user.username, age: user.age });

        if (error) throw error;
      }
    }

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
