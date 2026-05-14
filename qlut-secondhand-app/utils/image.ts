import { IMAGE_BASE_URL } from '../config';

export const DEFAULT_ITEM_COVER = '/static/empty.png';

export const parseImages = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof raw !== 'string') return [];

  const text = raw.trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim().replace(/"/g, '')).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  return [text.replace(/"/g, '')].filter(Boolean);
};

export const formatImageUrl = (url?: string): string => {
  const normalized = String(url || '').trim().replace(/"/g, '');
  if (!normalized) return DEFAULT_ITEM_COVER;
  if (normalized.startsWith('http')) return normalized;
  if (normalized.startsWith('/static/')) return normalized;
  if (normalized.startsWith('/')) return `${IMAGE_BASE_URL}${normalized}`;
  return `${IMAGE_BASE_URL}/${normalized}`;
};

export const getFirstImageUrl = (raw: unknown): string => {
  return formatImageUrl(parseImages(raw)[0]);
};
