import { z } from 'zod';

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Rue requise'),
  city: z.string().min(1, 'Ville requise'),
  postal_code: z.string().min(1, 'Code postal requis'),
  country: z.string().min(1, 'Pays requis'),
  additional_info: z.string().optional(),
});

// User schemas
export const registerUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstname: z.string().min(1, 'Prénom requis'),
  lastname: z.string().min(1, 'Nom requis'),
  tel: z.string().min(10, 'Numéro de téléphone invalide'),
  is_only_buyer: z.boolean().default(false),
  company_name: z.string().optional(),
  company_type: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstname: z.string().min(1).optional(),
  lastname: z.string().min(1).optional(),
  tel: z.string().min(10).optional(),
  company_name: z.string().optional(),
  company_type: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
  billing_address: addressSchema.optional(),
  shipping_address: addressSchema.optional(),
  profile_picture: z.string().optional(),
});

// Ad schemas
export const createAdSchema = z.object({
  title: z.string().min(3, 'Titre trop court').max(255, 'Titre trop long'),
  other_info: z.string().optional(),
  photos: z.array(z.string()).default([]),
  type: z.enum(['Enchère', 'Achat Direct']),
  auction_duration: z.string().optional(),
  merchandise_type: z.enum([
    'Référence Unique',
    'Plusieurs Références',
    'Invendus - Référence Unique',
    'Invendus - Plusieurs Références',
  ]),
  weight: z.number().positive().optional(),
  dlc_ddm: z.string().optional(),
  availability: z.enum(['Immediate', 'Dans 1 semaine', 'Dans 2 semaines', 'Dans 1 mois']).default('Immediate'),
  unit_price: z.number().positive('Prix unitaire doit être positif'),
  total_price: z.number().positive('Prix total doit être positif'),
  advised_unit_price_min: z.number().positive().optional(),
  advised_unit_price_max: z.number().positive().optional(),
  unit_quantity: z.number().int().positive('Quantité unitaire doit être positive'),
  total_quantity: z.number().int().positive('Quantité totale doit être positive'),
  nb_palets: z.number().int().positive().optional(),
  listing_file: z.string().optional(),
  additional_files: z.array(z.string()).default([]),
  category: z.enum([
    'Alimentaire',
    'Mobilier-Electroménager',
    'Multimédia-Technologies',
    'Décor-Bazar',
    'Mode-Textile',
    'Beauté-Santé',
    'Sport-Loisirs',
    'Autre',
  ]),
});

export const updateAdSchema = createAdSchema.partial();

export const searchAdsSchema = z.object({
  category: z.string().optional(),
  type: z.enum(['Enchère', 'Achat Direct']).optional(),
  min_price: z.number().positive().optional(),
  max_price: z.number().positive().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Offer schemas
export const createOfferSchema = z.object({
  ad_id: z.string().uuid('ID annonce invalide'),
  price_offered: z.number().positive('Prix offert doit être positif'),
  quantity: z.number().int().positive('Quantité doit être positive'),
  message: z.string().optional(),
});

export const updateOfferSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled']),
  seller_response: z.string().optional(),
});

// Order schemas
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending_payment',
    'payment_received',
    'processing',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
    'refunded',
  ]),
});

// Claim schemas
export const createClaimSchema = z.object({
  order_id: z.string().uuid('ID commande invalide'),
  type: z.enum(['product_damaged', 'product_missing', 'wrong_product', 'quality_issue', 'other']),
  subject: z.string().min(3, 'Sujet trop court').max(255, 'Sujet trop long'),
  description: z.string().min(10, 'Description trop courte'),
  photos: z.array(z.string()).default([]),
});

// Helper function to validate request body
export function validateBody<T>(schema: z.Schema<T>, data: any): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Données invalides' };
  }
}
