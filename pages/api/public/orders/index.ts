import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const type = req.query.type as string; // 'purchases' or 'sales'
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        ad:ads!orders_ad_id_fkey(id, title, photos, category),
        buyer:users!orders_buyer_id_fkey(id, firstname, lastname, company_name, profile_picture),
        seller:users!orders_seller_id_fkey(id, firstname, lastname, company_name, profile_picture),
        payment:payments(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type === 'purchases') {
      query = query.eq('buyer_id', req.user.id);
    } else if (type === 'sales') {
      query = query.eq('seller_id', req.user.id);
    } else {
      // Get both purchases and sales
      query = query.or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(400).json({ error: 'Erreur lors de la récupération des commandes' });
    }

    return res.status(200).json({
      orders,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Orders endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
