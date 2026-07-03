const getDefaultApiUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return 'https://meeting-copilot-backend-5okc.onrender.com';
};

const rawApiUrl = import.meta.env.VITE_API_URL || getDefaultApiUrl();

const getFormattedApiUrl = (url: string) => {
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    // If the URL has no dot (missing top-level domain suffix like .com), append .onrender.com
    if (!cleaned.includes('.') && cleaned !== 'localhost' && cleaned !== '127.0.0.1') {
      cleaned = `${cleaned}.onrender.com`;
    }
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

export const API_URL = getFormattedApiUrl(rawApiUrl);

export const getResolvedVideoUrl = (url: string | null | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://localhost:5000')) {
    return url.replace('http://localhost:5000', API_URL);
  }
  return url;
};

export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Response not OK');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed, falling back to window.open', error);
    window.open(url, '_blank');
  }
};
