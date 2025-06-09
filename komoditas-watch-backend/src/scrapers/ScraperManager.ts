import cron from 'node-cron';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { BaseScraper, ScrapingResult } from './BaseScraper';
import { PanelHargaScraper, PanelHargaData } from './PanelHargaScraper';
import { BMKGScraper, BMKGWeatherData } from './BMKGScraper';
import { BPSScraper, BPSPriceData } from './BPSScraper';
import config from '../config';

export interface ScrapingJob {
  id: string;
  scraper: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  error?: string;
  nextRun?: Date;
}

export interface ScrapingSchedule {
  scraper: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class ScraperManager {
  private static instance: ScraperManager;
  private scrapers: Map<string, BaseScraper>;
  private jobs: Map<string, ScrapingJob>;
  private schedules: Map<string, ScrapingSchedule>;
  private isRunning: boolean = false;

  private constructor() {
    this.scrapers = new Map();
    this.jobs = new Map();
    this.schedules = new Map();
    this.initializeScrapers();
    this.initializeSchedules();
  }

  public static getInstance(): ScraperManager {
    if (!ScraperManager.instance) {
      ScraperManager.instance = new ScraperManager();
    }
    return ScraperManager.instance;
  }

  private initializeScrapers(): void {
    // Initialize all scrapers
    this.scrapers.set('panel-harga', new PanelHargaScraper());
    this.scrapers.set('bmkg-weather', new BMKGScraper());
    this.scrapers.set('bps-statistics', new BPSScraper());

    logger.info(`[ScraperManager] Initialized ${this.scrapers.size} scrapers`);
  }

  private initializeSchedules(): void {
    // Default scraping schedules
    const defaultSchedules: ScrapingSchedule[] = [
      {
        scraper: 'panel-harga',
        cronExpression: '0 */6 * * *', // Every 6 hours
        enabled: true,
      },
      {
        scraper: 'bmkg-weather',
        cronExpression: '0 */3 * * *', // Every 3 hours
        enabled: true,
      },
      {
        scraper: 'bps-statistics',
        cronExpression: '0 0 */2 * *', // Every 2 days
        enabled: true,
      },
    ];

    defaultSchedules.forEach(schedule => {
      this.schedules.set(schedule.scraper, schedule);
    });

    logger.info(`[ScraperManager] Initialized ${this.schedules.size} schedules`);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[ScraperManager] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[ScraperManager] Starting scraper manager');

    // Start scheduled jobs
    this.startScheduledJobs();

    // Initial health check
    await this.healthCheckAll();

    logger.info('[ScraperManager] Scraper manager started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('[ScraperManager] Already stopped');
      return;
    }

    this.isRunning = false;
    
    // Stop all cron jobs
    cron.getTasks().forEach(task => {
      task.stop();
      task.destroy();
    });

    logger.info('[ScraperManager] Scraper manager stopped');
  }

  private startScheduledJobs(): void {
    this.schedules.forEach((schedule, scraperName) => {
      if (schedule.enabled) {
        logger.info(`[ScraperManager] Scheduling ${scraperName} with cron: ${schedule.cronExpression}`);
        
        cron.schedule(schedule.cronExpression, async () => {
          await this.runScraper(scraperName);
        }, {
          scheduled: true,
          timezone: 'Asia/Jakarta',
        });

        // Calculate next run time
        schedule.nextRun = this.getNextCronRun(schedule.cronExpression);
      }
    });
  }

  public async runScraper(scraperName: string): Promise<ScrapingJob> {
    const scraper = this.scrapers.get(scraperName);
    if (!scraper) {
      throw new Error(`Scraper ${scraperName} not found`);
    }

    // Check if scraper is already running
    const existingJob = Array.from(this.jobs.values()).find(
      job => job.scraper === scraperName && job.status === 'running'
    );

    if (existingJob) {
      logger.warn(`[ScraperManager] Scraper ${scraperName} is already running`);
      return existingJob;
    }

    // Create new job
    const jobId = `${scraperName}_${Date.now()}`;
    const job: ScrapingJob = {
      id: jobId,
      scraper: scraperName,
      status: 'pending',
      recordsProcessed: 0,
    };

    this.jobs.set(jobId, job);

    try {
      // Update job status
      job.status = 'running';
      job.startTime = new Date();
      
      logger.info(`[ScraperManager] Starting scraper: ${scraperName}`);

      // Run the scraper
      const result = await scraper.run();

      // Update job with results
      job.endTime = new Date();
      job.duration = job.endTime.getTime() - (job.startTime?.getTime() || 0);
      job.recordsProcessed = result.totalRecords || result.data.length;

      if (result.success) {
        job.status = 'completed';
        
        // Process and store the data
        await this.processScrapingResult(scraperName, result);
        
        logger.info(`[ScraperManager] Scraper ${scraperName} completed successfully. Processed ${job.recordsProcessed} records in ${job.duration}ms`);
      } else {
        job.status = 'failed';
        job.error = result.error;
        logger.error(`[ScraperManager] Scraper ${scraperName} failed: ${result.error}`);
      }

      // Update schedule
      const schedule = this.schedules.get(scraperName);
      if (schedule) {
        schedule.lastRun = new Date();
        schedule.nextRun = this.getNextCronRun(schedule.cronExpression);
      }

      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      job.duration = job.endTime.getTime() - (job.startTime?.getTime() || 0);

      logger.error(`[ScraperManager] Scraper ${scraperName} failed with exception:`, error);
      return job;
    }
  }

  private async processScrapingResult(scraperName: string, result: ScrapingResult): Promise<void> {
    try {
      switch (scraperName) {
        case 'panel-harga':
          await this.processPanelHargaData(result.data as PanelHargaData[]);
          break;
        case 'bmkg-weather':
          await this.processBMKGData(result.data as BMKGWeatherData[]);
          break;
        case 'bps-statistics':
          await this.processBPSData(result.data as BPSPriceData[]);
          break;
        default:
          logger.warn(`[ScraperManager] Unknown scraper type: ${scraperName}`);
      }
    } catch (error) {
      logger.error(`[ScraperManager] Failed to process ${scraperName} data:`, error);
      throw error;
    }
  }

  private async processPanelHargaData(data: PanelHargaData[]): Promise<void> {
    logger.info(`[ScraperManager] Processing ${data.length} Panel Harga records`);

    for (const item of data) {
      try {
        // Find or create commodity
        const commodity = await this.findOrCreateCommodity(item.commodity, item.commodityCode);
        
        // Find or create region
        const region = await this.findOrCreateRegion(item.region, item.regionCode);

        // Create price record
        await prisma.price.upsert({
          where: {
            commodityId_regionId_priceType_date_source: {
              commodityId: commodity.id,
              regionId: region.id,
              priceType: item.priceType as any,
              date: item.date,
              source: item.source,
            },
          },
          update: {
            price: item.price,
            currency: 'IDR',
            updatedAt: new Date(),
          },
          create: {
            commodityId: commodity.id,
            regionId: region.id,
            priceType: item.priceType as any,
            price: item.price,
            currency: 'IDR',
            date: item.date,
            source: item.source,
          },
        });
      } catch (error) {
        logger.error('[ScraperManager] Failed to process Panel Harga item:', error);
      }
    }
  }

  private async processBMKGData(data: BMKGWeatherData[]): Promise<void> {
    logger.info(`[ScraperManager] Processing ${data.length} BMKG weather records`);

    for (const item of data) {
      try {
        // Find or create region
        const region = await this.findOrCreateRegion(item.regionName, item.regionId);

        // Create weather record
        await prisma.weatherData.upsert({
          where: {
            regionId_weatherType_date: {
              regionId: region.id,
              weatherType: item.weatherType as any,
              date: item.date,
            },
          },
          update: {
            value: item.value,
            unit: item.unit,
            source: item.source,
            updatedAt: new Date(),
          },
          create: {
            regionId: region.id,
            weatherType: item.weatherType as any,
            value: item.value,
            unit: item.unit,
            date: item.date,
            source: item.source,
          },
        });
      } catch (error) {
        logger.error('[ScraperManager] Failed to process BMKG item:', error);
      }
    }
  }

  private async processBPSData(data: BPSPriceData[]): Promise<void> {
    logger.info(`[ScraperManager] Processing ${data.length} BPS statistics records`);

    for (const item of data) {
      try {
        // Find or create commodity
        const commodity = await this.findOrCreateCommodity(item.commodityName, item.commodityCode);
        
        // Find or create region
        const region = await this.findOrCreateRegion(item.regionName, item.regionCode);

        // Create price record
        await prisma.price.upsert({
          where: {
            commodityId_regionId_priceType_date_source: {
              commodityId: commodity.id,
              regionId: region.id,
              priceType: item.priceType as any,
              date: item.date,
              source: item.source,
            },
          },
          update: {
            price: item.price,
            currency: 'IDR',
            updatedAt: new Date(),
          },
          create: {
            commodityId: commodity.id,
            regionId: region.id,
            priceType: item.priceType as any,
            price: item.price,
            currency: 'IDR',
            date: item.date,
            source: item.source,
          },
        });
      } catch (error) {
        logger.error('[ScraperManager] Failed to process BPS item:', error);
      }
    }
  }

  private async findOrCreateCommodity(name: string, code: string): Promise<any> {
    try {
      return await prisma.commodity.upsert({
        where: { code },
        update: { name },
        create: {
          name,
          code,
          type: this.mapCommodityType(code),
          unit: this.mapCommodityUnit(code),
          category: 'Pangan',
        },
      });
    } catch (error) {
      logger.error(`[ScraperManager] Failed to find/create commodity ${code}:`, error);
      throw error;
    }
  }

  private async findOrCreateRegion(name: string, code: string): Promise<any> {
    try {
      return await prisma.region.upsert({
        where: { code },
        update: { name },
        create: {
          name,
          code,
          type: code === 'NATIONAL' ? 'country' : 'province',
        },
      });
    } catch (error) {
      logger.error(`[ScraperManager] Failed to find/create region ${code}:`, error);
      throw error;
    }
  }

  private mapCommodityType(code: string): any {
    const mapping: Record<string, any> = {
      'BERAS': 'BERAS',
      'JAGUNG': 'JAGUNG',
      'KEDELAI': 'KEDELAI',
      'GULA_PASIR': 'GULA_PASIR',
      'MINYAK_GORENG': 'MINYAK_GORENG',
      'DAGING_SAPI': 'DAGING_SAPI',
      'DAGING_AYAM': 'DAGING_AYAM',
      'TELUR_AYAM': 'TELUR_AYAM',
      'CABAI_MERAH': 'CABAI_MERAH',
      'BAWANG_MERAH': 'BAWANG_MERAH',
      'BAWANG_PUTIH': 'BAWANG_PUTIH',
      'TOMAT': 'TOMAT',
    };

    return mapping[code] || 'BERAS';
  }

  private mapCommodityUnit(code: string): string {
    const mapping: Record<string, string> = {
      'MINYAK_GORENG': 'liter',
    };

    return mapping[code] || 'kg';
  }

  public async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const checks = Array.from(this.scrapers.entries()).map(async ([name, scraper]) => {
      try {
        const isHealthy = await scraper.healthCheck();
        results[name] = isHealthy;
        
        if (!isHealthy) {
          logger.warn(`[ScraperManager] Health check failed for ${name}`);
        }
      } catch (error) {
        results[name] = false;
        logger.error(`[ScraperManager] Health check error for ${name}:`, error);
      }
    });

    await Promise.all(checks);
    
    logger.info('[ScraperManager] Health check completed:', results);
    return results;
  }

