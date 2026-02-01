import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID commande invalide' });
    }

    // GET - Get order by ID
    if (req.method === 'GET') {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          ad:ads!orders_ad_id_fkey(*),
          buyer:users!orders_buyer_id_fkey(id, firstname, lastname, company_name, email, tel, profile_picture),
          seller:users!orders_seller_id_fkey(id, firstname, lastname, company_name, email, tel, profile_picture),
          payment:payments(*),
          delivery:deliveries(*)
        `)
        .eq('id', id)
        .single();

      if (error || !order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Check if user is buyer or seller
      if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé à voir cette commande' });
      }

      return res.status(200).json({ order });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Order endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
