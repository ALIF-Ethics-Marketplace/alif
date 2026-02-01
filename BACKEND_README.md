# Alif Marketplace - Backend

Backend complet pour la marketplace Alif développé avec Next.js, Supabase et Stripe Connect.

## Fonctionnalités

### Authentification
- Inscription et connexion utilisateurs
- Gestion de profil utilisateur
- JWT tokens via Supabase Auth
- Séparation acheteurs/vendeurs

### Gestion des annonces
- Création, modification, suppression d'annonces
- Recherche et filtrage avancés
- Upload de photos et documents
- Support enchères et achat direct
- Catégorisation des produits

### Système d'offres
- Création d'offres par les acheteurs
- Acceptation/refus par les vendeurs
- Création automatique de commandes
- Notifications en temps réel

### Gestion des commandes
- Suivi complet du processus de commande
- Statuts: paiement, préparation, expédition, livraison
- Confirmation de réception par l'acheteur
- Système de réclamations

### Paiements (Stripe Connect)
- Intégration Stripe Connect
- Onboarding vendeurs
- Paiements sécurisés
- Commission plateforme (5%)
- Transfert automatique aux vendeurs
- Gestion des webhooks

### Stockage
- Upload de fichiers via Supabase Storage
- Support images (JPG, PNG, WebP)
- Support documents (PDF, Excel, CSV)
- Validation de taille et type

## Structure du projet

```
alif-g-2/
├── lib/
│   ├── api/
│   │   ├── middleware.ts      # Middlewares auth et validation
│   │   └── validation.ts      # Schémas Zod de validation
│   ├── supabase/
│   │   ├── client.ts          # Client Supabase (côté client)
│   │   └── server.ts          # Client Supabase admin (côté serveur)
│   ├── stripe/
│   │   └── client.ts          # Configuration Stripe
│   └── upload/
│       └── storage.ts         # Utilitaires upload fichiers
├── pages/api/public/
│   ├── auth/                  # Authentification
│   │   ├── register.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── me.ts
│   ├── users/                 # Gestion utilisateurs
│   │   ├── profile.ts
│   │   └── [id].ts
│   ├── ads/                   # Gestion annonces
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── my-ads.ts
│   ├── offers/                # Gestion offres
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── orders/                # Gestion commandes
│   │   ├── index.ts
│   │   ├── [id].ts
│   │   └── [id]/confirm-delivery.ts
│   ├── claims/                # Réclamations
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── favorites/             # Favoris
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── notifications/         # Notifications
│   │   ├── index.ts
│   │   └── [id].ts
│   ├── stripe/                # Intégration Stripe
│   │   ├── create-connect-account.ts
│   │   ├── create-payment-intent.ts
│   │   └── webhook.ts
│   └── upload/                # Upload fichiers
│       ├── image.ts
│       └── document.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── types/
│   └── database.ts            # Types TypeScript pour la DB
├── .env.local.example
├── API_DOCUMENTATION.md
└── BACKEND_README.md
```

## Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)

2. Exécutez la migration SQL:
   - Allez dans SQL Editor
   - Copiez le contenu de `supabase/migrations/001_initial_schema.sql`
   - Exécutez le script

3. Créez les buckets de stockage dans Storage:
   - `profile-pictures` (public)
   - `ad-photos` (public)
   - `ad-listings` (public)
   - `ad-documents` (public)
   - `claim-photos` (private)

4. Récupérez vos clés API:
   - Project URL
   - Anon key (public)
   - Service role key (secret)

### 3. Configuration Stripe

