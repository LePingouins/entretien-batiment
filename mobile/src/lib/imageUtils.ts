import * as ImageManipulator from 'expo-image-manipulator';
import type { PickedFile } from './api';

function looksLikeHeic(uri: string, mimeType?: string | null): boolean {
  const lower = `${uri} ${mimeType ?? ''}`.toLowerCase();
  return lower.includes('heic') || lower.includes('heif');
}

/**
 * Re-encodes HEIC/HEIF photos (default iOS camera format) to JPEG so they
 * display correctly on Android and in the web browser, which cannot decode HEIC.
 * Non-HEIC images are returned unchanged.
 */
export async function normalizePhotoForUpload(file: PickedFile): Promise<PickedFile> {
  if (!looksLikeHeic(file.uri, file.mimeType)) return file;
  try {
    const result = await ImageManipulator.manipulateAsync(file.uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.85,
    });
    const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return { uri: result.uri, name: name.endsWith('.jpg') ? name : `${name}.jpg`, mimeType: 'image/jpeg' };
  } catch {
    // Best-effort — fall back to the original file if conversion fails.
    return file;
  }
}
