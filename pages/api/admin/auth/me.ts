import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest } from '@/lib/api/admin-middleware';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  return res.status(200).json({ admin: req.admin });
}

export default withAdminAuth(handler);
