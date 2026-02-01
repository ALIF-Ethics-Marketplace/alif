import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, withAdminRole, combineAdminMiddleware, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const customCommissionSchema = z.object({
  user_id: z.string().uuid(),
  is_for_unsold: z.boolean(),
  commission_rate: z.number().min(0).max(100),
  number_of_publications: z.number().int().positive().optional(),
  valid_until: z.string().optional(),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    // GET - Get all custom commissions
    if (req.method === 'GET') {
      const user_id = req.query.user_id as string;

      let query = supabaseAdmin
        .from('custom_commissions')
        .select(`
          *,
          user:users!custom_commissions_user_id_fkey(id, firstname, lastname, email, company_name)
        `)
        .order('created_at', { ascending: false });

      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      const { data: commissions, error } = await query;

      if (error) {
        console.error('Error fetching commissions:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération' });
      }

      return res.status(200).json({ commissions });
    }

    // POST - Create custom commission
    if (req.method === 'POST') {
      const validation = validateBody(customCommissionSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const data = validation.data;

      const { data: commission, error } = await supabaseAdmin
        .from('custom_commissions')
        .insert({
          ...data,
          created_by: req.admin.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating commission:', error);
        return res.status(400).json({ error: 'Erreur lors de la création' });
      }

      await logAdminActivity(
        req.admin.id,
        'create_custom_commission',
        `Création d'une commission personnalisée: ${data.commission_rate}%`,
        'custom_commissions',
        commission.id,
        data
      );

      return res.status(201).json({ message: 'Commission créée', commission });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Custom commissions error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default combineAdminMiddleware(withAdminAuth, withAdminRole(['Executif', 'Admin']))(handler);
