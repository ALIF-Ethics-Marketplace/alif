-- Migration 003: Suppression de toutes les contraintes RLS

-- Désactiver RLS sur toutes les tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies existantes

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Public users can view other users' public info" ON public.users;

-- Ads policies
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Users can create ads" ON public.ads;
DROP POLICY IF EXISTS "Users can update their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can delete their own ads" ON public.ads;

-- Offers policies
DROP POLICY IF EXISTS "Buyers and sellers can view their offers" ON public.offers;
DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can update offers" ON public.offers;

-- Orders policies
DROP POLICY IF EXISTS "Buyers and sellers can view their orders" ON public.orders;

-- Payments policies
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;

-- Deliveries policies
DROP POLICY IF EXISTS "Users can view their deliveries" ON public.deliveries;

-- Claims policies
DROP POLICY IF EXISTS "Users can view their claims" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;

-- Favorites policies
DROP POLICY IF EXISTS "Users can view their favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their favorites" ON public.favorites;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Ad reports policies
DROP POLICY IF EXISTS "Users can create ad reports" ON public.ad_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.ad_reports;

-- Claim comments policies
DROP POLICY IF EXISTS "Users can view comments on their claims" ON public.claim_comments;
DROP POLICY IF EXISTS "Users can add comments on their claims" ON public.claim_comments;

-- User activity logs policies
DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity_logs;

-- Note: Toutes les contraintes RLS ont été supprimées
-- Les tables sont maintenant accessibles sans restriction via l'API
-- Vous pourrez reconfigurer les RLS policies selon vos besoins plus tard
