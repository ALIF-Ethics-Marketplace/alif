## Documentation API Admin - Alif Marketplace

## Table des matières

1. [Introduction](#introduction)
2. [Authentification Admin](#authentification-admin)
3. [Rôles et Permissions](#rôles-et-permissions)
4. [Endpoints Admin](#endpoints-admin)
   - [Auth Admin](#auth-admin)
   - [Gestion des Admin Users](#gestion-des-admin-users)
   - [Gestion des Utilisateurs](#gestion-des-utilisateurs)
   - [Gestion des Annonces](#gestion-des-annonces)
   - [Gestion des Litiges](#gestion-des-litiges)
   - [Tableau de Bord](#tableau-de-bord)
   - [Gestion des Commissions](#gestion-des-commissions)

---

## Introduction

API REST pour la partie administration de la marketplace Alif. Permet de gérer les utilisateurs, valider les inscriptions, traiter les litiges, et configurer les commissions.

**Base URL**: `http://localhost:3000/api/admin`

**⚠️ IMPORTANT**:
- Compte admin par défaut créé lors de la migration
- Email: `admin@alif.com`
- Mot de passe: `AlifAdmin2024!`
- **CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT APRÈS LA PREMIÈRE CONNEXION**

---

## Authentification Admin

L'authentification admin utilise JWT (différent de l'auth utilisateurs Supabase).

### Header requis
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

Le token JWT expire après 8 heures.

---

## Rôles et Permissions

### Executif
- Tous les privilèges
- Peut créer/désactiver d'autres admins
- Peut supprimer définitivement des utilisateurs
- Seul rôle pouvant créer des admins "Executif"

### Admin
- Peut valider/refuser des utilisateurs
- Peut suspendre des utilisateurs
- Peut bloquer/supprimer des annonces
- Peut gérer les litiges
- Peut configurer les commissions

### Member
- Accès en lecture seule
- Peut consulter les informations
- Peut ajouter des commentaires aux litiges

---

## Endpoints Admin

### Auth Admin

#### POST `/admin/auth/login`
Connexion administrateur.

**Body:**
```json
{
  "email": "admin@alif.com",
  "password": "AlifAdmin2024!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "email": "admin@alif.com",
    "role": "Executif"
  }
}
```

---

#### GET `/admin/auth/me`
Obtenir les informations de l'admin connecté (nécessite auth).

**Response:** `200 OK`
```json
{
  "admin": {
    "id": "uuid",
    "email": "admin@alif.com",
    "role": "Executif"
  }
}
```

---

### Gestion des Admin Users

#### GET `/admin/admin-users`
Lister tous les administrateurs (nécessite auth).

**Response:** `200 OK`
```json
{
  "admins": [
    {
      "id": "uuid",
      "email": "admin@alif.com",
      "role": "Executif",
      "is_active": true,
      "last_login": "2024-01-30T10:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST `/admin/admin-users`
Créer un nouvel administrateur (Executif uniquement).

**Body:**
```json
{
  "email": "newadmin@alif.com",
  "password": "SecurePassword123",
  "role": "Admin"
}
```

**Response:** `201 Created`

---

#### PATCH `/admin/admin-users/[id]`
Activer/Désactiver un administrateur (Executif uniquement).

**Body:**
```json
{
  "is_active": false
}
```

**Response:** `200 OK`

---

#### GET `/admin/admin-users/[id]`
Obtenir l'historique d'activité d'un admin.

**Response:** `200 OK`
```json
{
  "activities": [
    {
      "id": "uuid",
      "action": "validate_user",
      "description": "Validation utilisateur: Validé",
      "target_type": "users",
      "target_id": "uuid",
      "created_at": "2024-01-30T10:00:00Z"
    }
  ]
}
```

---

### Gestion des Utilisateurs

#### GET `/admin/users`
Lister les utilisateurs de la plateforme.

**Query params:**
- `validation_status`: "Validé", "En Attente", "Refusé"
- `is_suspended`: "true" ou "false"
- `search`: Recherche par email, nom, prénom, entreprise
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre par page (défaut: 50)

**Response:** `200 OK`
```json
{
  "users": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

---

#### GET `/admin/users/[id]`
Obtenir les détails complets d'un utilisateur.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "validation_status": "En Attente",
    "identity_documents": ["url1", "url2"],
    "rib_document": "url",
    "additional_documents": ["url3"],
    "is_suspended": false,
    "validated_by_admin": {
      "id": "uuid",
      "email": "admin@alif.com"
    },
    ...
  }
}
```

---

#### POST `/admin/users/[id]/validate`
Valider, refuser ou mettre en attente un utilisateur.

**Body:**
```json
{
  "validation_status": "Validé",
  "reason": "Documents valides et vérifiés"
}
```

**Valeurs possibles pour `validation_status`:**
- "Validé"
- "Refusé"
- "En Attente"

**Response:** `200 OK`

---

#### POST `/admin/users/[id]/suspend`
Suspendre ou lever la suspension d'un utilisateur (Admin/Executif).

**Body:**
```json
{
  "is_suspended": true,
  "reason": "Activité suspecte détectée"
}
```

**Response:** `200 OK`

---

#### DELETE `/admin/users/[id]`
Supprimer un utilisateur (soft delete, Executif uniquement).

**Response:** `200 OK`

---

#### POST `/admin/users/[id]/toggle-publish`
Activer/Désactiver la capacité de publier des annonces.

**Body:**
```json
{
  "can_publish_ads": false
}
```

**Response:** `200 OK`

---

### Gestion des Annonces

#### POST `/admin/ads/[id]/block`
Bloquer, débloquer ou supprimer définitivement une annonce.

**Body (bloquer):**
```json
{
  "is_blocked": true,
  "reason": "Annonce non conforme aux CGU"
}
```

**Body (débloquer):**
```json
{
  "is_blocked": false
}
```

**Body (suppression définitive):**
```json
{
  "permanent_delete": true,
  "reason": "Contenu illégal"
}
```

**Response:** `200 OK`

---

### Gestion des Litiges

#### GET `/admin/claims`
Lister tous les litiges.

**Query params:**
- `claim_state`: "En instruction" ou "Cloturé"
- `is_urgent`: "true" pour les litiges urgents uniquement

**Response:** `200 OK`
```json
{
  "claims": [
    {
      "id": "uuid",
      "order": {
        "id": "uuid",
        "order_number": "ALIF-20240130-000001",
        "ad": {
          "id": "uuid",
          "title": "iPhone 14"
        }
      },
      "claimant": {
        "id": "uuid",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com"
      },
      "type": "product_damaged",
      "subject": "Produit endommagé",
      "description": "...",
      "claim_state": "En instruction",
      "is_urgent": true,
      "has_processing_fees": false,
      "created_by_admin": false,
      "assigned_to_admin": {
        "id": "uuid",
        "email": "admin@alif.com"
      },
      "created_at": "2024-01-30T10:00:00Z"
    }
  ]
}
```

---

#### POST `/admin/claims`
Créer un litige en tant qu'admin.

**Body:**
```json
{
  "user_id": "uuid",
  "ad_id": "uuid",
  "type": "product_damaged",
  "subject": "Problème de qualité",
  "description": "Description détaillée du problème",
  "is_urgent": false,
  "has_processing_fees": true
}
```

**Types possibles:**
- "product_damaged"
- "product_missing"
- "wrong_product"
- "quality_issue"
- "other"

**Response:** `201 Created`

---

#### POST `/admin/claims/[id]/close`
Clôturer un litige.

**Body:**
```json
{
  "closure_decision": "Remboursement accordé à l'acheteur. Frais de retour à la charge du vendeur."
}
```

**Response:** `200 OK`

---

#### POST `/admin/claims/[id]/reopen`
Réouvrir un litige clôturé.

**Response:** `200 OK`

Le litige est réassigné à l'admin qui le réouvre.

---

### Tableau de Bord

#### GET `/admin/dashboard/stats`
Obtenir les statistiques du tableau de bord.

**Response:** `200 OK`
```json
{
  "users": {
    "total": 1250,
    "validated": 980,
    "pending": 200,
    "rejected": 50,
    "suspended": 15,
    "deleted": 5
  },
  "ads": {
    "total": 5600,
    "active": 4200,
    "archived": 1200,
    "reported": 45,
    "auction": 2100,
    "directBuy": 3500
  },
  "revenue": {
    "today": 156.50,
    "week": 1245.80,
    "month": 5678.90,
    "year": 45230.50
  }
}
```

**Notes:**
- `revenue`: Commission de la plateforme (en euros)
- Les statistiques sont calculées en temps réel
- Possibilité d'ajouter un cache avec la table `daily_statistics`

---

### Gestion des Commissions

#### GET `/admin/commissions/custom`
Lister toutes les commissions personnalisées.

**Query params:**
- `user_id`: Filtrer par utilisateur

**Response:** `200 OK`
```json
{
  "commissions": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com"
      },
      "is_for_unsold": false,
      "commission_rate": 3.5,
      "number_of_publications": 10,
      "publications_used": 3,
      "valid_until": "2024-12-31",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST `/admin/commissions/custom`
Créer une commission personnalisée pour un utilisateur (Admin/Executif).

**Body:**
```json
{
  "user_id": "uuid",
  "is_for_unsold": false,
  "commission_rate": 3.5,
  "number_of_publications": 10,
  "valid_until": "2024-12-31"
}
```

**Champs:**
- `is_for_unsold`: true pour invendus, false pour non-invendus
- `commission_rate`: Taux en pourcentage (0-100)
- `number_of_publications`: Nombre d'annonces (optionnel, null = illimité)
- `valid_until`: Date de fin (optionnel, format YYYY-MM-DD)

**Response:** `201 Created`

---

#### GET `/admin/commissions/category`
Lister toutes les commissions par catégorie et zone.

**Response:** `200 OK`
```json
{
  "commissions": [
    {
      "id": "uuid",
      "category": "Alimentaire",
      "zone": "UE",
      "is_for_unsold": false,
      "commission_rate": 5.0,
      "is_active": true
    },
    ...
  ]
}
```

---

#### PUT `/admin/commissions/category`
Mettre à jour une commission par catégorie/zone (Admin/Executif).

**Body:**
```json
{
  "category": "Alimentaire",
  "zone": "UE",
  "is_for_unsold": false,
  "commission_rate": 4.5
}
```

**Catégories possibles:**
- "Alimentaire"
- "Mobilier-Electroménager"
- "Multimédia-Technologies"
- "Décor-Bazar"
- "Mode-Textile"
- "Beauté-Santé"
- "Sport-Loisirs"
- "Autre"

**Zones possibles:**
- "UE"
- "Hors-UE"

**Response:** `200 OK`

---

## Corrections Apportées

### Modèle User

- ❌ Supprimé: `validated_by_alif` (boolean)
- ✅ Ajouté: `validation_status` ("Validé", "En Attente", "Refusé")
- ✅ Ajouté: `user_validated_by` (référence à admin_users)
- ✅ Ajouté: `validation_date`
- ✅ Ajouté: `identity_documents` (array)
- ✅ Ajouté: `rib_document`
- ✅ Ajouté: `additional_documents` (array)
- ✅ Ajouté: `is_suspended`, `suspended_at`, `suspension_reason`, `suspended_by`
- ✅ Ajouté: `deleted_at`, `deleted_by`
- ✅ Ajouté: `can_publish_ads`

### Modèle Ad

- ✅ Ajouté: `is_archived`, `archived_at`
- ✅ Ajouté: `is_reported`, `reported_count`
- ✅ Ajouté: `is_blocked`, `blocked_at`, `blocked_by`, `block_reason`

### Modèle Claim

- ❌ Renommé: `status` → `claim_state` ("En instruction", "Cloturé")
- ✅ Ajouté: `is_urgent`
- ✅ Ajouté: `has_processing_fees`
- ✅ Ajouté: `created_by_admin`
- ✅ Ajouté: `assigned_to` (admin assigné)
- ✅ Ajouté: `closed_by`, `closure_decision`, `closed_at`
- ❌ Modifié: `resolved_by` → Supprimé (utilise `closed_by` à la place)

### Nouvelles Tables

- ✅ `admin_users`: Gestion des administrateurs
- ✅ `ad_reports`: Signalements d'annonces
- ✅ `claim_comments`: Commentaires sur les litiges
- ✅ `user_activity_logs`: Historique activité utilisateurs
- ✅ `admin_activity_logs`: Historique activité admins
- ✅ `custom_commissions`: Commissions personnalisées
- ✅ `category_commissions`: Commissions par catégorie/zone
- ✅ `daily_statistics`: Statistiques quotidiennes (cache)

---

## Système de Commissions

### Ordre de priorité

1. **Commission personnalisée** (si active et valide)
2. **Commission par catégorie/zone**
3. **Commission par défaut** (5%)

### Fonction SQL

```sql
SELECT get_applicable_commission(
  'user_id',
  'Alimentaire',
  'UE',
  false
); -- Retourne le taux applicable
```

---

## Logs d'Activité

Toutes les actions importantes des admins sont tracées dans `admin_activity_logs`:

- Validation/Refus d'utilisateurs
- Suspension/Suppression de comptes
- Blocage/Suppression d'annonces
- Création/Clôture de litiges
- Création de commissions

Exemple de log:
```json
{
  "admin_id": "uuid",
  "action": "validate_user",
  "target_type": "users",
  "target_id": "uuid",
  "description": "Validation utilisateur: Validé - Documents conformes",
  "metadata": {
    "validation_status": "Validé",
    "reason": "Documents conformes"
  },
  "ip_address": "192.168.1.1",
  "created_at": "2024-01-30T10:00:00Z"
}
```

---

## Sécurité

### JWT Admin
- Secret différent de celui des utilisateurs publics
- Expiration: 8 heures
- Stocké dans variable d'environnement `ADMIN_JWT_SECRET`

### Permissions par rôle
- Vérification du rôle sur chaque endpoint sensible
- Middleware `withAdminRole(['Executif', 'Admin'])`

### Row Level Security (RLS)
- Tables admin accessibles uniquement via service key
- Pas de RLS sur les tables admin (sécurité par API)

---

## Migration

Pour appliquer les corrections et créer la partie admin:

1. Exécutez d'abord: `supabase/migrations/001_initial_schema.sql`
2. Puis exécutez: `supabase/migrations/002_admin_and_corrections.sql`

Le compte admin par défaut sera créé automatiquement.

---

## Bonnes Pratiques

### Gestion des litiges
1. Toujours assigner un litige lors de sa création
2. Marquer les litiges urgents dès réception
3. Ajouter des commentaires détaillés
4. Fournir une décision claire lors de la clôture

### Validation des utilisateurs
1. Vérifier tous les documents fournis
2. Vérifier le SIRET/VAT pour les entreprises
3. Toujours fournir une raison en cas de refus
4. Envoyer une notification à l'utilisateur

### Commissions
1. Les commissions personnalisées ont priorité
2. Définir une date de fin pour les promotions
3. Limiter le nombre de publications si nécessaire
4. Vérifier régulièrement l'utilisation

---

## Support Technique

Pour toute question sur l'administration:
1. Consultez les logs d'activité
2. Vérifiez les variables d'environnement
3. Assurez-vous que les migrations sont appliquées
4. Vérifiez les permissions de l'admin connecté
