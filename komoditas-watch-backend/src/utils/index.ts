import crypto from 'crypto';
import { ApiResponse, ValidationError, PaginationParams } from '../types';

/**
 * Generate a standard API response
 */
export const createApiResponse = <T>(
  success: boolean,
  message: string,
  data?: T,
  meta?: any,
  errors?: ValidationError[]
): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    success,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
};

/**
 * Generate pagination metadata
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse pagination parameters from query
 */
export const parsePaginationParams = (query: any): PaginationParams => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const orderBy = query.orderBy || 'createdAt';
  const orderDirection = query.orderDirection === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    orderBy,
    orderDirection,
  };
};

/**
 * Calculate offset for database queries
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Hash password or sensitive data
 */
export const hashData = (data: string, salt?: string): string => {
  const saltToUse = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha512');
  return `${saltToUse}:${hash.toString('hex')}`;
};

/**
 * Verify hashed data
 */
export const verifyHashedData = (data: string, hashedData: string): boolean => {
  const [salt, originalHash] = hashedData.split(':');
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
  return originalHash === hash.toString('hex');
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Indonesia)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+62|62|0)([1-9])([0-9]{6,11})$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Format date to ISO string
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString();
};

/**
 * Format date to Indonesia locale
 */
export const formatDateToIndonesia = (date: Date): string => {
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (
  oldValue: number,
  newValue: number
): number => {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Round number to specified decimal places
 */
export const roundToDecimal = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Format currency to Indonesian Rupiah
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Clean and parse number from string
 */
export const parseNumber = (value: string): number | null => {
  if (!value) return null;
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[Rp\s,\.]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
};

/**
 * Validate and sanitize commodity code
 */
export const sanitizeCommodityCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9_]/g, '');
};

/**
 * Generate cache key
 */
export const generateCacheKey = (...parts: string[]): string => {
  return parts.join(':').toLowerCase();
};

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }

      const delayMs = baseDelay * Math.pow(2, i);
      await delay(delayMs);
    }
  }

  throw lastError!;
};

/**
 * Check if value is empty
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined and null values from object
 */
export const removeNullUndefined = (obj: any): any => {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * Validate Indonesian region code
 */
export const isValidRegionCode = (code: string): boolean => {
  // Basic validation for Indonesian region codes
  const regionCodeRegex = /^[0-9]{2}(\.[0-9]{2})?(\.[0-9]{2})?$/;
  return regionCodeRegex.test(code);
};

/**
 * Extract domain from URL
 */
export const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

/**
 * Generate slug from string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Convert bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default {
  createApiResponse,
  createPaginationMeta,
  parsePaginationParams,
  calculateOffset,
  generateRandomString,
  generateUUID,
  hashData,
  verifyHashedData,
  sanitizeString,
  isValidEmail,
  isValidPhoneNumber,
  parseDate,
  formatDateToISO,
  formatDateToIndonesia,
  calculatePercentageChange,
  roundToDecimal,
  formatCurrency,
  parseNumber,
  sanitizeCommodityCode,
  generateCacheKey,
  delay,
  retryWithBackoff,
  isEmpty,
  deepClone,
  removeNullUndefined,
  isValidRegionCode,
  extractDomain,
  generateSlug,
  formatBytes,
};
