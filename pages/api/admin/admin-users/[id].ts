import { NextApiResponse } from 'next';
import {
  withAdminAuth,
  withAdminRole,
  AuthenticatedAdminRequest,
  combineAdminMiddleware,
  logAdminActivity,
} from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const updateAdminSchema = z.object({
  is_active: z.boolean(),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // PATCH - Activate/Deactivate admin (Executif only)
    if (req.method === 'PATCH') {
      // Cannot deactivate yourself
      if (id === req.admin.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
      }

      const validation = validateBody(updateAdminSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { is_active } = validation.data;

      const { data: updatedAdmin, error } = await supabaseAdmin
        .from('admin_users')
        .update({ is_active })
        .eq('id', id)
        .select('id, email, role, is_active')
        .single();

      if (error) {
        console.error('Error updating admin:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour' });
      }

      await logAdminActivity(
        req.admin.id,
        is_active ? 'activate_admin' : 'deactivate_admin',
        `${is_active ? 'Activation' : 'Désactivation'} de l'administrateur ${updatedAdmin.email}`,
        'admin_users',
        id
      );

      return res.status(200).json({
        message: `Administrateur ${is_active ? 'activé' : 'désactivé'} avec succès`,
        admin: updatedAdmin,
      });
    }

    // GET - Get admin activity history
    if (req.method === 'GET') {
      const { data: activities, error } = await supabaseAdmin
        .from('admin_activity_logs')
        .select('*')
        .eq('admin_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching admin activities:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération de l\'historique' });
      }

      return res.status(200).json({ activities });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Admin user endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Only Executif can modify admins
export default function (req: any, res: NextApiResponse) {
  if (req.method === 'PATCH') {
    return combineAdminMiddleware(
      withAdminAuth,
      withAdminRole(['Executif'])
    )(handler)(req, res);
  }
  return withAdminAuth(handler)(req, res);
}
