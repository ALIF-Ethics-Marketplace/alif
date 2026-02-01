import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, withAdminRole, combineAdminMiddleware, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const categoryCommissionSchema = z.object({
  category: z.enum(['Alimentaire', 'Mobilier-Electroménager', 'Multimédia-Technologies', 'Décor-Bazar', 'Mode-Textile', 'Beauté-Santé', 'Sport-Loisirs', 'Autre']),
  zone: z.enum(['UE', 'Hors-UE']),
  is_for_unsold: z.boolean(),
  commission_rate: z.number().min(0).max(100),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    // GET - Get all category commissions
    if (req.method === 'GET') {
      const { data: commissions, error } = await supabaseAdmin
        .from('category_commissions')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching category commissions:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération' });
      }

      return res.status(200).json({ commissions });
    }

    // PUT - Update category commission
    if (req.method === 'PUT') {
      const validation = validateBody(categoryCommissionSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const data = validation.data;

      const { data: commission, error } = await supabaseAdmin
        .from('category_commissions')
        .upsert({
          ...data,
          created_by: req.admin.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating category commission:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour' });
      }

      await logAdminActivity(
        req.admin.id,
        'update_category_commission',
        `Mise à jour commission ${data.category} (${data.zone}): ${data.commission_rate}%`,
        'category_commissions',
        commission.id,
        data
      );

      return res.status(200).json({ message: 'Commission mise à jour', commission });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Category commissions error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default combineAdminMiddleware(withAdminAuth, withAdminRole(['Executif', 'Admin']))(handler);
