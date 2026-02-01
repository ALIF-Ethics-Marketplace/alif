import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, withAdminRole, combineAdminMiddleware, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const suspendSchema = z.object({
  is_suspended: z.boolean(),
  reason: z.string().min(10, 'Raison requise (min 10 caractères)'),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const validation = validateBody(suspendSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { is_suspended, reason } = validation.data;

    const updateData: any = {
      is_suspended,
      suspension_reason: reason,
    };

    if (is_suspended) {
      updateData.suspended_at = new Date().toISOString();
      updateData.suspended_by = req.admin.id;
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error suspending user:', error);
      return res.status(400).json({ error: 'Erreur lors de la suspension' });
    }

    await logAdminActivity(
      req.admin.id,
      is_suspended ? 'suspend_user' : 'unsuspend_user',
      `${is_suspended ? 'Suspension' : 'Levée de suspension'} de l'utilisateur - ${reason}`,
      'users',
      id,
      { is_suspended, reason }
    );

    return res.status(200).json({
      message: is_suspended ? 'Utilisateur suspendu' : 'Suspension levée',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default combineAdminMiddleware(withAdminAuth, withAdminRole(['Executif', 'Admin']))(handler);
