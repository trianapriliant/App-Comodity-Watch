import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './config/database';
import { redis } from './config/redis';
import { logger, morganStream } from './config/logger';
import config from './config';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import commodityRoutes from './routes/commodities';
import priceRoutes from './routes/prices';
import regionRoutes from './routes/regions';
import weatherRoutes from './routes/weather';
import alertRoutes from './routes/alerts';
import predictionRoutes from './routes/predictions';
import reportRoutes from './routes/reports';
import dataInputRoutes from './routes/dataInput';
import scraperRoutes from './routes/scrapers';
import healthRoutes from './routes/health';

// Import scraper manager
import ScraperManager from './scrapers/ScraperManager';

class Application {
  public app: express.Application;
  private scraperManager: ScraperManager;

  constructor() {
    this.app = express();
    this.scraperManager = ScraperManager.getInstance();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.app.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', { stream: morganStream }));

    // Rate limiting
    this.app.use('/api', generalRateLimit);

    // Request context
    this.app.use((req, res, next) => {
      req.requestId = crypto.randomUUID();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    const apiRouter = express.Router();

    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/commodities', commodityRoutes);
    apiRouter.use('/prices', priceRoutes);
    apiRouter.use('/regions', regionRoutes);
    apiRouter.use('/weather', weatherRoutes);
    apiRouter.use('/alerts', alertRoutes);
    apiRouter.use('/predictions', predictionRoutes);
    apiRouter.use('/reports', reportRoutes);
    apiRouter.use('/data-input', dataInputRoutes);
    apiRouter.use('/scrapers', scraperRoutes);
    apiRouter.use('/health', healthRoutes);

    this.app.use('/api/v1', apiRouter);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Komoditas Watch API Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        documentation: config.swagger.enabled ? `${req.protocol}://${req.get('host')}/api/docs` : null,
      });
    });
  }

  private initializeSwagger(): void {
    if (!config.swagger.enabled) {
      return;
    }

    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Komoditas Watch API',
          version: '1.0.0',
          description: 'API untuk Platform Monitoring Komoditas Indonesia',
          contact: {
            name: 'Komoditas Watch Team',
            email: 'support@komoditaswatch.id',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.app.port}/api/v1`,
            description: 'Development Server',
          },
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
          },
        },
        security: [
          {
            BearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    this.app.use(
      config.swagger.path,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Komoditas Watch API Documentation',
      })
    );

    logger.info(`Swagger documentation available at ${config.swagger.path}`);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('Database connected successfully');

      // Connect to Redis
      await redis.connect();
      logger.info('Redis connected successfully');

      // Start scraper manager
      await this.scraperManager.start();
      logger.info('Scraper manager started successfully');

      // Start HTTP server
      const server = this.app.listen(config.app.port, () => {
        logger.info(`Server running on port ${config.app.port} in ${config.app.env} mode`);
        logger.info(`API documentation: http://localhost:${config.app.port}${config.swagger.path}`);
      });

      // Graceful shutdown handling
      const gracefulShutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);

        server.close(async () => {
          try {
            await this.scraperManager.stop();
            await redis.disconnect();
            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

// Global type augmentation for Express
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Start the application
const app = new Application();
app.start().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});

export default app;
