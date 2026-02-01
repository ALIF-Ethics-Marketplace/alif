import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import jwt from 'jsonwebtoken';

export interface AuthenticatedAdminRequest extends NextApiRequest {
  admin: {
    id: string;
    email: string;
    role: 'Executif' | 'Admin' | 'Member';
  };
}

export type AdminApiHandler = (
  req: AuthenticatedAdminRequest,
  res: NextApiResponse
) => Promise<void> | void;

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-admin-jwt-secret-change-me';

export function withAdminAuth(handler: AdminApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé - Token manquant' });
      }

      const token = authHeader.substring(7);

      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({ error: 'Non autorisé - Token invalide ou expiré' });
      }

      // Verify admin still exists and is active
      const { data: admin, error } = await supabaseAdmin
        .from('admin_users')
        .select('id, email, role, is_active')
        .eq('id', decoded.id)
        .single();

      if (error || !admin || !admin.is_active) {
        return res.status(401).json({ error: 'Non autorisé - Compte admin invalide ou désactivé' });
      }

      (req as AuthenticatedAdminRequest).admin = {
        id: admin.id,
        email: admin.email,
        role: admin.role as 'Executif' | 'Admin' | 'Member',
      };

      return handler(req as AuthenticatedAdminRequest, res);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
}

export function withAdminRole(allowedRoles: Array<'Executif' | 'Admin' | 'Member'>) {
  return (handler: AdminApiHandler) => {
    return async (req: AuthenticatedAdminRequest, res: NextApiResponse) => {
      if (!allowedRoles.includes(req.admin.role)) {
        return res.status(403).json({ error: 'Accès refusé - Rôle insuffisant' });
      }
      return handler(req, res);
    };
  };
}

export function combineAdminMiddleware(...middlewares: any[]) {
  return middlewares.reduce((acc, middleware) => middleware(acc));
}

// Helper to log admin activity
export async function logAdminActivity(
  adminId: string,
  action: string,
  description: string,
  targetType?: string,
  targetId?: string,
  metadata?: any,
  ipAddress?: string
) {
  try {
    await supabaseAdmin.from('admin_activity_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      description,
      metadata,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

export { JWT_SECRET };
