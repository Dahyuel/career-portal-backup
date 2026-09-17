// Images and videos for an event's landing page. They live in their own public
// bucket ("event-media"); only super admins can upload, everyone can view.
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export const EVENT_MEDIA_BUCKET = 'event-media';

// No SVG on purpose: SVG files can contain scripts.
export const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];

const MAX_MB: Record<'image' | 'video', number> = { image: 8, video: 50 };

export type MediaKind = 'image' | 'video';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

export const uploadEventMedia = async (eventId: string, kind: MediaKind, file: File): Promise<UploadResult> => {
  const allowed = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
  if (!allowed.includes(file.type)) {
    return {
      url: null,
      error: kind === 'image'
        ? 'Please choose an image (JPG, PNG, WebP or GIF).'
        : 'Please choose a video file (MP4 or WebM).'
    };
  }
  if (file.size > MAX_MB[kind] * 1024 * 1024) {
    return { url: null, error: `The file must be under ${MAX_MB[kind]} MB.` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return { url: null, error: 'The file needs a name with an extension.' };

  const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 40) || kind;
  const path = `${eventId}/${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(EVENT_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type
  });

  if (error) {
    logger.error('[EVENT MEDIA] upload failed', error);
    return {
      url: null,
      error: /bucket/i.test(error.message)
        ? 'The media storage is not set up yet. Run the v2_03 SQL file first.'
        : 'The file could not be uploaded. Please try again.'
    };
  }

  const { data } = supabase.storage.from(EVENT_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
};

export const MAX_UPLOAD_MB = MAX_MB;
