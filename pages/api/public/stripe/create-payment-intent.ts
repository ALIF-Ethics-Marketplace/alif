import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { stripe, PLATFORM_FEE_PERCENTAGE } from '@/lib/stripe/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const createPaymentIntentSchema = z.object({
  order_id: z.string().uuid('ID commande invalide'),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const validation = validateBody(createPaymentIntentSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { order_id } = validation.data;

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        seller:users!orders_seller_id_fkey(stripe_account_id, validated_by_stripe)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Check if user is the buyer
    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Check if order is in correct status
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Cette commande ne peut pas être payée' });
    }

    const seller = (order as any).seller;

    // Check if seller has Stripe account
    if (!seller.stripe_account_id) {
      return res.status(400).json({ error: 'Le vendeur n\'a pas configuré son compte Stripe' });
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('order_id', order_id)
      .single();

    if (existingPayment?.stripe_payment_intent_id) {
      // Return existing payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.stripe_payment_intent_id);
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Calculate amounts in cents
    const amountInCents = Math.round(order.total_amount * 100);
    const platformFeeInCents = Math.round(order.platform_fee * 100);

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      application_fee_amount: platformFeeInCents,
      transfer_data: {
        destination: seller.stripe_account_id,
      },
      metadata: {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
      },
    });

    // Create payment record
    await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: order.total_amount,
        platform_fee: order.platform_fee,
        seller_amount: order.subtotal,
        currency: 'EUR',
        status: 'pending',
      });

    return res.status(200).json({
      message: 'Intention de paiement créée',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

export default withAuth(handler);
