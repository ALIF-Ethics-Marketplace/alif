-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE alif_status_type AS ENUM ('Gold', 'Normal', 'Silver');
CREATE TYPE ad_type AS ENUM ('Enchère', 'Achat Direct');
CREATE TYPE merchandise_type AS ENUM ('Référence Unique', 'Plusieurs Références', 'Invendus - Référence Unique', 'Invendus - Plusieurs Références');
CREATE TYPE availability_type AS ENUM ('Immediate', 'Dans 1 semaine', 'Dans 2 semaines', 'Dans 1 mois');
CREATE TYPE category_type AS ENUM ('Alimentaire', 'Mobilier-Electroménager', 'Multimédia-Technologies', 'Décor-Bazar', 'Mode-Textile', 'Beauté-Santé', 'Sport-Loisirs', 'Autre');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
CREATE TYPE order_status AS ENUM ('pending_payment', 'payment_received', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE delivery_status AS ENUM ('pending', 'preparing', 'shipped', 'in_transit', 'delivered', 'failed', 'returned');
CREATE TYPE claim_status AS ENUM ('open', 'in_review', 'resolved', 'rejected', 'closed');
CREATE TYPE claim_type AS ENUM ('product_damaged', 'product_missing', 'wrong_product', 'quality_issue', 'other');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_only_buyer BOOLEAN DEFAULT false NOT NULL,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    company_type VARCHAR(100),
    siret VARCHAR(14),
    vat_number VARCHAR(50),
    tel VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    validated_by_alif BOOLEAN DEFAULT false NOT NULL,
    validated_by_stripe BOOLEAN DEFAULT false NOT NULL,
    alif_status alif_status_type DEFAULT 'Normal' NOT NULL,
    billing_address JSONB,
    shipping_address JSONB,
    profile_picture TEXT,
    stripe_account_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ads table
CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    other_info TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    type ad_type NOT NULL,
    auction_duration VARCHAR(50),
    auction_end_date TIMESTAMPTZ,
    merchandise_type merchandise_type NOT NULL,
    weight DECIMAL(10, 2),
    dlc_ddm DATE,
    availability availability_type DEFAULT 'Immediate',
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    advised_unit_price_min DECIMAL(10, 2),
    advised_unit_price_max DECIMAL(10, 2),
    unit_quantity INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    nb_palets INTEGER,
    listing_file TEXT,
    additional_files JSONB DEFAULT '[]'::jsonb,
    category category_type NOT NULL,
    is_sponsored BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Offers table
CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price_offered DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    status offer_status DEFAULT 'pending' NOT NULL,
    message TEXT,
    seller_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
    ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status order_status DEFAULT 'pending_payment' NOT NULL,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    seller_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR' NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    payment_method VARCHAR(100),
    paid_at TIMESTAMPTZ,
    transferred_to_seller BOOLEAN DEFAULT false NOT NULL,
    transferred_at TIMESTAMPTZ,
    stripe_transfer_id VARCHAR(255),
    refund_amount DECIMAL(10, 2),
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Deliveries table
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    shipping_method VARCHAR(100),
    status delivery_status DEFAULT 'pending' NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    shipping_address JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Claims table
CREATE TABLE public.claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    claimant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    type claim_type NOT NULL,
    status claim_status DEFAULT 'open' NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    resolution TEXT,
    resolved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

-- Favorites table
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, ad_id)
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_ads_author ON public.ads(author_id);
CREATE INDEX idx_ads_category ON public.ads(category);
CREATE INDEX idx_ads_type ON public.ads(type);
CREATE INDEX idx_ads_is_active ON public.ads(is_active);
CREATE INDEX idx_ads_created_at ON public.ads(created_at DESC);
CREATE INDEX idx_offers_ad ON public.offers(ad_id);
CREATE INDEX idx_offers_buyer ON public.offers(buyer_id);
CREATE INDEX idx_offers_seller ON public.offers(seller_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_claims_order ON public.claims(order_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'ALIF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq;

-- Add trigger for order number generation
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public users can view other users' public info" ON public.users
    FOR SELECT USING (true);

-- Ads policies
CREATE POLICY "Anyone can view active ads" ON public.ads
    FOR SELECT USING (is_active = true OR author_id = auth.uid());

CREATE POLICY "Users can create ads" ON public.ads
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own ads" ON public.ads
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own ads" ON public.ads
    FOR DELETE USING (auth.uid() = author_id);

-- Offers policies
CREATE POLICY "Buyers and sellers can view their offers" ON public.offers
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create offers" ON public.offers
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update offers" ON public.offers
    FOR UPDATE USING (auth.uid() = seller_id);

-- Orders policies
CREATE POLICY "Buyers and sellers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Payments policies
CREATE POLICY "Users can view their payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

-- Deliveries policies
CREATE POLICY "Users can view their deliveries" ON public.deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = deliveries.order_id
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

-- Claims policies
CREATE POLICY "Users can view their claims" ON public.claims
    FOR SELECT USING (
        auth.uid() = claimant_id OR
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = claims.order_id
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can create claims" ON public.claims
    FOR INSERT WITH CHECK (auth.uid() = claimant_id);

-- Favorites policies
CREATE POLICY "Users can view their favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their favorites" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