1. Créez un compte sur [stripe.com](https://stripe.com)

2. Activez Stripe Connect:
   - Allez dans Connect > Settings
   - Configurez votre plateforme

3. Récupérez vos clés:
   - Publishable key
   - Secret key

4. Configurez les webhooks:
   - URL: `https://votre-domaine.com/api/public/stripe/webhook`
   - Événements à écouter:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `transfer.created`
   - Récupérez le webhook secret

### 4. Variables d'environnement

Créez un fichier `.env.local` à la racine:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Démarrage

### Développement

```bash
npm run dev
```

L'API sera accessible sur `http://localhost:3000/api/public`

### Production

```bash
npm run build
npm start
```

## Tests avec des outils

### Postman / Insomnia

1. Importez la collection d'endpoints
2. Créez un environnement avec:
   - `baseUrl`: http://localhost:3000/api/public
   - `token`: (sera rempli après login)

### Exemple de workflow

```bash
# 1. Inscription
POST /api/public/auth/register
{
  "email": "john@example.com",
  "password": "password123",
  "firstname": "John",
  "lastname": "Doe",
  "tel": "0612345678"
}

# 2. Connexion
POST /api/public/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
# Récupérez le access_token

# 3. Créer une annonce (avec token)
POST /api/public/ads
Authorization: Bearer YOUR_TOKEN
{
  "title": "iPhone 14",
  "type": "Achat Direct",
  "merchandise_type": "Référence Unique",
  "unit_price": 800,
  "total_price": 8000,
  "unit_quantity": 1,
  "total_quantity": 10,
  "category": "Multimédia-Technologies"
}
```

## Webhooks Stripe en développement

Pour tester les webhooks Stripe en local:

```bash
# Installer Stripe CLI
# Windows (avec Scoop)
scoop install stripe

# Ou télécharger depuis https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Écouter les webhooks
stripe listen --forward-to localhost:3000/api/public/stripe/webhook

# Récupérez le webhook secret affiché et ajoutez-le à .env.local
```

## Sécurité

### Authentification
- Tous les endpoints sensibles nécessitent un JWT valide
- Les tokens expirent après 1 heure
- Refresh tokens disponibles pour renouvellement

### Autorisations
- Row Level Security (RLS) activé sur Supabase
- Vérifications côté API pour double sécurité
- Les utilisateurs ne peuvent modifier que leurs propres ressources

### Validation
- Validation Zod sur tous les inputs
- Sanitization des données
- Limites de taille de fichiers

### Paiements
- Intégration Stripe certifiée PCI
- Webhooks signés
- Pas de stockage de données bancaires

## API Documentation

Consultez [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour la documentation complète des endpoints.

## Modèle de données

### Tables principales

- **users**: Profils utilisateurs étendus
- **ads**: Annonces de produits
- **offers**: Offres d'achat
- **orders**: Commandes créées après acceptation d'offre
- **payments**: Transactions Stripe
- **deliveries**: Suivi de livraison
- **claims**: Réclamations
- **favorites**: Favoris utilisateur
- **notifications**: Notifications système

### Relations

```
User ──< Ads (author)
     ──< Offers (buyer/seller)
     ──< Orders (buyer/seller)
     ──< Claims (claimant)
     ──< Favorites
     ──< Notifications

Ad ──< Offers
   ──< Orders

Offer ──< Orders

Order ──< Payments
      ──< Deliveries
      ──< Claims
```

## Flux métier

### Processus de vente

1. **Vendeur** crée une annonce
2. **Acheteur** fait une offre
3. **Vendeur** accepte l'offre → Création automatique de la commande
4. **Acheteur** paie via Stripe → Fonds retenus par la plateforme
5. **Vendeur** expédie la marchandise
6. **Acheteur** confirme la réception → Transfert des fonds au vendeur
7. Si problème → **Acheteur** ouvre une réclamation

### Commission plateforme

- 5% sur chaque transaction
- Calculée automatiquement lors de la création de commande
- Prélevée par Stripe via application_fee_amount

## Prochaines étapes (Partie Admin)

La partie administration permettra de:
- Valider les utilisateurs et vendeurs
- Gérer les réclamations
- Voir les statistiques
- Modérer les annonces
- Gérer les catégories et paramètres

## Support

Pour toute question:
1. Consultez la documentation API
2. Vérifiez les logs Supabase
3. Consultez le dashboard Stripe
4. Vérifiez les variables d'environnement

## Licence

Propriétaire - Alif Marketplace
