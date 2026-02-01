import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = (page - 1) * limit;

    const { data: ads, error, count } = await supabaseAdmin
      .from('ads')
      .select(`
        *,
        author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
      `, { count: 'exact' })
      .eq('author_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user ads:', error);
      return res.status(400).json({ error: 'Erreur lors de la récupération de vos annonces' });
    }

    return res.status(200).json({
      ads,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('My ads endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
