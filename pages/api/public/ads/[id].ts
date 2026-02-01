import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { updateAdSchema, validateBody } from '@/lib/api/validation';

async function handler(req: AuthenticatedRequest | NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID annonce invalide' });
    }

    // GET - Get ad by ID (public, no auth required)
    if (req.method === 'GET') {
      const { data: ad, error } = await supabase
        .from('ads')
        .select(`
          *,
          author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
        `)
        .eq('id', id)
        .single();

      if (error || !ad) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }

      // Increment view count
      await supabaseAdmin
        .from('ads')
        .update({ views_count: ad.views_count + 1 })
        .eq('id', id);

      return res.status(200).json({ ad });
    }

    // PUT/PATCH - Update ad (auth required, owner only)
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const authenticatedReq = req as AuthenticatedRequest;
      if (!authenticatedReq.user) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      // Check if user owns the ad
      const { data: ad } = await supabaseAdmin
        .from('ads')
        .select('author_id')
        .eq('id', id)
        .single();

      if (!ad) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }

      if (ad.author_id !== authenticatedReq.user.id) {
        return res.status(403).json({ error: 'Non autorisé à modifier cette annonce' });
      }

      const validation = validateBody(updateAdSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { data: updatedAd, error } = await supabaseAdmin
        .from('ads')
        .update(validation.data)
        .eq('id', id)
        .select(`
          *,
          author:users!ads_author_id_fkey(id, firstname, lastname, company_name, alif_status, profile_picture)
        `)
        .single();

      if (error) {
        console.error('Error updating ad:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour de l\'annonce' });
      }

      return res.status(200).json({
        message: 'Annonce mise à jour avec succès',
        ad: updatedAd,
      });
    }

    // DELETE - Delete ad (auth required, owner only)
    if (req.method === 'DELETE') {
      const authenticatedReq = req as AuthenticatedRequest;
      if (!authenticatedReq.user) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      // Check if user owns the ad
      const { data: ad } = await supabaseAdmin
        .from('ads')
        .select('author_id')
        .eq('id', id)
        .single();

      if (!ad) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }

      if (ad.author_id !== authenticatedReq.user.id) {
        return res.status(403).json({ error: 'Non autorisé à supprimer cette annonce' });
      }

      // Soft delete by setting is_active to false
      const { error } = await supabaseAdmin
        .from('ads')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting ad:', error);
        return res.status(400).json({ error: 'Erreur lors de la suppression de l\'annonce' });
      }

      return res.status(200).json({ message: 'Annonce supprimée avec succès' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Ad endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Export handler with conditional auth
export default function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handler(req, res);
  }
  return withAuth(handler as any)(req, res);
}
