import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase/client';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
  };
}

export type ApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

export function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Non autorisé - Token manquant' });
      }

      const token = authHeader.substring(7);

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Non autorisé - Token invalide' });
      }

      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email!,
      };

      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
}

export function withMethods(allowedMethods: string[]) {
  return (handler: ApiHandler) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!allowedMethods.includes(req.method!)) {
        return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
      }
      return handler(req, res);
    };
  };
}

export function combineMiddleware(...middlewares: any[]) {
  return middlewares.reduce((acc, middleware) => middleware(acc));
}
