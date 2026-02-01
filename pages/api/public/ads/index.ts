import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { createAdSchema, validateBody, searchAdsSchema } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest | NextApiRequest, res: NextApiResponse) {
  try {
    // GET - List all active ads (public, no auth required)
    if (req.method === 'GET') {
      const validation = validateBody(searchAdsSchema, {
        category: req.query.category,
        type: req.query.type,
        min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
        max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
        search: req.query.search,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });

      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { category, type, min_price, max_price, search, page, limit } = validation.data;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('ads')
        .select(`
          *,
          author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (min_price) {
        query = query.gte('unit_price', min_price);
      }

      if (max_price) {
        query = query.lte('unit_price', max_price);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,other_info.ilike.%${search}%`);
      }

      const { data: ads, error, count } = await query;

      if (error) {
        console.error('Error fetching ads:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des annonces' });
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
    }

    // POST - Create new ad (auth required)
    if (req.method === 'POST') {
      const authenticatedReq = req as AuthenticatedRequest;
      if (!authenticatedReq.user) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const validation = validateBody(createAdSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const adData = validation.data;

      // Check if user is only buyer
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('is_only_buyer')
        .eq('id', authenticatedReq.user.id)
        .single();

      if (user?.is_only_buyer) {
        return res.status(403).json({ error: 'Les acheteurs ne peuvent pas créer d\'annonces' });
      }

      // Calculate auction end date if it's an auction
      let auction_end_date = null;
      if (adData.type === 'Enchère' && adData.auction_duration) {
        const hours = parseInt(adData.auction_duration);
        if (!isNaN(hours)) {
          auction_end_date = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        }
      }

      const { data: newAd, error } = await supabaseAdmin
        .from('ads')
        .insert({
          ...adData,
          author_id: authenticatedReq.user.id,
          auction_end_date,
        })
        .select(`
          *,
          author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
        `)
        .single();

      if (error) {
        console.error('Error creating ad:', error);
        return res.status(400).json({ error: 'Erreur lors de la création de l\'annonce' });
      }

      return res.status(201).json({
        message: 'Annonce créée avec succès',
        ad: newAd,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Ads endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Export handler with conditional auth
export default function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return withAuth(handler as any)(req, res);
  }
  return handler(req, res);
}
