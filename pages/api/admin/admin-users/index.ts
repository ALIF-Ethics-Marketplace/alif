import { NextApiResponse } from 'next';
import {
  withAdminAuth,
  withAdminRole,
  AuthenticatedAdminRequest,
  combineAdminMiddleware,
  logAdminActivity,
} from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const createAdminSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.enum(['Executif', 'Admin', 'Member']),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    // GET - List all admin users
    if (req.method === 'GET') {
      const { data: admins, error } = await supabaseAdmin
        .from('admin_users')
        .select('id, email, role, is_active, last_login, created_at, created_by')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des administrateurs' });
      }

      return res.status(200).json({ admins });
    }

    // POST - Create new admin user (Executif only)
    if (req.method === 'POST') {
      const validation = validateBody(createAdminSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { email, password, role } = validation.data;

      // Check if email already exists
      const { data: existing } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create admin user
      const { data: newAdmin, error } = await supabaseAdmin
        .from('admin_users')
        .insert({
          email,
          password_hash: passwordHash,
          role,
          created_by: req.admin.id,
        })
        .select('id, email, role, is_active, created_at')
        .single();

      if (error) {
        console.error('Error creating admin:', error);
        return res.status(400).json({ error: 'Erreur lors de la création de l\'administrateur' });
      }

      await logAdminActivity(
        req.admin.id,
        'create_admin',
        `Création d'un administrateur ${role}: ${email}`,
        'admin_users',
        newAdmin.id
      );

      return res.status(201).json({
        message: 'Administrateur créé avec succès',
        admin: newAdmin,
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Admin users endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Only Executif can create admins, but all can view
export default function (req: any, res: NextApiResponse) {
  if (req.method === 'POST') {
    return combineAdminMiddleware(
      withAdminAuth,
      withAdminRole(['Executif'])
    )(handler)(req, res);
  }
  return withAdminAuth(handler)(req, res);
}
