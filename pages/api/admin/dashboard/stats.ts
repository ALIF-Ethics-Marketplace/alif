import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Users stats
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: validatedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('validation_status', 'Validé')
      .is('deleted_at', null);

    const { count: pendingUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('validation_status', 'En Attente')
      .is('deleted_at', null);

    const { count: rejectedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('validation_status', 'Refusé')
      .is('deleted_at', null);

    const { count: suspendedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true)
      .is('deleted_at', null);

    const { count: deletedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    // Ads stats
    const { count: totalAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true });

    const { count: activeAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_archived', false);

    const { count: archivedAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', true);

    const { count: reportedAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('is_reported', true);

    const { count: auctionAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'Enchère');

    const { count: directBuyAds } = await supabaseAdmin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'Achat Direct');

    // Revenue stats
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRevenue } = await supabaseAdmin
      .from('payments')
      .select('platform_fee')
      .eq('status', 'succeeded')
      .gte('paid_at', today);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekRevenue } = await supabaseAdmin
      .from('payments')
      .select('platform_fee')
      .eq('status', 'succeeded')
      .gte('paid_at', weekAgo);

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: monthRevenue } = await supabaseAdmin
      .from('payments')
      .select('platform_fee')
      .eq('status', 'succeeded')
      .gte('paid_at', monthAgo);

    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: yearRevenue } = await supabaseAdmin
      .from('payments')
      .select('platform_fee')
      .eq('status', 'succeeded')
      .gte('paid_at', yearAgo);

    const calculateRevenue = (data: any[]) =>
      data?.reduce((sum, p) => sum + (Number(p.platform_fee) || 0), 0) || 0;

    return res.status(200).json({
      users: {
        total: totalUsers || 0,
        validated: validatedUsers || 0,
        pending: pendingUsers || 0,
        rejected: rejectedUsers || 0,
        suspended: suspendedUsers || 0,
        deleted: deletedUsers || 0,
      },
      ads: {
        total: totalAds || 0,
        active: activeAds || 0,
        archived: archivedAds || 0,
        reported: reportedAds || 0,
        auction: auctionAds || 0,
        directBuy: directBuyAds || 0,
      },
      revenue: {
        today: calculateRevenue(todayRevenue),
        week: calculateRevenue(weekRevenue),
        month: calculateRevenue(monthRevenue),
        year: calculateRevenue(yearRevenue),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