  public getJobStatus(jobId?: string): ScrapingJob | ScrapingJob[] {
    if (jobId) {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      return job;
    }

    return Array.from(this.jobs.values());
  }

  public getSchedules(): ScrapingSchedule[] {
    return Array.from(this.schedules.values());
  }

  public updateSchedule(scraperName: string, cronExpression: string, enabled: boolean): void {
    const schedule = this.schedules.get(scraperName);
    if (!schedule) {
      throw new Error(`Schedule for ${scraperName} not found`);
    }

    schedule.cronExpression = cronExpression;
    schedule.enabled = enabled;
    schedule.nextRun = enabled ? this.getNextCronRun(cronExpression) : undefined;

    logger.info(`[ScraperManager] Updated schedule for ${scraperName}: ${cronExpression}, enabled: ${enabled}`);
  }

  private getNextCronRun(cronExpression: string): Date {
    // Simple next run calculation - could use a more sophisticated cron parser
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour from now
  }

  public async getScrapingStats(days: number = 7): Promise<any> {
    const stats = {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      totalRecordsProcessed: 0,
      averageDuration: 0,
      scraperStats: {} as Record<string, any>,
    };

    const jobs = Array.from(this.jobs.values());
    const recentJobs = jobs.filter(job => {
      const daysDiff = (Date.now() - (job.startTime?.getTime() || 0)) / (1000 * 60 * 60 * 24);
      return daysDiff <= days;
    });

    stats.totalJobs = recentJobs.length;
    stats.successfulJobs = recentJobs.filter(job => job.status === 'completed').length;
    stats.failedJobs = recentJobs.filter(job => job.status === 'failed').length;
    stats.totalRecordsProcessed = recentJobs.reduce((sum, job) => sum + job.recordsProcessed, 0);
    
    const durations = recentJobs.filter(job => job.duration).map(job => job.duration!);
    stats.averageDuration = durations.length ? durations.reduce((sum, dur) => sum + dur, 0) / durations.length : 0;

    // Per-scraper stats
    for (const [name, scraper] of this.scrapers.entries()) {
      const scraperJobs = recentJobs.filter(job => job.scraper === name);
      const scraperStats = await scraper.getStats(days);
      
      stats.scraperStats[name] = {
        jobs: scraperJobs.length,
        successful: scraperJobs.filter(job => job.status === 'completed').length,
        failed: scraperJobs.filter(job => job.status === 'failed').length,
        records: scraperJobs.reduce((sum, job) => sum + job.recordsProcessed, 0),
        stats: scraperStats,
      };
    }

    return stats;
  }
}

export default ScraperManager;
