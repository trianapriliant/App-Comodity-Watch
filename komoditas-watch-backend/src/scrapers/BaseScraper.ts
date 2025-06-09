import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import cheerio from 'cheerio';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { delay, retryWithBackoff } from '../utils';

export interface ScrapingResult<T = any> {
  success: boolean;
  data: T[];
  source: string;
  timestamp: Date;
  error?: string;
  totalRecords?: number;
}

export interface ScrapingConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  rateLimit: number; // milliseconds between requests
}

export abstract class BaseScraper {
  protected client: AxiosInstance;
  protected config: ScrapingConfig;
  protected source: string;

  constructor(source: string, config: Partial<ScrapingConfig> = {}) {
    this.source = source;
    this.config = {
      baseUrl: '',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      rateLimit: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[${this.source}] Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`[${this.source}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[${this.source}] Response received from: ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`[${this.source}] Response error:`, error);
        return Promise.reject(error);
      }
    );
  }

  protected async makeRequest(
    url: string,
    options: AxiosRequestConfig = {}
  ): Promise<string> {
    try {
      const response = await retryWithBackoff(
        async () => {
          await delay(this.config.rateLimit);
          return await this.client.get(url, options);
        },
        this.config.retries,
        this.config.retryDelay
      );

      return response.data;
    } catch (error) {
      logger.error(`[${this.source}] Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  protected async getCachedData<T>(key: string): Promise<T | null> {
    try {
      return await redis.getJson<T>(key);
    } catch (error) {
      logger.error(`[${this.source}] Cache read error:`, error);
      return null;
    }
  }

  protected async setCachedData<T>(
    key: string,
    data: T,
    ttl: number = 3600
  ): Promise<void> {
    try {
      await redis.setJson(key, data, { EX: ttl });
    } catch (error) {
      logger.error(`[${this.source}] Cache write error:`, error);
    }
  }

  protected createCacheKey(...parts: string[]): string {
    return `scraper:${this.source}:${parts.join(':')}`;
  }

  protected cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, '')
      .replace(/[^\w\s\-\.,]/g, '');
  }

  protected parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;

    // Remove currency symbols and non-numeric characters except decimal points
    const cleaned = priceStr
      .replace(/[Rp\s,]/g, '')
      .replace(/\./g, '')
      .trim();

    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  protected parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Handle various Indonesian date formats
      const cleaned = dateStr.trim();
      
      // Format: DD/MM/YYYY or DD-MM-YYYY
      const ddmmyyyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Format: YYYY-MM-DD
      const yyyymmdd = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (yyyymmdd) {
        return new Date(cleaned);
      }

      // Try to parse as-is
      const date = new Date(cleaned);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      logger.warn(`[${this.source}] Failed to parse date: ${dateStr}`);
      return null;
    }
  }

  protected validateData(data: any[]): any[] {
    return data.filter(item => {
      // Basic validation - override in subclasses for specific validation
      return item && typeof item === 'object';
    });
  }

  protected async logScrapingResult(result: ScrapingResult): Promise<void> {
    try {
      const logData = {
        source: this.source,
        success: result.success,
        recordCount: result.totalRecords || result.data.length,
        timestamp: result.timestamp,
        error: result.error,
      };

      logger.info(`[${this.source}] Scraping completed:`, logData);

      // Store scraping statistics
      const statsKey = this.createCacheKey('stats', new Date().toISOString().split('T')[0]);
      await this.setCachedData(statsKey, logData, 86400); // Cache for 1 day
    } catch (error) {
      logger.error(`[${this.source}] Failed to log scraping result:`, error);
    }
  }

  // Abstract methods to be implemented by subclasses
  abstract scrapeData(): Promise<ScrapingResult>;
  
  // Optional methods that can be overridden
  protected async preProcess(): Promise<void> {
    // Override in subclasses for preprocessing
  }

  protected async postProcess(data: any[]): Promise<any[]> {
    // Override in subclasses for postprocessing
    return data;
  }

  // Public method to run the complete scraping process
  async run(): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[${this.source}] Starting scraping process`);
      
      await this.preProcess();
      const result = await this.scrapeData();
      result.data = await this.postProcess(result.data);
      
      const duration = Date.now() - startTime;
      logger.info(`[${this.source}] Scraping completed in ${duration}ms`);
      
      await this.logScrapingResult(result);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: ScrapingResult = {
        success: false,
        data: [],
        source: this.source,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      logger.error(`[${this.source}] Scraping failed after ${duration}ms:`, error);
      await this.logScrapingResult(errorResult);
      
      return errorResult;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/', { timeout: 5000 });
      return true;
    } catch (error) {
      logger.error(`[${this.source}] Health check failed:`, error);
      return false;
    }
  }

  // Get scraping statistics
  async getStats(days: number = 7): Promise<any[]> {
    const stats = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const statsKey = this.createCacheKey('stats', dateStr);
      const dayStats = await this.getCachedData(statsKey);
      
      if (dayStats) {
        stats.push(dayStats);
      }
    }

    return stats.reverse(); // Return chronologically
  }
}

export default BaseScraper;
