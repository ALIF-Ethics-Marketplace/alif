import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const validateUserSchema = z.object({
  validation_status: z.enum(['Validé', 'Refusé', 'En Attente']),
  reason: z.string().optional(),
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

    const validation = validateBody(validateUserSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { validation_status, reason } = validation.data;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        validation_status,
        user_validated_by: req.admin.id,
        validation_date: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error validating user:', error);
      return res.status(400).json({ error: 'Erreur lors de la validation' });
    }

    await logAdminActivity(
      req.admin.id,
      'validate_user',
      `Validation utilisateur: ${validation_status}${reason ? ` - ${reason}` : ''}`,
      'users',
      id,
      { validation_status, reason }
    );

    // Send notification to user
    await supabaseAdmin.from('notifications').insert({
      user_id: id,
      type: 'account_validation',
      title: `Compte ${validation_status}`,
      message: validation_status === 'Validé'
        ? 'Votre compte a été validé par l\'équipe Alif'
        : validation_status === 'Refusé'
        ? `Votre compte a été refusé${reason ? ': ' + reason : ''}`
        : 'Votre compte est en attente de validation',
    });

    return res.status(200).json({
      message: 'Utilisateur validé avec succès',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Validate user error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
