import { supabaseAdmin } from '@/lib/supabase/server';

export const STORAGE_BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  AD_PHOTOS: 'ad-photos',
  AD_LISTINGS: 'ad-listings',
  AD_DOCUMENTS: 'ad-documents',
  CLAIM_PHOTOS: 'claim-photos',
};

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | File | Blob,
  contentType?: string
): Promise<{ url: string; path: string } | { error: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return { error: error.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { error: error.message || 'Erreur lors de l\'upload' };
  }
}

export async function deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message || 'Erreur lors de la suppression' };
  }
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateUniqueFileName(userId: string, originalFilename: string): string {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${userId}/${timestamp}-${random}.${ext}`;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFileType(contentType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(contentType);
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}
