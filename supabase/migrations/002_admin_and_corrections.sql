-- Migration 002: Corrections et ajout de la partie admin

-- =====================================================
-- PARTIE 1: CORRECTIONS DU SCHÉMA EXISTANT
-- =====================================================

-- Ajouter nouveaux types ENUM
CREATE TYPE user_validation_status AS ENUM ('Validé', 'En Attente', 'Refusé');
CREATE TYPE admin_role AS ENUM ('Executif', 'Admin', 'Member');
CREATE TYPE claim_state AS ENUM ('En instruction', 'Cloturé');
CREATE TYPE zone_type AS ENUM ('UE', 'Hors-UE');
CREATE TYPE activity_type AS ENUM ('user_created', 'user_validated', 'user_suspended', 'user_deleted', 'ad_created', 'ad_archived', 'ad_reported', 'ad_deleted', 'offer_created', 'offer_accepted', 'order_created', 'payment_made', 'claim_created', 'claim_resolved', 'admin_action');

-- Table admin_users (créée en premier car référencée ailleurs)
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role admin_role NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.admin_users(id)
);

-- Modifier la table users
ALTER TABLE public.users DROP COLUMN IF EXISTS validated_by_alif;
ALTER TABLE public.users ADD COLUMN validation_status user_validation_status DEFAULT 'En Attente' NOT NULL;
ALTER TABLE public.users ADD COLUMN user_validated_by UUID REFERENCES public.admin_users(id);
ALTER TABLE public.users ADD COLUMN validation_date TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN identity_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN rib_document TEXT;
ALTER TABLE public.users ADD COLUMN additional_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN is_suspended BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.users ADD COLUMN suspended_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN suspension_reason TEXT;
ALTER TABLE public.users ADD COLUMN suspended_by UUID REFERENCES public.admin_users(id);
ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN deleted_by UUID REFERENCES public.admin_users(id);
ALTER TABLE public.users ADD COLUMN can_publish_ads BOOLEAN DEFAULT true NOT NULL;

-- Modifier la table ads
ALTER TABLE public.ads ADD COLUMN is_archived BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.ads ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE public.ads ADD COLUMN is_reported BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.ads ADD COLUMN reported_count INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN is_blocked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.ads ADD COLUMN blocked_at TIMESTAMPTZ;
ALTER TABLE public.ads ADD COLUMN blocked_by UUID REFERENCES public.admin_users(id);
ALTER TABLE public.ads ADD COLUMN block_reason TEXT;

-- Modifier la table claims
ALTER TABLE public.claims DROP COLUMN IF EXISTS status;
ALTER TABLE public.claims ADD COLUMN claim_state claim_state DEFAULT 'En instruction' NOT NULL;
ALTER TABLE public.claims ADD COLUMN is_urgent BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.claims ADD COLUMN has_processing_fees BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.claims ADD COLUMN created_by_admin BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.claims ADD COLUMN assigned_to UUID REFERENCES public.admin_users(id);
ALTER TABLE public.claims ADD COLUMN closed_by UUID REFERENCES public.admin_users(id);
ALTER TABLE public.claims ADD COLUMN closure_decision TEXT;
ALTER TABLE public.claims ADD COLUMN closed_at TIMESTAMPTZ;
ALTER TABLE public.claims DROP COLUMN IF EXISTS resolved_by;
ALTER TABLE public.claims DROP COLUMN IF EXISTS resolved_at;
ALTER TABLE public.claims DROP COLUMN IF EXISTS resolution;

-- =====================================================
-- PARTIE 2: NOUVELLES TABLES POUR LA PARTIE ADMIN
-- =====================================================

-- Table pour les signalements d'annonces
CREATE TABLE public.ad_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed BOOLEAN DEFAULT false NOT NULL,
    reviewed_by UUID REFERENCES public.admin_users(id),
    reviewed_at TIMESTAMPTZ,
    action_taken VARCHAR(100)
);

-- Table pour les commentaires sur les litiges
CREATE TABLE public.claim_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_by_user UUID REFERENCES public.users(id),
    created_by_admin UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT check_creator CHECK (
        (created_by_user IS NOT NULL AND created_by_admin IS NULL) OR
        (created_by_user IS NULL AND created_by_admin IS NOT NULL)
    )
);

