import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { stripe } from '@/lib/stripe/client';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.stripe_account_id) {
      return res.status(400).json({ error: 'Un compte Stripe Connect existe déjà pour cet utilisateur' });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: user.company_name ? 'company' : 'individual',
      business_profile: {
        name: user.company_name || `${user.firstname} ${user.lastname}`,
        support_email: user.email,
        support_phone: user.tel,
      },
    });

    // Save Stripe account ID to database
    await supabaseAdmin
      .from('users')
      .update({ stripe_account_id: account.id })
      .eq('id', req.user.id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/stripe/success`,
      type: 'account_onboarding',
    });

    return res.status(200).json({
      message: 'Compte Stripe Connect créé avec succès',
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('Create Stripe Connect account error:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

export default withAuth(handler);
