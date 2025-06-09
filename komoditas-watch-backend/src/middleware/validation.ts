import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createApiResponse } from '../utils';
import { ValidationError } from '../types';

/**
 * Generic validation middleware
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json(
        createApiResponse(false, 'Data tidak valid', undefined, undefined, errors)
      );
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json(
        createApiResponse(false, 'Parameter query tidak valid', undefined, undefined, errors)
      );
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json(
        createApiResponse(false, 'Parameter URL tidak valid', undefined, undefined, errors)
      );
      return;
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  phone: Joi.string().pattern(/^(\+62|62|0)([1-9])([0-9]{6,11})$/).required(),
  date: Joi.date().iso().required(),
  optionalDate: Joi.date().iso().optional(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    orderBy: Joi.string().default('createdAt'),
    orderDirection: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: commonSchemas.password,
    fullName: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('ADMIN', 'REGULATOR', 'DISTRIBUTOR', 'PETANI', 'CONSUMER').required(),
    phone: commonSchemas.phone.optional(),
    address: Joi.string().max(500).optional(),
    regionId: Joi.string().uuid().optional(),
    organization: Joi.string().max(100).optional(),
    position: Joi.string().max(100).optional(),
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100).optional(),
    phone: commonSchemas.phone.optional(),
    address: Joi.string().max(500).optional(),
    regionId: Joi.string().uuid().optional(),
    organization: Joi.string().max(100).optional(),
    position: Joi.string().max(100).optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),
};

// Price validation schemas
export const priceSchemas = {
  create: Joi.object({
    commodityId: Joi.string().uuid().required(),
    regionId: Joi.string().uuid().required(),
    priceType: Joi.string().valid('KONSUMEN', 'PRODUSEN', 'WHOLESALE', 'RETAIL').required(),
    price: Joi.number().positive().required(),
    previousPrice: Joi.number().positive().optional(),
    currency: Joi.string().length(3).default('IDR'),
    date: commonSchemas.date,
    source: Joi.string().max(50).required(),
  }),

  update: Joi.object({
    price: Joi.number().positive().optional(),
    previousPrice: Joi.number().positive().optional(),
    currency: Joi.string().length(3).optional(),
    date: commonSchemas.optionalDate,
    source: Joi.string().max(50).optional(),
    isValidated: Joi.boolean().optional(),
  }),

  filter: Joi.object({
    commodityId: Joi.string().uuid().optional(),
    regionId: Joi.string().uuid().optional(),
    priceType: Joi.string().valid('KONSUMEN', 'PRODUSEN', 'WHOLESALE', 'RETAIL').optional(),
    startDate: commonSchemas.optionalDate,
    endDate: commonSchemas.optionalDate,
    source: Joi.string().max(50).optional(),
    ...commonSchemas.pagination,
  }),
};

// Commodity validation schemas
export const commoditySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid(
      'BERAS', 'JAGUNG', 'KEDELAI', 'GULA_PASIR', 'MINYAK_GORENG',
      'DAGING_SAPI', 'DAGING_AYAM', 'TELUR_AYAM', 'CABAI_MERAH',
      'BAWANG_MERAH', 'BAWANG_PUTIH', 'TOMAT'
    ).required(),
    code: Joi.string().alphanum().max(20).required(),
    unit: Joi.string().max(20).required(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().max(50).required(),
    isStrategic: Joi.boolean().default(false),
    imageUrl: Joi.string().uri().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    unit: Joi.string().max(20).optional(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().max(50).optional(),
    isStrategic: Joi.boolean().optional(),
    imageUrl: Joi.string().uri().optional(),
  }),
};

// Alert validation schemas
export const alertSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    message: Joi.string().min(10).max(1000).required(),
    type: Joi.string().valid('PRICE_SURGE', 'PRICE_DROP', 'SUPPLY_SHORTAGE', 'WEATHER_ALERT', 'MARKET_ANOMALY').required(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
    commodityId: Joi.string().uuid().optional(),
    regionId: Joi.string().uuid().optional(),
    data: Joi.object().optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    message: Joi.string().min(10).max(1000).optional(),
    isActive: Joi.boolean().optional(),
    isResolved: Joi.boolean().optional(),
  }),

  filter: Joi.object({
    type: Joi.string().valid('PRICE_SURGE', 'PRICE_DROP', 'SUPPLY_SHORTAGE', 'WEATHER_ALERT', 'MARKET_ANOMALY').optional(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
    commodityId: Joi.string().uuid().optional(),
    regionId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    startDate: commonSchemas.optionalDate,
    endDate: commonSchemas.optionalDate,
    ...commonSchemas.pagination,
  }),
};

// Data input validation schemas
export const dataInputSchemas = {
  create: Joi.object({
    commodityId: Joi.string().uuid().required(),
    regionId: Joi.string().uuid().required(),
    priceData: Joi.object().required(),
    source: Joi.string().max(50).default('MANUAL'),
    notes: Joi.string().max(500).optional(),
  }),

  validate: Joi.object({
    isValidated: Joi.boolean().required(),
    notes: Joi.string().max(500).optional(),
  }),

  filter: Joi.object({
    commodityId: Joi.string().uuid().optional(),
    regionId: Joi.string().uuid().optional(),
    source: Joi.string().max(50).optional(),
    isValidated: Joi.boolean().optional(),
    startDate: commonSchemas.optionalDate,
    endDate: commonSchemas.optionalDate,
    ...commonSchemas.pagination,
  }),
};

// Report validation schemas
export const reportSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM').required(),
    parameters: Joi.object().required(),
  }),

  filter: Joi.object({
    type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM').optional(),
    status: Joi.string().valid('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED').optional(),
    startDate: commonSchemas.optionalDate,
    endDate: commonSchemas.optionalDate,
    ...commonSchemas.pagination,
  }),
};

// Weather validation schemas
export const weatherSchemas = {
  create: Joi.object({
    regionId: Joi.string().uuid().required(),
    weatherType: Joi.string().valid('TEMPERATURE', 'HUMIDITY', 'RAINFALL', 'WIND_SPEED', 'PRESSURE').required(),
    value: Joi.number().required(),
    unit: Joi.string().max(20).required(),
    date: commonSchemas.date,
    source: Joi.string().max(50).default('BMKG'),
  }),

  filter: Joi.object({
    regionId: Joi.string().uuid().optional(),
    weatherType: Joi.string().valid('TEMPERATURE', 'HUMIDITY', 'RAINFALL', 'WIND_SPEED', 'PRESSURE').optional(),
    startDate: commonSchemas.optionalDate,
    endDate: commonSchemas.optionalDate,
    ...commonSchemas.pagination,
  }),
};

export default {
  validate,
  validateQuery,
  validateParams,
  commonSchemas,
  userSchemas,
  priceSchemas,
  commoditySchemas,
  alertSchemas,
  dataInputSchemas,
  reportSchemas,
  weatherSchemas,
};
