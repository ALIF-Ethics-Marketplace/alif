import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import formidable from 'formidable';
import fs from 'fs';
import {
  uploadFile,
  STORAGE_BUCKETS,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
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
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    const type = fields.type?.[0] || 'document'; // 'listing' or 'document'

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Validate file type
    if (!validateFileType(file.mimetype || '', ALLOWED_DOCUMENT_TYPES)) {
      return res.status(400).json({ error: 'Type de fichier non autorisé. Utilisez PDF, Excel ou CSV.' });
    }

    // Validate file size
    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return res.status(400).json({ error: 'Fichier trop volumineux. Taille maximale: 10MB.' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate unique filename
    const fileName = generateUniqueFileName(req.user.id, file.originalFilename || 'document.pdf');

    // Select bucket based on type
    const bucket = type === 'listing' ? STORAGE_BUCKETS.AD_LISTINGS : STORAGE_BUCKETS.AD_DOCUMENTS;

    // Upload to Supabase Storage
    const result = await uploadFile(bucket, fileName, fileBuffer, file.mimetype || undefined);

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    if ('error' in result) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Document uploadé avec succès',
      url: result.url,
      path: result.path,
    });
  } catch (error: any) {
    console.error('Upload document error:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'upload' });
  }
}

export default withAuth(handler);
