import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.admin.signOut(token);
    }

    return res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
