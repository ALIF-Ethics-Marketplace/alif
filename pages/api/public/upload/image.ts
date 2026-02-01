import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import formidable from 'formidable';
import fs from 'fs';
import {
  uploadFile,
  STORAGE_BUCKETS,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  validateFileType,
  validateFileSize,
  generateUniqueFileName,
} from '@/lib/upload/storage';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const form = formidable({
      maxFileSize: MAX_IMAGE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    const type = fields.type?.[0] || 'ad'; // 'ad' or 'profile'

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Validate file type
    if (!validateFileType(file.mimetype || '', ALLOWED_IMAGE_TYPES)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.' });
    }

    // Validate file size
    if (!validateFileSize(file.size, MAX_IMAGE_SIZE)) {
      return res.status(400).json({ error: 'Fichier trop volumineux. Taille maximale: 5MB.' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate unique filename
    const fileName = generateUniqueFileName(req.user.id, file.originalFilename || 'image.jpg');

    // Select bucket based on type
    const bucket = type === 'profile' ? STORAGE_BUCKETS.PROFILE_PICTURES : STORAGE_BUCKETS.AD_PHOTOS;

    // Upload to Supabase Storage
    const result = await uploadFile(bucket, fileName, fileBuffer, file.mimetype || undefined);

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    if ('error' in result) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Image uploadée avec succès',
      url: result.url,
      path: result.path,
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'upload' });
  }
}

export default withAuth(handler);
