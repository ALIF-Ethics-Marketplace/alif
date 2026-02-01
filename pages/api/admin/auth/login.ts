import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import { JWT_SECRET } from '@/lib/api/admin-middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const validation = validateBody(loginSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { email, password } = validation.data;

    // Get admin user
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!admin.is_active) {
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Update last login
    await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log activity
    await supabaseAdmin.from('admin_activity_logs').insert({
      admin_id: admin.id,
      action: 'login',
      description: 'Connexion réussie',
      ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
    });

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
