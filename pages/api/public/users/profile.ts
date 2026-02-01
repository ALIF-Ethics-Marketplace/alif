import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { updateUserSchema, validateBody } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { data: userProfile, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return res.status(404).json({ error: 'Profil utilisateur non trouvé' });
      }

      return res.status(200).json({ user: userProfile });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const validation = validateBody(updateUserSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(validation.data)
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour du profil' });
      }

      return res.status(200).json({
        message: 'Profil mis à jour avec succès',
        user: updatedUser,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Profile endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
