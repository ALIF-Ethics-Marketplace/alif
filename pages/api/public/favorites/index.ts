import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const addFavoriteSchema = z.object({
  ad_id: z.string().uuid('ID annonce invalide'),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // GET - Get user's favorites
    if (req.method === 'GET') {
      const { data: favorites, error } = await supabaseAdmin
        .from('favorites')
        .select(`
          *,
          ad:ads!favorites_ad_id_fkey(
            *,
            author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
          )
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des favoris' });
      }

      return res.status(200).json({ favorites });
    }

    // POST - Add to favorites
    if (req.method === 'POST') {
      const validation = validateBody(addFavoriteSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { ad_id } = validation.data;

      // Check if ad exists
      const { data: ad } = await supabaseAdmin
        .from('ads')
        .select('id')
        .eq('id', ad_id)
        .single();

      if (!ad) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }

      // Check if already favorited
      const { data: existing } = await supabaseAdmin
        .from('favorites')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('ad_id', ad_id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Annonce déjà dans les favoris' });
      }

      const { data: favorite, error } = await supabaseAdmin
        .from('favorites')
        .insert({
          user_id: req.user.id,
          ad_id,
        })
        .select(`
          *,
          ad:ads!favorites_ad_id_fkey(
            *,
            author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
          )
        `)
        .single();

      if (error) {
        console.error('Error adding favorite:', error);
        return res.status(400).json({ error: 'Erreur lors de l\'ajout aux favoris' });
      }

      return res.status(201).json({
        message: 'Ajouté aux favoris',
        favorite,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Favorites endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