-- Table pour l'historique d'activité des utilisateurs de la plateforme
CREATE TABLE public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table pour l'historique d'activité des admin_users
CREATE TABLE public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table pour les commissions personnalisées
CREATE TABLE public.custom_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_for_unsold BOOLEAN NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    number_of_publications INTEGER,
    publications_used INTEGER DEFAULT 0,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table pour les commissions par catégorie et zone
CREATE TABLE public.category_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category category_type NOT NULL,
    zone zone_type NOT NULL,
    is_for_unsold BOOLEAN NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(category, zone, is_for_unsold)
);

-- Table pour les statistiques quotidiennes (cache)
CREATE TABLE public.daily_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE UNIQUE NOT NULL,
    total_users INTEGER DEFAULT 0,
    validated_users INTEGER DEFAULT 0,
    pending_users INTEGER DEFAULT 0,
    rejected_users INTEGER DEFAULT 0,
    suspended_users INTEGER DEFAULT 0,
    deleted_users INTEGER DEFAULT 0,
    new_users_count INTEGER DEFAULT 0,
    total_ads INTEGER DEFAULT 0,
    active_ads INTEGER DEFAULT 0,
    archived_ads INTEGER DEFAULT 0,
    deleted_ads INTEGER DEFAULT 0,
    reported_ads INTEGER DEFAULT 0,
    auction_ads INTEGER DEFAULT 0,
    direct_buy_ads INTEGER DEFAULT 0,
    new_ads_count INTEGER DEFAULT 0,
    daily_revenue DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PARTIE 3: INDEXES SUPPLÉMENTAIRES
-- =====================================================

CREATE INDEX idx_users_validation_status ON public.users(validation_status);
CREATE INDEX idx_users_is_suspended ON public.users(is_suspended);
CREATE INDEX idx_users_validated_by ON public.users(user_validated_by);
CREATE INDEX idx_ads_is_archived ON public.ads(is_archived);
CREATE INDEX idx_ads_is_reported ON public.ads(is_reported);
CREATE INDEX idx_ads_is_blocked ON public.ads(is_blocked);
CREATE INDEX idx_claims_state ON public.claims(claim_state);
CREATE INDEX idx_claims_assigned_to ON public.claims(assigned_to);
CREATE INDEX idx_claims_is_urgent ON public.claims(is_urgent);
CREATE INDEX idx_ad_reports_ad ON public.ad_reports(ad_id);
CREATE INDEX idx_ad_reports_reviewed ON public.ad_reports(reviewed);
CREATE INDEX idx_claim_comments_claim ON public.claim_comments(claim_id);
CREATE INDEX idx_user_activity_logs_user ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_type ON public.user_activity_logs(activity_type);
CREATE INDEX idx_admin_activity_logs_admin ON public.admin_activity_logs(admin_id);
CREATE INDEX idx_custom_commissions_user ON public.custom_commissions(user_id);
CREATE INDEX idx_custom_commissions_active ON public.custom_commissions(is_active);

-- =====================================================
-- PARTIE 4: TRIGGERS
-- =====================================================

-- Trigger pour updated_at sur les nouvelles tables
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_commissions_updated_at BEFORE UPDATE ON public.custom_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_commissions_updated_at BEFORE UPDATE ON public.category_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_statistics_updated_at BEFORE UPDATE ON public.daily_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour logger l'activité utilisateur
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_activity_logs (user_id, activity_type, description)
        VALUES (NEW.id, 'user_created', 'Compte créé');
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.validation_status != NEW.validation_status AND NEW.validation_status = 'Validé' THEN
            INSERT INTO public.user_activity_logs (user_id, activity_type, description)
            VALUES (NEW.id, 'user_validated', 'Compte validé par un administrateur');
        END IF;

        IF OLD.is_suspended != NEW.is_suspended AND NEW.is_suspended = true THEN
            INSERT INTO public.user_activity_logs (user_id, activity_type, description, metadata)
            VALUES (NEW.id, 'user_suspended', 'Compte suspendu', jsonb_build_object('reason', NEW.suspension_reason));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_user_activity_trigger
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- =====================================================
-- PARTIE 5: DONNÉES PAR DÉFAUT
-- =====================================================

