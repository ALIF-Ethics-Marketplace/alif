export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AlifStatus = 'Gold' | 'Normal' | 'Silver';
export type AdType = 'Enchère' | 'Achat Direct';
export type MerchandiseType = 'Référence Unique' | 'Plusieurs Références' | 'Invendus - Référence Unique' | 'Invendus - Plusieurs Références';
export type AvailabilityType = 'Immediate' | 'Dans 1 semaine' | 'Dans 2 semaines' | 'Dans 1 mois';
export type CategoryType = 'Alimentaire' | 'Mobilier-Electroménager' | 'Multimédia-Technologies' | 'Décor-Bazar' | 'Mode-Textile' | 'Beauté-Santé' | 'Sport-Loisirs' | 'Autre';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type OrderStatus = 'pending_payment' | 'payment_received' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
export type DeliveryStatus = 'pending' | 'preparing' | 'shipped' | 'in_transit' | 'delivered' | 'failed' | 'returned';
export type ClaimStatus = 'open' | 'in_review' | 'resolved' | 'rejected' | 'closed';
export type ClaimType = 'product_damaged' | 'product_missing' | 'wrong_product' | 'quality_issue' | 'other';

export interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  additional_info?: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          is_only_buyer: boolean;
          firstname: string;
          lastname: string;
          company_name: string | null;
          company_type: string | null;
          siret: string | null;
          vat_number: string | null;
          tel: string;
          email: string;
          validated_by_alif: boolean;
          validated_by_stripe: boolean;
          alif_status: AlifStatus;
          billing_address: Address | null;
          shipping_address: Address | null;
          profile_picture: string | null;
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          is_only_buyer?: boolean;
          firstname: string;
          lastname: string;
          company_name?: string | null;
          company_type?: string | null;
          siret?: string | null;
          vat_number?: string | null;
          tel: string;
          email: string;
          validated_by_alif?: boolean;
          validated_by_stripe?: boolean;
          alif_status?: AlifStatus;
          billing_address?: Address | null;
          shipping_address?: Address | null;
          profile_picture?: string | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_only_buyer?: boolean;
          firstname?: string;
          lastname?: string;
          company_name?: string | null;
          company_type?: string | null;
          siret?: string | null;
          vat_number?: string | null;
          tel?: string;
          email?: string;
          validated_by_alif?: boolean;
          validated_by_stripe?: boolean;
          alif_status?: AlifStatus;
          billing_address?: Address | null;
          shipping_address?: Address | null;
          profile_picture?: string | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ads: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          other_info: string | null;
          photos: string[];
          type: AdType;
          auction_duration: string | null;
          auction_end_date: string | null;
          merchandise_type: MerchandiseType;
          weight: number | null;
          dlc_ddm: string | null;
          availability: AvailabilityType;
          unit_price: number;
          total_price: number;
          advised_unit_price_min: number | null;
          advised_unit_price_max: number | null;
          unit_quantity: number;
          total_quantity: number;
          nb_palets: number | null;
          listing_file: string | null;
          additional_files: string[];
          category: CategoryType;
          is_sponsored: boolean;
          is_active: boolean;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          other_info?: string | null;
          photos?: string[];
          type: AdType;
          auction_duration?: string | null;
          auction_end_date?: string | null;
          merchandise_type: MerchandiseType;
          weight?: number | null;
          dlc_ddm?: string | null;
          availability?: AvailabilityType;
          unit_price: number;
          total_price: number;
          advised_unit_price_min?: number | null;
          advised_unit_price_max?: number | null;
          unit_quantity: number;
          total_quantity: number;
          nb_palets?: number | null;
          listing_file?: string | null;
          additional_files?: string[];
          category: CategoryType;
          is_sponsored?: boolean;
          is_active?: boolean;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          other_info?: string | null;
          photos?: string[];
          type?: AdType;
          auction_duration?: string | null;
          auction_end_date?: string | null;
          merchandise_type?: MerchandiseType;
          weight?: number | null;
          dlc_ddm?: string | null;
          availability?: AvailabilityType;
          unit_price?: number;
          total_price?: number;
          advised_unit_price_min?: number | null;
          advised_unit_price_max?: number | null;
          unit_quantity?: number;
          total_quantity?: number;
          nb_palets?: number | null;
          listing_file?: string | null;
          additional_files?: string[];
          category?: CategoryType;
          is_sponsored?: boolean;
          is_active?: boolean;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          ad_id: string;
          seller_id: string;
          buyer_id: string;
          price_offered: number;
          quantity: number;
          status: OfferStatus;
          message: string | null;
          seller_response: string | null;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          rejected_at: string | null;
        };
        Insert: {
          id?: string;
          ad_id: string;
          seller_id: string;
          buyer_id: string;
          price_offered: number;
          quantity: number;
          status?: OfferStatus;
          message?: string | null;
          seller_response?: string | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
        };
        Update: {
          id?: string;
          ad_id?: string;
          seller_id?: string;
          buyer_id?: string;
          price_offered?: number;
          quantity?: number;
          status?: OfferStatus;
          message?: string | null;
          seller_response?: string | null;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          offer_id: string;
          ad_id: string;
          buyer_id: string;
          seller_id: string;
          order_number: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          platform_fee: number;
          total_amount: number;
          status: OrderStatus;
          shipping_address: Address;
          billing_address: Address;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          ad_id: string;
          buyer_id: string;
          seller_id: string;
          order_number?: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          platform_fee: number;
          total_amount: number;
          status?: OrderStatus;
          shipping_address: Address;
          billing_address: Address;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          offer_id?: string;
          ad_id?: string;
          buyer_id?: string;
          seller_id?: string;
          order_number?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          platform_fee?: number;
          total_amount?: number;
          status?: OrderStatus;
          shipping_address?: Address;
          billing_address?: Address;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          amount: number;
          platform_fee: number;
          seller_amount: number;
          currency: string;
          status: PaymentStatus;
          payment_method: string | null;
          paid_at: string | null;
          transferred_to_seller: boolean;
          transferred_at: string | null;
          stripe_transfer_id: string | null;
          refund_amount: number | null;
          refunded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          amount: number;
          platform_fee: number;
          seller_amount: number;
          currency?: string;
          status?: PaymentStatus;
          payment_method?: string | null;
          paid_at?: string | null;
          transferred_to_seller?: boolean;
          transferred_at?: string | null;
          stripe_transfer_id?: string | null;
          refund_amount?: number | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          amount?: number;
          platform_fee?: number;
          seller_amount?: number;
          currency?: string;
          status?: PaymentStatus;
          payment_method?: string | null;
          paid_at?: string | null;
          transferred_to_seller?: boolean;
          transferred_at?: string | null;
          stripe_transfer_id?: string | null;
          refund_amount?: number | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          tracking_number: string | null;
          carrier: string | null;
          shipping_method: string | null;
          status: DeliveryStatus;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          shipping_address: Address;
          notes: string | null;
          created_at: string;
          updated_at: string;
          shipped_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          tracking_number?: string | null;
          carrier?: string | null;
          shipping_method?: string | null;
          status?: DeliveryStatus;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          shipping_address: Address;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          tracking_number?: string | null;
          carrier?: string | null;
          shipping_method?: string | null;
          status?: DeliveryStatus;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          shipping_address?: Address;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
      };
      claims: {
        Row: {
          id: string;
          order_id: string;
          claimant_id: string;
          type: ClaimType;
          status: ClaimStatus;
          subject: string;
          description: string;
          photos: string[];
          resolution: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          claimant_id: string;
          type: ClaimType;
          status?: ClaimStatus;
          subject: string;
          description: string;
          photos?: string[];
          resolution?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          claimant_id?: string;
          type?: ClaimType;
          status?: ClaimStatus;
          subject?: string;
          description?: string;
          photos?: string[];
          resolution?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          ad_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
