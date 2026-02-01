import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID réclamation invalide' });
    }

    // GET - Get claim by ID
    if (req.method === 'GET') {
      const { data: claim, error } = await supabaseAdmin
        .from('claims')
        .select(`
          *,
          order:orders!claims_order_id_fkey(
            *,
            ad:ads!orders_ad_id_fkey(id, title, photos),
            buyer:users!orders_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture),
            seller:users!orders_seller_id_fkey(id, firstname, lastname, company_name, profile_picture)
          ),
          claimant:users!claims_claimant_id_fkey(id, firstname, lastname, company_name, profile_picture)
        `)
        .eq('id', id)
        .single();

      if (error || !claim) {
        return res.status(404).json({ error: 'Réclamation non trouvée' });
      }

      // Check if user is involved in the claim
      const order = (claim as any).order;
      if (claim.claimant_id !== req.user.id && order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé à voir cette réclamation' });
      }

      return res.status(200).json({ claim });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Claim endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
