-- Supabase RLS Policies for Social Graph Flow
-- Run this in Supabase SQL Editor after running supabase_setup.sql
-- This enables public read access for the demo (no auth required)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hobbies ENABLE ROW LEVEL SECURITY;

-- Public read policies for all tables
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Public delete users" ON users FOR DELETE USING (true);

CREATE POLICY "Public read friendships" ON friendships FOR SELECT USING (true);
CREATE POLICY "Public insert friendships" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update friendships" ON friendships FOR UPDATE USING (true);
CREATE POLICY "Public delete friendships" ON friendships FOR DELETE USING (true);

CREATE POLICY "Public read hobbies" ON hobbies FOR SELECT USING (true);
CREATE POLICY "Public insert hobbies" ON hobbies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update hobbies" ON hobbies FOR UPDATE USING (true);
CREATE POLICY "Public delete hobbies" ON hobbies FOR DELETE USING (true);

CREATE POLICY "Public read user_hobbies" ON user_hobbies FOR SELECT USING (true);
CREATE POLICY "Public insert user_hobbies" ON user_hobbies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_hobbies" ON user_hobbies FOR UPDATE USING (true);
CREATE POLICY "Public delete user_hobbies" ON user_hobbies FOR DELETE USING (true);

-- For RPC function, public access is allowed by default
