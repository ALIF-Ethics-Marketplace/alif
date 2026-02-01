import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createOfferSchema, validateBody } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // GET - Get user's offers (as buyer or seller)
    if (req.method === 'GET') {
      const type = req.query.type as string; // 'sent' or 'received'
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('offers')
        .select(`
          *,
          ad:ads!offers_ad_id_fkey(*),
          buyer:users!offers_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture),
          seller:users!offers_seller_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type === 'sent') {
        query = query.eq('buyer_id', req.user.id);
      } else if (type === 'received') {
        query = query.eq('seller_id', req.user.id);
      } else {
        // Get both sent and received
        query = query.or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`);
      }

      const { data: offers, error, count } = await query;

      if (error) {
        console.error('Error fetching offers:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des offres' });
      }

      return res.status(200).json({
        offers,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // POST - Create new offer
    if (req.method === 'POST') {
      const validation = validateBody(createOfferSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { ad_id, price_offered, quantity, message } = validation.data;

      // Get ad details
      const { data: ad, error: adError } = await supabaseAdmin
        .from('ads')
        .select('author_id, is_active, total_quantity, unit_price')
        .eq('id', ad_id)
        .single();

      if (adError || !ad) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }

      if (!ad.is_active) {
        return res.status(400).json({ error: 'Cette annonce n\'est plus active' });
      }

      if (ad.author_id === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas faire une offre sur votre propre annonce' });
      }

      if (quantity > ad.total_quantity) {
        return res.status(400).json({ error: 'Quantité demandée supérieure à la quantité disponible' });
      }

      // Check if user already has a pending offer for this ad
      const { data: existingOffer } = await supabaseAdmin
        .from('offers')
        .select('id')
        .eq('ad_id', ad_id)
        .eq('buyer_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (existingOffer) {
        return res.status(400).json({ error: 'Vous avez déjà une offre en attente pour cette annonce' });
      }

      const { data: newOffer, error } = await supabaseAdmin
        .from('offers')
        .insert({
          ad_id,
          seller_id: ad.author_id,
          buyer_id: req.user.id,
          price_offered,
          quantity,
          message: message || null,
        })
        .select(`
          *,
          ad:ads!offers_ad_id_fkey(*),
          buyer:users!offers_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture),
          seller:users!offers_seller_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `)
        .single();

      if (error) {
        console.error('Error creating offer:', error);
        return res.status(400).json({ error: 'Erreur lors de la création de l\'offre' });
      }

      // Create notification for seller
      await supabaseAdmin.from('notifications').insert({
        user_id: ad.author_id,
        type: 'new_offer',
        title: 'Nouvelle offre reçue',
        message: `Vous avez reçu une offre de ${price_offered}€ pour ${quantity} unité(s)`,
        data: { offer_id: newOffer.id, ad_id },
      });

      return res.status(201).json({
        message: 'Offre envoyée avec succès',
        offer: newOffer,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Offers endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
