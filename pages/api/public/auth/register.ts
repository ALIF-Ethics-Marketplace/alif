import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { registerUserSchema, validateBody } from '@/lib/api/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Validate request body
    const validation = validateBody(registerUserSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { email, password, firstname, lastname, tel, is_only_buyer, company_name, company_type, siret, vat_number } = validation.data;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError?.message || 'Erreur lors de la création du compte' });
    }

    // Create user profile in public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        firstname,
        lastname,
        tel,
        is_only_buyer: is_only_buyer || false,
        company_name: company_name || null,
        company_type: company_type || null,
        siret: siret || null,
        vat_number: vat_number || null,
      })
      .select()
      .single();

    if (userError) {
      console.error('User profile error:', userError);
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Erreur lors de la création du profil' });
    }

    // Sign in the user to get a session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      return res.status(200).json({
        message: 'Compte créé avec succès. Veuillez vous connecter.',
        user: userData,
      });
    }

    return res.status(201).json({
      message: 'Compte créé avec succès',
      user: userData,
      session: sessionData.session,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
