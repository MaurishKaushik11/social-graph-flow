-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 2 AND char_length(username) <= 50)
);

-- Create hobbies table
CREATE TABLE public.hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  CONSTRAINT hobby_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Create user_hobbies junction table
CREATE TABLE public.user_hobbies (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hobby_id UUID NOT NULL REFERENCES public.hobbies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hobby_id)
);

-- Create friendships table (mutual relationships)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friendship CHECK (user_id_1 != user_id_2),
  CONSTRAINT ordered_friendship CHECK (user_id_1 < user_id_2),
  UNIQUE (user_id_1, user_id_2)
);

-- Function to calculate popularity score
CREATE OR REPLACE FUNCTION public.calculate_popularity_score(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  friend_count INTEGER;
  shared_hobby_count NUMERIC;
  total_score NUMERIC;
BEGIN
  -- Count unique friends
  SELECT COUNT(DISTINCT CASE 
    WHEN user_id_1 = user_uuid THEN user_id_2 
    WHEN user_id_2 = user_uuid THEN user_id_1 
  END) INTO friend_count
  FROM public.friendships
  WHERE user_id_1 = user_uuid OR user_id_2 = user_uuid;
  
  -- Count shared hobbies with friends
  SELECT COUNT(DISTINCT uh2.hobby_id) INTO shared_hobby_count
  FROM public.user_hobbies uh1
  JOIN public.user_hobbies uh2 ON uh1.hobby_id = uh2.hobby_id
  JOIN public.friendships f ON (
    (f.user_id_1 = user_uuid AND f.user_id_2 = uh2.user_id) OR
    (f.user_id_2 = user_uuid AND f.user_id_1 = uh2.user_id)
  )
  WHERE uh1.user_id = user_uuid AND uh2.user_id != user_uuid;
  
  -- Calculate total score
  total_score := friend_count + (COALESCE(shared_hobby_count, 0) * 0.5);
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Public read access policies (this is a demo app, all data is public)
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Anyone can view hobbies" ON public.hobbies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hobbies" ON public.hobbies FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view user_hobbies" ON public.user_hobbies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_hobbies" ON public.user_hobbies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_hobbies" ON public.user_hobbies FOR DELETE USING (true);

CREATE POLICY "Anyone can view friendships" ON public.friendships FOR SELECT USING (true);
CREATE POLICY "Anyone can insert friendships" ON public.friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete friendships" ON public.friendships FOR DELETE USING (true);

-- Insert some default hobbies
INSERT INTO public.hobbies (name) VALUES
  ('Reading'),
  ('Gaming'),
  ('Cooking'),
  ('Hiking'),
  ('Photography'),
  ('Music'),
  ('Painting'),
  ('Dancing'),
  ('Sports'),
  ('Traveling'),
  ('Coding'),
  ('Gardening'),
  ('Yoga'),
  ('Swimming'),
  ('Writing');

-- Insert sample users
INSERT INTO public.users (username, age) VALUES
  ('Alice', 28),
  ('Bob', 32),
  ('Charlie', 25),
  ('Diana', 30),
  ('Eve', 27);