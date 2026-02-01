import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { updateOfferSchema, validateBody } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID offre invalide' });
    }

    // GET - Get offer by ID
    if (req.method === 'GET') {
      const { data: offer, error } = await supabaseAdmin
        .from('offers')
        .select(`
          *,
          ad:ads!offers_ad_id_fkey(*),
          buyer:users!offers_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture),
          seller:users!offers_seller_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `)
        .eq('id', id)
        .single();

      if (error || !offer) {
        return res.status(404).json({ error: 'Offre non trouvée' });
      }

      // Check if user is buyer or seller
      if (offer.buyer_id !== req.user.id && offer.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé à voir cette offre' });
      }

      return res.status(200).json({ offer });
    }

    // PATCH - Update offer status (accept/reject)
    if (req.method === 'PATCH') {
      const validation = validateBody(updateOfferSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { status, seller_response } = validation.data;

      // Get offer details
      const { data: offer, error: offerError } = await supabaseAdmin
        .from('offers')
        .select('*, ad:ads!offers_ad_id_fkey(total_quantity)')
        .eq('id', id)
        .single();

      if (offerError || !offer) {
        return res.status(404).json({ error: 'Offre non trouvée' });
      }

      // Only seller can accept/reject offers
      if (status === 'accepted' || status === 'rejected') {
        if (offer.seller_id !== req.user.id) {
          return res.status(403).json({ error: 'Seul le vendeur peut accepter ou refuser une offre' });
        }

        if (offer.status !== 'pending') {
          return res.status(400).json({ error: 'Cette offre a déjà été traitée' });
        }
      }

      // Only buyer can cancel their own offer
      if (status === 'cancelled') {
        if (offer.buyer_id !== req.user.id) {
          return res.status(403).json({ error: 'Seul l\'acheteur peut annuler son offre' });
        }

        if (offer.status !== 'pending') {
          return res.status(400).json({ error: 'Cette offre ne peut plus être annulée' });
        }
      }

      const updateData: any = {
        status,
        seller_response: seller_response || null,
      };

      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { data: updatedOffer, error } = await supabaseAdmin
        .from('offers')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          ad:ads!offers_ad_id_fkey(*),
          buyer:users!offers_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture, billing_address, shipping_address),
          seller:users!offers_seller_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `)
        .single();

      if (error) {
        console.error('Error updating offer:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour de l\'offre' });
      }

      // If offer is accepted, create an order
      if (status === 'accepted') {
        const platformFeePercentage = 0.05; // 5% platform fee
        const subtotal = updatedOffer.price_offered * updatedOffer.quantity;
        const platformFee = subtotal * platformFeePercentage;
        const totalAmount = subtotal + platformFee;

        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            offer_id: updatedOffer.id,
            ad_id: updatedOffer.ad_id,
            buyer_id: updatedOffer.buyer_id,
            seller_id: updatedOffer.seller_id,
            quantity: updatedOffer.quantity,
            unit_price: updatedOffer.price_offered,
            subtotal,
            platform_fee: platformFee,
            total_amount: totalAmount,
            shipping_address: (updatedOffer as any).buyer.shipping_address || (updatedOffer as any).buyer.billing_address,
            billing_address: (updatedOffer as any).buyer.billing_address,
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
        } else {
          // Create notifications
          await supabaseAdmin.from('notifications').insert([
            {
              user_id: updatedOffer.buyer_id,
              type: 'offer_accepted',
              title: 'Offre acceptée',
              message: 'Votre offre a été acceptée. Procédez au paiement.',
              data: { offer_id: updatedOffer.id, order_id: order.id },
            },
            {
              user_id: updatedOffer.seller_id,
              type: 'order_created',
              title: 'Nouvelle commande',
              message: 'Une commande a été créée suite à l\'acceptation de l\'offre.',
              data: { offer_id: updatedOffer.id, order_id: order.id },
            },
          ]);

          return res.status(200).json({
            message: 'Offre acceptée et commande créée avec succès',
            offer: updatedOffer,
            order,
          });
        }
      }

      // Send notification to buyer
      if (status === 'rejected') {
        await supabaseAdmin.from('notifications').insert({
          user_id: updatedOffer.buyer_id,
          type: 'offer_rejected',
          title: 'Offre refusée',
          message: seller_response || 'Votre offre a été refusée par le vendeur.',
          data: { offer_id: updatedOffer.id },
        });
      }

      return res.status(200).json({
        message: 'Offre mise à jour avec succès',
        offer: updatedOffer,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Offer endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
