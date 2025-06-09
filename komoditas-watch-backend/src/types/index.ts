import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// User related types
export interface UserPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Price related types
export interface PriceFilter {
  commodityId?: string;
  regionId?: string;
  priceType?: string;
  startDate?: Date;
  endDate?: Date;
  source?: string;
}

export interface PriceData {
  commodityId: string;
  regionId: string;
  priceType: string;
  price: number;
  previousPrice?: number;
  priceChange?: number;
  currency: string;
  date: Date;
  source: string;
}

// Scraping related types
export interface ScrapingJob {
  id: string;
  source: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: any;
}

export interface ScrapingConfig {
  source: string;
  url: string;
  selector: string;
  fields: Array<{
    name: string;
    selector: string;
    type: 'text' | 'number' | 'date';
    transform?: (value: string) => any;
  }>;
  interval: number; // minutes
  timeout: number; // milliseconds
}

// Weather related types
export interface WeatherFilter {
  regionId?: string;
  weatherType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WeatherData {
  regionId: string;
  weatherType: string;
  value: number;
  unit: string;
  date: Date;
  source: string;
}

// Alert related types
export interface AlertFilter {
  type?: string;
  severity?: string;
  commodityId?: string;
  regionId?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface AlertData {
  title: string;
  message: string;
  type: string;
  severity: string;
  commodityId?: string;
  regionId?: string;
  data?: any;
}

// Prediction related types
export interface PredictionFilter {
  commodityId?: string;
  regionId?: string;
  startDate?: Date;
  endDate?: Date;
  algorithm?: string;
}

export interface PredictionData {
  commodityId: string;
  regionId?: string;
  predictedPrice: number;
  currentPrice: number;
  priceChange: number;
  confidence: number;
  predictionDate: Date;
  modelVersion: string;
  algorithm: string;
  features: any;
}

// Report related types
export interface ReportFilter {
  type?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ReportParams {
  title: string;
  description?: string;
  type: string;
  parameters: any;
}

// Data input related types
export interface DataInputFilter {
  commodityId?: string;
  regionId?: string;
  source?: string;
  isValidated?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface DataInputData {
  commodityId: string;
  regionId: string;
  priceData: any;
  source: string;
  notes?: string;
}

// External API response types
export interface BPSApiResponse {
  success: boolean;
  data: any[];
  meta?: any;
}

export interface BMKGApiResponse {
  data: any[];
  status: string;
}

export interface PanelHargaResponse {
  status: string;
  data: any[];
}

// Cache types
export interface CacheOptions {
  ttl?: number; // time to live in seconds
  key: string;
}

// File upload types
export interface FileUploadOptions {
  allowedTypes: string[];
  maxSize: number;
  uploadPath: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Database query types
export interface QueryOptions {
  include?: any;
  where?: any;
  orderBy?: any;
  skip?: number;
  take?: number;
}

// Health check types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: {
    database: boolean;
    redis: boolean;
    external_apis: boolean;
  };
  version: string;
  uptime: number;
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number;
  totalPriceEntries: number;
  totalAlerts: number;
  recentActivity: any[];
  topCommodities: any[];
  priceAverages: any[];
}

// Audit log types
export interface AuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export default {
  UserPayload,
  AuthenticatedRequest,
  ApiResponse,
  PaginationParams,
  PaginationResult,
  PriceFilter,
  PriceData,
  ScrapingJob,
  ScrapingConfig,
  WeatherFilter,
  WeatherData,
  AlertFilter,
  AlertData,
  PredictionFilter,
  PredictionData,
  ReportFilter,
  ReportParams,
  DataInputFilter,
  DataInputData,
  BPSApiResponse,
  BMKGApiResponse,
  PanelHargaResponse,
  CacheOptions,
  FileUploadOptions,
  ValidationError,
  ValidationResult,
  QueryOptions,
  HealthCheckResult,
  AnalyticsData,
  AuditLog,
};
