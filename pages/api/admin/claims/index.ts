import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const createClaimSchema = z.object({
  user_id: z.string().uuid(),
  ad_id: z.string().uuid(),
  type: z.enum(['product_damaged', 'product_missing', 'wrong_product', 'quality_issue', 'other']),
  subject: z.string().min(3),
  description: z.string().min(10),
  is_urgent: z.boolean().default(false),
  has_processing_fees: z.boolean().default(false),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    // GET - List all claims
    if (req.method === 'GET') {
      const claim_state = req.query.claim_state as string;
      const is_urgent = req.query.is_urgent as string;

      let query = supabaseAdmin
        .from('claims')
        .select(`
          *,
          order:orders!claims_order_id_fkey(
            id,
            order_number,
            ad:ads!orders_ad_id_fkey(id, title)
          ),
          claimant:users!claims_claimant_id_fkey(id, firstname, lastname, email),
          assigned_to_admin:admin_users!claims_assigned_to_fkey(id, email, role)
        `)
        .order('created_at', { ascending: false });

      if (claim_state) {
        query = query.eq('claim_state', claim_state);
      }

      if (is_urgent === 'true') {
        query = query.eq('is_urgent', true);
      }

      const { data: claims, error } = await query;

      if (error) {
        console.error('Error fetching claims:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des litiges' });
      }

      return res.status(200).json({ claims });
    }

    // POST - Create claim by admin
    if (req.method === 'POST') {
      const validation = validateBody(createClaimSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const data = validation.data;

      // Get order for the ad
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('ad_id', data.ad_id)
        .single();

      if (!order) {
        return res.status(404).json({ error: 'Aucune commande trouvée pour cette annonce' });
      }

      const { data: newClaim, error } = await supabaseAdmin
        .from('claims')
        .insert({
          order_id: order.id,
          claimant_id: data.user_id,
          type: data.type,
          subject: data.subject,
          description: data.description,
          is_urgent: data.is_urgent,
          has_processing_fees: data.has_processing_fees,
          created_by_admin: true,
          assigned_to: req.admin.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating claim:', error);
        return res.status(400).json({ error: 'Erreur lors de la création du litige' });
      }

      await logAdminActivity(
        req.admin.id,
        'create_claim',
        `Création d'un litige pour l'utilisateur`,
        'claims',
        newClaim.id
      );

      return res.status(201).json({ message: 'Litige créé', claim: newClaim });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Admin claims error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
