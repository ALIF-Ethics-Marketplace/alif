import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase/client';
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!data.session) {
      return res.status(401).json({ error: 'Impossible de créer une session' });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    return res.status(200).json({
      message: 'Connexion réussie',
      session: data.session,
      user: userProfile || data.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
