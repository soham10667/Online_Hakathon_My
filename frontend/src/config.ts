const rawApiUrl = import.meta.env.VITE_API_URL || 'https://online-hakathon-c5cv.onrender.com';

const getFormattedApiUrl = (url: string) => {
  let cleaned = url.trim();
  // Strip trailing slash if present
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

export const API_URL = getFormattedApiUrl(rawApiUrl);
