import { supabase } from './connection.js';

// Popularity score calculation function
export async function calculatePopularityScore(userId: string): Promise<number> {
  // Get unique friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id_1, user_id_2')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  const friendIds = friendships?.map(f => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1).filter(id => id !== userId) || [];
  const friendCount = friendIds.length;

  // Get user's hobbies
  const { data: userHobbies } = await supabase
    .from('user_hobbies')
    .select('hobby_id')
    .eq('user_id', userId);

  const userHobbyIds = userHobbies?.map(h => h.hobby_id) || [];

  // Get hobbies of friends
  let sharedHobbyCount = 0;
  if (friendIds.length > 0 && userHobbyIds.length > 0) {
    const { data: friendsHobbies } = await supabase
      .from('user_hobbies')
      .select('hobby_id')
      .in('user_id', friendIds);

    const friendsHobbyIds = friendsHobbies?.map(h => h.hobby_id) || [];
    sharedHobbyCount = userHobbyIds.filter(id => friendsHobbyIds.includes(id)).length;
  }

  // Calculate total score
  return friendCount + (sharedHobbyCount * 0.5);
}
