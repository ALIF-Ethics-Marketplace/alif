import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const validation_status = req.query.validation_status as string;
    const is_suspended = req.query.is_suspended as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        validated_by_admin:admin_users!users_user_validated_by_fkey(id, email, role),
        suspended_by_admin:admin_users!users_suspended_by_fkey(id, email, role)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (validation_status) {
      query = query.eq('validation_status', validation_status);
    }

    if (is_suspended === 'true') {
      query = query.eq('is_suspended', true);
    } else if (is_suspended === 'false') {
      query = query.eq('is_suspended', false);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,firstname.ilike.%${search}%,lastname.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(400).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }

    return res.status(200).json({
      users,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