-- Créer le compte admin Executif par défaut
-- IMPORTANT: Changez ce mot de passe après la première connexion!
INSERT INTO public.admin_users (email, password_hash, role, is_active)
VALUES (
    'admin@alif.com',
    crypt('AlifAdmin2024!', gen_salt('bf')),  -- Mot de passe: AlifAdmin2024!
    'Executif',
    true
);

-- Commissions par défaut (5% pour toutes les catégories et zones)
INSERT INTO public.category_commissions (category, zone, is_for_unsold, commission_rate, is_active)
SELECT
    category::category_type,
    zone::zone_type,
    is_for_unsold,
    5.00,
    true
FROM (
    VALUES
        ('Alimentaire'),
        ('Mobilier-Electroménager'),
        ('Multimédia-Technologies'),
        ('Décor-Bazar'),
        ('Mode-Textile'),
        ('Beauté-Santé'),
        ('Sport-Loisirs'),
        ('Autre')
) AS categories(category)
CROSS JOIN (VALUES ('UE'), ('Hors-UE')) AS zones(zone)
CROSS JOIN (VALUES (true), (false)) AS unsold(is_for_unsold);

-- =====================================================
-- PARTIE 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Désactiver RLS pour les admin_users (accès via service key uniquement)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;

-- Policies pour ad_reports (les utilisateurs peuvent signaler)
CREATE POLICY "Users can create ad reports" ON public.ad_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports" ON public.ad_reports
    FOR SELECT USING (auth.uid() = reported_by);

-- Policies pour claim_comments
CREATE POLICY "Users can view comments on their claims" ON public.claim_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.claims
            WHERE claims.id = claim_comments.claim_id
            AND (claims.claimant_id = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM public.orders
                     WHERE orders.id = claims.order_id
                     AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
                 ))
        )
    );

CREATE POLICY "Users can add comments on their claims" ON public.claim_comments
    FOR INSERT WITH CHECK (
        created_by_user = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.claims
            WHERE claims.id = claim_comments.claim_id
            AND (claims.claimant_id = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM public.orders
                     WHERE orders.id = claims.order_id
                     AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
                 ))
        )
    );

-- Policies pour user_activity_logs
CREATE POLICY "Users can view their own activity" ON public.user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Note: Les tables admin sont gérées via service key, pas de policies RLS publiques

-- =====================================================
-- PARTIE 7: FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer la commission applicable
CREATE OR REPLACE FUNCTION get_applicable_commission(
    p_user_id UUID,
    p_category category_type,
    p_zone zone_type,
    p_is_unsold BOOLEAN
)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_commission DECIMAL(5, 2);
BEGIN
    -- D'abord, chercher une commission personnalisée active
    SELECT commission_rate INTO v_commission
    FROM public.custom_commissions
    WHERE user_id = p_user_id
      AND is_for_unsold = p_is_unsold
      AND is_active = true
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND (number_of_publications IS NULL OR publications_used < number_of_publications)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si pas de commission personnalisée, utiliser la commission par catégorie/zone
    IF v_commission IS NULL THEN
        SELECT commission_rate INTO v_commission
        FROM public.category_commissions
        WHERE category = p_category
          AND zone = p_zone
          AND is_for_unsold = p_is_unsold
          AND is_active = true
        LIMIT 1;
    END IF;

    -- Si toujours rien, utiliser 5% par défaut
    RETURN COALESCE(v_commission, 5.00);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter l'usage de commission personnalisée
CREATE OR REPLACE FUNCTION increment_custom_commission_usage(p_user_id UUID, p_is_unsold BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.custom_commissions
    SET publications_used = publications_used + 1
    WHERE user_id = p_user_id
      AND is_for_unsold = p_is_unsold
      AND is_active = true
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND (number_of_publications IS NULL OR publications_used < number_of_publications);
END;
$$ LANGUAGE plpgsql;
