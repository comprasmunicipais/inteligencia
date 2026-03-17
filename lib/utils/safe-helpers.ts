/**
 * Safe helpers for handling optional fields and formatting
 */

export const safeText = (text: string | null | undefined, fallback: string = '-') => {
  return text && text.trim() !== '' ? text : fallback;
};

export const safeNumber = (num: number | null | undefined, fallback: number = 0) => {
  return typeof num === 'number' ? num : fallback;
};

export const safeDate = (date: string | null | undefined, fallback: string = '') => {
  if (!date) return fallback;
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
};

export const formatCurrency = (value: number | null | undefined) => {
  const amount = safeNumber(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const safeLink = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};
