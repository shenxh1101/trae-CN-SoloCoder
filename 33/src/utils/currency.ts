import { Settings } from '../types';

export const formatAmount = (amount: number, settings: Settings): string => {
  const { currency, exchangeRate } = settings;
  const displayAmount = currency === 'USD' ? amount / exchangeRate : amount;
  const symbol = currency === 'CNY' ? '¥' : '$';
  return `${symbol}${displayAmount.toFixed(2)}`;
};

export const convertToCNY = (amount: number, settings: Settings): number => {
  if (settings.currency === 'CNY') return amount;
  return amount * settings.exchangeRate;
};

export const convertFromCNY = (amount: number, settings: Settings): number => {
  if (settings.currency === 'CNY') return amount;
  return amount / settings.exchangeRate;
};

export const getCurrencySymbol = (currency: 'CNY' | 'USD'): string => {
  return currency === 'CNY' ? '¥' : '$';
};
