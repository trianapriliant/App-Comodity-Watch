import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface AppConfig {
  app: {
    name: string;
    version: string;
    port: number;
    env: string;
    corsOrigin: string;
  };
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  api: {
    bps: {
      baseUrl: string;
      apiKey?: string;
    };
    bmkg: {
      baseUrl: string;
      apiKey?: string;
    };
    panelHarga: {
      baseUrl: string;
    };
    commodities: {
      apiKey?: string;
    };
  };
  scraping: {
    intervalMinutes: number;
    maxConcurrent: number;
    timeoutMs: number;
  };
  upload: {
    maxFileSizeMB: number;
    uploadPath: string;
  };
  rateLimit: {
    windowMinutes: number;
    maxRequests: number;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
  };
  swagger: {
    enabled: boolean;
    path: string;
  };
  logging: {
    level: string;
    file: string;
  };
}

const config: AppConfig = {
  app: {
    name: 'Komoditas Watch API',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/komoditas_watch',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  api: {
    bps: {
      baseUrl: process.env.BPS_BASE_URL || 'https://webapi.bps.go.id/v1',
      apiKey: process.env.BPS_API_KEY,
    },
    bmkg: {
      baseUrl: process.env.BMKG_BASE_URL || 'https://data.bmkg.go.id',
      apiKey: process.env.BMKG_API_KEY,
    },
    panelHarga: {
      baseUrl: process.env.PANEL_HARGA_BASE_URL || 'https://pihps.kemendag.go.id',
    },
    commodities: {
      apiKey: process.env.COMMODITIES_API_KEY,
    },
  },
  scraping: {
    intervalMinutes: parseInt(process.env.SCRAPING_INTERVAL_MINUTES || '60'),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '5'),
    timeoutMs: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000'),
  },
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
  },
  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASS || '',
    },
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || '/api/docs',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

export default config;
export { config };
