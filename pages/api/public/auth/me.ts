import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabase } from '@/lib/supabase/client';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(404).json({ error: 'Profil utilisateur non trouvé' });
    }

    return res.status(200).json({ user: userProfile });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
