import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID commande invalide' });
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, payment:payments(*)')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Only buyer can confirm delivery
    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Seul l\'acheteur peut confirmer la réception' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Cette commande est déjà complétée' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'La commande doit être livrée avant de confirmer la réception' });
    }

    // Update order status to completed
    await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', id);

    // Update delivery status
    await supabaseAdmin
      .from('deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        actual_delivery_date: new Date().toISOString().split('T')[0],
      })
      .eq('order_id', id);

    // Trigger transfer to seller (this will be handled by Stripe webhook in production)
    // For now, we just mark the payment as ready for transfer
    const payment = (order as any).payment?.[0];
    if (payment && !payment.transferred_to_seller) {
      await supabaseAdmin
        .from('payments')
        .update({
          transferred_to_seller: true,
          transferred_at: new Date().toISOString(),
        })
        .eq('order_id', id);

      // Notify seller that payment has been transferred
      await supabaseAdmin.from('notifications').insert({
        user_id: order.seller_id,
        type: 'payment_transferred',
        title: 'Paiement transféré',
        message: 'Le paiement pour votre commande a été transféré sur votre compte.',
        data: { order_id: id },
      });
    }

    // Notify seller
    await supabaseAdmin.from('notifications').insert({
      user_id: order.seller_id,
      type: 'delivery_confirmed',
      title: 'Livraison confirmée',
      message: 'L\'acheteur a confirmé la réception de la marchandise.',
      data: { order_id: id },
    });

    return res.status(200).json({
      message: 'Réception confirmée avec succès',
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
