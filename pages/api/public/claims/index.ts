import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClaimSchema, validateBody } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // GET - Get user's claims
    if (req.method === 'GET') {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = (page - 1) * limit;

      const { data: claims, error, count } = await supabaseAdmin
        .from('claims')
        .select(`
          *,
          order:orders!claims_order_id_fkey(
            id,
            order_number,
            ad:ads!orders_ad_id_fkey(id, title)
          ),
          claimant:users!claims_claimant_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `, { count: 'exact' })
        .or(`claimant_id.eq.${req.user.id},order.buyer_id.eq.${req.user.id},order.seller_id.eq.${req.user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching claims:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des réclamations' });
      }

      return res.status(200).json({
        claims,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // POST - Create new claim
    if (req.method === 'POST') {
      const validation = validateBody(createClaimSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { order_id, type, subject, description, photos } = validation.data;

      // Check if order exists and user is buyer or seller
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('buyer_id, seller_id')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé à créer une réclamation pour cette commande' });
      }

      const { data: newClaim, error } = await supabaseAdmin
        .from('claims')
        .insert({
          order_id,
          claimant_id: req.user.id,
          type,
          subject,
          description,
          photos: photos || [],
        })
        .select(`
          *,
          order:orders!claims_order_id_fkey(
            id,
            order_number,
            ad:ads!orders_ad_id_fkey(id, title)
          ),
          claimant:users!claims_claimant_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `)
        .single();

      if (error) {
        console.error('Error creating claim:', error);
        return res.status(400).json({ error: 'Erreur lors de la création de la réclamation' });
      }

      // Notify the other party
      const otherPartyId = order.buyer_id === req.user.id ? order.seller_id : order.buyer_id;
      await supabaseAdmin.from('notifications').insert({
        user_id: otherPartyId,
        type: 'new_claim',
        title: 'Nouvelle réclamation',
        message: `Une réclamation a été ouverte pour une commande: ${subject}`,
        data: { claim_id: newClaim.id, order_id },
      });

      return res.status(201).json({
        message: 'Réclamation créée avec succès',
        claim: newClaim,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Claims endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
