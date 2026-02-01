import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Signature manquante' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update payment status
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .update({
            status: 'succeeded',
            paid_at: new Date().toISOString(),
            stripe_charge_id: paymentIntent.latest_charge as string,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .select('order_id')
          .single();

        if (payment) {
          // Update order status
          await supabaseAdmin
            .from('orders')
            .update({ status: 'payment_received' })
            .eq('id', payment.order_id);

          // Get order details
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('buyer_id, seller_id')
            .eq('id', payment.order_id)
            .single();

          if (order) {
            // Create delivery record
            await supabaseAdmin
              .from('deliveries')
              .insert({
                order_id: payment.order_id,
                status: 'pending',
                shipping_address: {},
              });

            // Notify buyer and seller
            await supabaseAdmin.from('notifications').insert([
              {
                user_id: order.buyer_id,
                type: 'payment_success',
                title: 'Paiement réussi',
                message: 'Votre paiement a été accepté. Le vendeur va préparer votre commande.',
                data: { order_id: payment.order_id },
              },
              {
                user_id: order.seller_id,
                type: 'payment_received',
                title: 'Paiement reçu',
                message: 'Le paiement a été reçu. Veuillez préparer la commande pour expédition.',
                data: { order_id: payment.order_id },
              },
            ]);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('order_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (payment) {
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('buyer_id')
            .eq('id', payment.order_id)
            .single();

          if (order) {
            await supabaseAdmin.from('notifications').insert({
              user_id: order.buyer_id,
              type: 'payment_failed',
              title: 'Paiement échoué',
              message: 'Le paiement a échoué. Veuillez réessayer.',
              data: { order_id: payment.order_id },
            });
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        // Update user validation status
        if (account.charges_enabled && account.payouts_enabled) {
          await supabaseAdmin
            .from('users')
            .update({ validated_by_stripe: true })
            .eq('stripe_account_id', account.id);
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;

        // Update payment transfer info
        if (transfer.metadata?.order_id) {
          await supabaseAdmin
            .from('payments')
            .update({
              stripe_transfer_id: transfer.id,
              transferred_to_seller: true,
              transferred_at: new Date().toISOString(),
            })
            .eq('order_id', transfer.metadata.order_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
