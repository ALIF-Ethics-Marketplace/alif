import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // Get public user information only (no sensitive data)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, firstname, lastname, company_name, alif_status, profile_picture, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
