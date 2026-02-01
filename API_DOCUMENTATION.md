# Documentation API - Alif Marketplace

## Table des matières

1. [Introduction](#introduction)
2. [Configuration](#configuration)
3. [Authentification](#authentification)
4. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [Users](#users)
   - [Ads (Annonces)](#ads-annonces)
   - [Offers (Offres)](#offers-offres)
   - [Orders (Commandes)](#orders-commandes)
   - [Claims (Réclamations)](#claims-réclamations)
   - [Favorites (Favoris)](#favorites-favoris)
   - [Notifications](#notifications)
   - [Stripe](#stripe)
   - [Upload](#upload)

---

## Introduction

API REST pour la marketplace Alif permettant de gérer les utilisateurs, annonces, offres, commandes et paiements.

**Base URL**: `http://localhost:3000/api/public`

---

## Configuration

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation de la base de données

1. Créez un projet Supabase
2. Exécutez le fichier de migration: `supabase/migrations/001_initial_schema.sql`
3. Créez les buckets de stockage dans Supabase Storage:
   - `profile-pictures`
   - `ad-photos`
   - `ad-listings`
   - `ad-documents`
   - `claim-photos`

---

## Authentification

La plupart des endpoints nécessitent une authentification via JWT. Incluez le token dans l'en-tête:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### Auth

#### POST `/auth/register`
Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstname": "John",
  "lastname": "Doe",
  "tel": "0612345678",
  "is_only_buyer": false,
  "company_name": "Ma Société",
  "company_type": "SARL",
  "siret": "12345678900012",
  "vat_number": "FR12345678901"
}
```

**Response:** `201 Created`
```json
{
  "message": "Compte créé avec succès",
  "user": { ... },
  "session": { ... }
}
```

---

#### POST `/auth/login`
Se connecter.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Connexion réussie",
  "session": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "user": { ... }
}
```

---

#### POST `/auth/logout`
Se déconnecter (nécessite authentification).

**Response:** `200 OK`
```json
{
  "message": "Déconnexion réussie"
}
```

---

#### GET `/auth/me`
Obtenir le profil de l'utilisateur connecté (nécessite authentification).

**Response:** `200 OK`
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe",
    ...
  }
}
```

---

### Users

#### GET `/users/profile`
Obtenir son profil (nécessite authentification).

**Response:** `200 OK`

---

#### PUT `/users/profile`
Mettre à jour son profil (nécessite authentification).

**Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "tel": "0612345678",
  "billing_address": {
    "street": "123 Rue Example",
    "city": "Paris",
    "postal_code": "75001",
    "country": "France"
  },
  "shipping_address": { ... }
}
```

**Response:** `200 OK`

---

#### GET `/users/[id]`
Obtenir les informations publiques d'un utilisateur (pas d'auth requise).

**Response:** `200 OK`
```json
{
  "user": {
    "id": "...",
    "firstname": "John",
    "lastname": "Doe",
    "company_name": "Ma Société",
    "alif_status": "Gold",
    "profile_picture": "..."
  }
}
```

---

### Ads (Annonces)

#### GET `/ads`
Lister les annonces actives (pas d'auth requise).

**Query params:**
- `category`: Filtrer par catégorie
- `type`: "Enchère" ou "Achat Direct"
- `min_price`: Prix minimum
- `max_price`: Prix maximum
- `search`: Recherche textuelle
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre par page (défaut: 20, max: 100)

**Response:** `200 OK`
```json
{
  "ads": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

#### POST `/ads`
Créer une annonce (nécessite authentification, interdit aux acheteurs exclusifs).

**Body:**
```json
{
  "title": "iPhone 14 Pro",
  "other_info": "Excellent état",
  "photos": ["url1", "url2"],
  "type": "Achat Direct",
  "merchandise_type": "Référence Unique",
  "unit_price": 800,
  "total_price": 8000,
  "unit_quantity": 1,
  "total_quantity": 10,
  "category": "Multimédia-Technologies",
  "availability": "Immediate"
}
```

**Response:** `201 Created`

---

#### GET `/ads/[id]`
Obtenir une annonce par ID (pas d'auth requise).

**Response:** `200 OK`

---

#### PUT `/ads/[id]`
Modifier une annonce (nécessite authentification, propriétaire uniquement).

**Response:** `200 OK`

---

#### DELETE `/ads/[id]`
Supprimer une annonce (soft delete, nécessite authentification).

**Response:** `200 OK`

---

#### GET `/ads/my-ads`
Obtenir ses propres annonces (nécessite authentification).

**Query params:**
- `page`: Numéro de page
- `limit`: Nombre par page

**Response:** `200 OK`

---

### Offers (Offres)

#### GET `/offers`
Lister ses offres (nécessite authentification).

**Query params:**
- `type`: "sent" (envoyées) ou "received" (reçues)
- `page`: Numéro de page
- `limit`: Nombre par page

**Response:** `200 OK`

---

#### POST `/offers`
Créer une offre (nécessite authentification).

**Body:**
```json
{
  "ad_id": "uuid",
  "price_offered": 750,
  "quantity": 5,
  "message": "Je suis intéressé par 5 unités"
}
```

**Response:** `201 Created`

---

#### GET `/offers/[id]`
Obtenir une offre par ID (nécessite authentification, buyer ou seller).

**Response:** `200 OK`

---

#### PATCH `/offers/[id]`
Accepter/refuser une offre (nécessite authentification).

**Body (vendeur accepte/refuse):**
```json
{
  "status": "accepted",
  "seller_response": "J'accepte votre offre"
}
```

**Body (acheteur annule):**
```json
{
  "status": "cancelled"
}
```

**Response:** `200 OK`
- Si acceptée, une commande est créée automatiquement

---

### Orders (Commandes)

#### GET `/orders`
Lister ses commandes (nécessite authentification).

**Query params:**
- `type`: "purchases" (achats) ou "sales" (ventes)
- `page`: Numéro de page
- `limit`: Nombre par page

**Response:** `200 OK`

---

#### GET `/orders/[id]`
Obtenir une commande par ID (nécessite authentification, buyer ou seller).

**Response:** `200 OK`

---

#### POST `/orders/[id]/confirm-delivery`
Confirmer la réception de la marchandise (nécessite authentification, buyer uniquement).

**Response:** `200 OK`
- Déclenche le transfert du paiement au vendeur

---

### Claims (Réclamations)

#### GET `/claims`
Lister ses réclamations (nécessite authentification).

**Response:** `200 OK`

---

#### POST `/claims`
Créer une réclamation (nécessite authentification).

**Body:**
```json
{
  "order_id": "uuid",
  "type": "product_damaged",
  "subject": "Produit endommagé",
  "description": "Le colis est arrivé endommagé...",
  "photos": ["url1", "url2"]
}
```

**Response:** `201 Created`

---

#### GET `/claims/[id]`
Obtenir une réclamation par ID (nécessite authentification).

**Response:** `200 OK`

---

### Favorites (Favoris)

#### GET `/favorites`
Lister ses favoris (nécessite authentification).

**Response:** `200 OK`

---

#### POST `/favorites`
Ajouter aux favoris (nécessite authentification).

**Body:**
```json
{
  "ad_id": "uuid"
}
```

**Response:** `201 Created`

---

#### DELETE `/favorites/[id]`
Retirer des favoris (nécessite authentification).
Note: [id] est l'ID de l'annonce.

**Response:** `200 OK`

---

### Notifications

#### GET `/notifications`
Lister ses notifications (nécessite authentification).

**Query params:**
- `unread`: "true" pour afficher uniquement les non lues
- `page`: Numéro de page
- `limit`: Nombre par page

**Response:** `200 OK`

---

#### PATCH `/notifications`
Marquer toutes les notifications comme lues (nécessite authentification).

**Response:** `200 OK`

---

#### PATCH `/notifications/[id]`
Marquer une notification comme lue (nécessite authentification).

**Response:** `200 OK`

---

#### DELETE `/notifications/[id]`
Supprimer une notification (nécessite authentification).

**Response:** `200 OK`

---

### Stripe

#### POST `/stripe/create-connect-account`
Créer un compte Stripe Connect pour devenir vendeur (nécessite authentification).

**Response:** `200 OK`
```json
{
  "message": "Compte Stripe Connect créé avec succès",
  "accountId": "acct_...",
  "onboardingUrl": "https://connect.stripe.com/..."
}
```

---

#### POST `/stripe/create-payment-intent`
Créer une intention de paiement pour une commande (nécessite authentification).

**Body:**
```json
{
  "order_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "message": "Intention de paiement créée",
  "clientSecret": "pi_...",
  "paymentIntentId": "pi_..."
}
```

---

#### POST `/stripe/webhook`
Webhook Stripe (pas d'auth requise, vérification par signature).

Gère les événements:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated`
- `transfer.created`

**Response:** `200 OK`

---

### Upload

#### POST `/upload/image`
Upload une image (nécessite authentification).

**Content-Type:** `multipart/form-data`

**Form data:**
- `file`: Fichier image (JPG, PNG, WebP, max 5MB)
- `type`: "ad" ou "profile"

**Response:** `200 OK`
```json
{
  "message": "Image uploadée avec succès",
  "url": "https://...",
  "path": "..."
}
```

---

#### POST `/upload/document`
Upload un document (nécessite authentification).

**Content-Type:** `multipart/form-data`

**Form data:**
- `file`: Fichier document (PDF, Excel, CSV, max 10MB)
- `type`: "listing" ou "document"

**Response:** `200 OK`
```json
{
  "message": "Document uploadé avec succès",
  "url": "https://...",
  "path": "..."
}
```

---

## Codes d'erreur

- `400` - Bad Request (données invalides)
- `401` - Unauthorized (non authentifié)
- `403` - Forbidden (non autorisé)
- `404` - Not Found (ressource introuvable)
- `405` - Method Not Allowed (méthode HTTP non autorisée)
- `500` - Internal Server Error (erreur serveur)

---

## Modèle de données

### User
- `is_only_buyer`: Acheteur exclusif
- `validated_by_alif`: Validé par admin
- `validated_by_stripe`: Compte Stripe validé
- `alif_status`: "Gold", "Normal", "Silver"

### Ad (Annonce)
- `type`: "Enchère" ou "Achat Direct"
- `merchandise_type`: Type de marchandise
- `category`: Catégorie du produit
- `is_sponsored`: Annonce sponsorisée
- `is_active`: Annonce active

### Offer
- `status`: "pending", "accepted", "rejected", "cancelled"

### Order
- `status`: "pending_payment", "payment_received", "processing", "shipped", "delivered", "completed", "cancelled", "refunded"
- `platform_fee`: Commission de la plateforme (5%)

### Payment
- `status`: "pending", "processing", "succeeded", "failed", "refunded"
- `transferred_to_seller`: Paiement transféré au vendeur

### Claim
- `type`: "product_damaged", "product_missing", "wrong_product", "quality_issue", "other"
- `status`: "open", "in_review", "resolved", "rejected", "closed"

---

## Flux de travail

### 1. Inscription et configuration
1. L'utilisateur s'inscrit via `/auth/register`
2. L'utilisateur se connecte via `/auth/login`
3. Si vendeur, création compte Stripe via `/stripe/create-connect-account`

### 2. Création d'annonce
1. Upload des photos via `/upload/image`
2. Upload du listing via `/upload/document`
3. Création de l'annonce via `/ads` (POST)

### 3. Processus d'offre et achat
1. Acheteur fait une offre via `/offers` (POST)
2. Vendeur accepte l'offre via `/offers/[id]` (PATCH)
3. Système crée automatiquement une commande
4. Acheteur paie via `/stripe/create-payment-intent`
5. Webhook Stripe confirme le paiement
6. Vendeur expédie la marchandise
7. Acheteur confirme la réception via `/orders/[id]/confirm-delivery`
8. Paiement transféré au vendeur

### 4. Réclamation (si nécessaire)
1. Upload des photos de preuve via `/upload/image`
2. Création de la réclamation via `/claims` (POST)
3. Gestion par l'équipe Alif (partie admin)

---

## Notes importantes

- Les annonces sont en soft delete (is_active = false)
- La commission plateforme est de 5%
- Les paiements passent par Alif avant d'être transférés au vendeur
- Le transfert au vendeur se fait après confirmation de réception
- Toutes les dates sont en format ISO 8601
- Les montants sont en euros (EUR)

---

## Support

Pour toute question technique, consultez la documentation Supabase et Stripe.
