import { BaseScraper, ScrapingResult, ScrapingConfig } from './BaseScraper';
import { logger } from '../config/logger';

export interface PanelHargaData {
  commodity: string;
  commodityCode: string;
  region: string;
  regionCode: string;
  priceType: string;
  price: number;
  unit: string;
  date: Date;
  source: string;
}

export class PanelHargaScraper extends BaseScraper {
  private readonly endpoints = {
    provinces: '/api/provinces',
    commodities: '/api/commodities',
    prices: '/api/prices',
    dailyPrices: '/api/daily-prices',
  };

  constructor() {
    const config: Partial<ScrapingConfig> = {
      baseUrl: 'https://pihps.kemendag.go.id',
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
      rateLimit: 2000, // 2 seconds between requests
    };

    super('panel-harga-pangan', config);
  }

  async scrapeData(): Promise<ScrapingResult<PanelHargaData>> {
    try {
      logger.info('[Panel Harga] Starting data scraping');

      // First, get list of provinces and commodities
      const [provinces, commodities] = await Promise.all([
        this.getProvinces(),
        this.getCommodities(),
      ]);

      if (!provinces.length || !commodities.length) {
        throw new Error('Failed to fetch provinces or commodities data');
      }

      // Get price data for all combinations
      const allPriceData: PanelHargaData[] = [];
      
      // Process in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < provinces.length; i += batchSize) {
        const provinceBatch = provinces.slice(i, i + batchSize);
        
        const batchPromises = provinceBatch.map(province =>
          this.getPricesForProvince(province, commodities)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allPriceData.push(...result.value);
          } else {
            logger.error(`[Panel Harga] Failed to get prices for province ${provinceBatch[index].name}:`, result.reason);
          }
        });

        // Add delay between batches
        if (i + batchSize < provinces.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      const validatedData = this.validatePanelHargaData(allPriceData);

      return {
        success: true,
        data: validatedData,
        source: this.source,
        timestamp: new Date(),
        totalRecords: validatedData.length,
      };

    } catch (error) {
      logger.error('[Panel Harga] Scraping failed:', error);
      return {
        success: false,
        data: [],
        source: this.source,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getProvinces(): Promise<any[]> {
    try {
      const cacheKey = this.createCacheKey('provinces');
      const cached = await this.getCachedData<any[]>(cacheKey);
      
      if (cached) {
        logger.debug('[Panel Harga] Using cached provinces data');
        return cached;
      }

      // Try API endpoint first
      try {
        const response = await this.makeRequest(this.endpoints.provinces);
        const data = JSON.parse(response);
        
        if (data && Array.isArray(data.data)) {
          await this.setCachedData(cacheKey, data.data, 86400); // Cache for 1 day
          return data.data;
        }
      } catch (error) {
        logger.warn('[Panel Harga] API endpoint failed, trying web scraping');
      }

      // Fallback to web scraping
      return await this.scrapeProvincesFromWeb();

    } catch (error) {
      logger.error('[Panel Harga] Failed to get provinces:', error);
      return [];
    }
  }

  private async scrapeProvincesFromWeb(): Promise<any[]> {
    try {
      const html = await this.makeRequest('/');
      const $ = this.parseHtml(html);
      
      const provinces: any[] = [];
      
      // Look for province dropdown or select elements
      $('select[name*="province"], select[name*="provinsi"]').find('option').each((_, element) => {
        const $option = $(element);
        const value = $option.attr('value');
        const text = $option.text().trim();
        
        if (value && text && value !== '') {
          provinces.push({
            id: value,
            code: value,
            name: text,
          });
        }
      });

      // If no dropdown found, try other methods
      if (provinces.length === 0) {
        // Look for province links or data
        $('a[href*="province"], a[href*="provinsi"]').each((_, element) => {
          const $link = $(element);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text) {
            const idMatch = href.match(/province[=\/](\d+)/i);
            if (idMatch) {
              provinces.push({
                id: idMatch[1],
                code: idMatch[1],
                name: text,
              });
            }
          }
        });
      }

      logger.info(`[Panel Harga] Scraped ${provinces.length} provinces from web`);
      return provinces;

    } catch (error) {
      logger.error('[Panel Harga] Failed to scrape provinces from web:', error);
      return [];
    }
  }

  private async getCommodities(): Promise<any[]> {
    try {
      const cacheKey = this.createCacheKey('commodities');
      const cached = await this.getCachedData<any[]>(cacheKey);
      
      if (cached) {
        logger.debug('[Panel Harga] Using cached commodities data');
        return cached;
      }

      // Try API endpoint first
      try {
        const response = await this.makeRequest(this.endpoints.commodities);
        const data = JSON.parse(response);
        
        if (data && Array.isArray(data.data)) {
          await this.setCachedData(cacheKey, data.data, 86400); // Cache for 1 day
          return data.data;
        }
      } catch (error) {
        logger.warn('[Panel Harga] Commodities API endpoint failed, trying web scraping');
      }

      // Fallback to web scraping
      return await this.scrapeCommoditiesFromWeb();

    } catch (error) {
      logger.error('[Panel Harga] Failed to get commodities:', error);
      return [];
    }
  }

  private async scrapeCommoditiesFromWeb(): Promise<any[]> {
    try {
      const html = await this.makeRequest('/');
      const $ = this.parseHtml(html);
      
      const commodities: any[] = [];
      
      // Look for commodity dropdown or select elements
      $('select[name*="commodity"], select[name*="komoditas"]').find('option').each((_, element) => {
        const $option = $(element);
        const value = $option.attr('value');
        const text = $option.text().trim();
        
        if (value && text && value !== '') {
          commodities.push({
            id: value,
            code: value,
            name: text,
            unit: this.extractUnit(text),
          });
        }
      });

      // Default commodities if none found
      if (commodities.length === 0) {
        commodities.push(
          { id: '1', code: 'BERAS', name: 'Beras', unit: 'kg' },
          { id: '2', code: 'JAGUNG', name: 'Jagung', unit: 'kg' },
          { id: '3', code: 'KEDELAI', name: 'Kedelai', unit: 'kg' },
          { id: '4', code: 'GULA_PASIR', name: 'Gula Pasir', unit: 'kg' },
          { id: '5', code: 'MINYAK_GORENG', name: 'Minyak Goreng', unit: 'liter' },
          { id: '6', code: 'DAGING_SAPI', name: 'Daging Sapi', unit: 'kg' },
          { id: '7', code: 'DAGING_AYAM', name: 'Daging Ayam', unit: 'kg' },
          { id: '8', code: 'TELUR_AYAM', name: 'Telur Ayam', unit: 'kg' },
          { id: '9', code: 'CABAI_MERAH', name: 'Cabai Merah', unit: 'kg' },
          { id: '10', code: 'BAWANG_MERAH', name: 'Bawang Merah', unit: 'kg' },
          { id: '11', code: 'BAWANG_PUTIH', name: 'Bawang Putih', unit: 'kg' },
          { id: '12', code: 'TOMAT', name: 'Tomat', unit: 'kg' }
        );
      }

      logger.info(`[Panel Harga] Scraped ${commodities.length} commodities from web`);
      return commodities;

    } catch (error) {
      logger.error('[Panel Harga] Failed to scrape commodities from web:', error);
      return [];
    }
  }

  private async getPricesForProvince(province: any, commodities: any[]): Promise<PanelHargaData[]> {
    try {
      const prices: PanelHargaData[] = [];
      
      for (const commodity of commodities) {
        try {
          const priceData = await this.getPriceData(province.id, commodity.id);
          
          if (priceData && priceData.length > 0) {
            const formattedPrices = priceData.map(price => ({
              commodity: commodity.name,
              commodityCode: commodity.code,
              region: province.name,
              regionCode: province.code,
              priceType: 'KONSUMEN', // Default type
              price: this.parsePrice(price.price) || 0,
              unit: commodity.unit || 'kg',
              date: this.parseDate(price.date) || new Date(),
              source: 'Panel Harga Pangan',
            }));
            
            prices.push(...formattedPrices);
          }
        } catch (error) {
          logger.warn(`[Panel Harga] Failed to get price for ${commodity.name} in ${province.name}:`, error);
        }
      }

      return prices;

    } catch (error) {
      logger.error(`[Panel Harga] Failed to get prices for province ${province.name}:`, error);
      return [];
    }
  }

  private async getPriceData(provinceId: string, commodityId: string): Promise<any[]> {
    try {
      // Try different API endpoints
      const endpoints = [
        `/api/prices?province=${provinceId}&commodity=${commodityId}`,
        `/api/daily-prices?province=${provinceId}&commodity=${commodityId}`,
        `/data/prices/${provinceId}/${commodityId}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest(endpoint);
          const data = JSON.parse(response);
          
          if (data && (Array.isArray(data) || Array.isArray(data.data))) {
            return Array.isArray(data) ? data : data.data;
          }
        } catch (error) {
          // Continue to next endpoint
        }
      }

      // If API fails, try web scraping specific page
      return await this.scrapePriceFromWeb(provinceId, commodityId);

    } catch (error) {
      logger.error(`[Panel Harga] Failed to get price data for province ${provinceId}, commodity ${commodityId}:`, error);
      return [];
    }
  }

  private async scrapePriceFromWeb(provinceId: string, commodityId: string): Promise<any[]> {
    try {
      const url = `/harga?province=${provinceId}&commodity=${commodityId}`;
      const html = await this.makeRequest(url);
      const $ = this.parseHtml(html);
      
      const prices: any[] = [];
      
      // Look for price tables or data
      $('table tr, .price-item, .harga-item').each((_, element) => {
        const $element = $(element);
        const priceText = $element.find('.price, .harga, td:last-child').text();
        const dateText = $element.find('.date, .tanggal, td:first-child').text();
        
        const price = this.parsePrice(priceText);
        const date = this.parseDate(dateText);
        
        if (price && date) {
          prices.push({
            price: price,
            date: date.toISOString(),
          });
        }
      });

      return prices;

    } catch (error) {
      logger.error(`[Panel Harga] Failed to scrape price from web for province ${provinceId}, commodity ${commodityId}:`, error);
      return [];
    }
  }

  private extractUnit(commodityName: string): string {
    const unitMap: Record<string, string> = {
      'liter': 'liter',
      'kg': 'kg',
      'gram': 'gram',
      'ton': 'ton',
    };

    const lowerName = commodityName.toLowerCase();
    
    if (lowerName.includes('minyak') || lowerName.includes('oli')) {
      return 'liter';
    }
    
    // Default to kg for most commodities
    return 'kg';
  }

  private validatePanelHargaData(data: PanelHargaData[]): PanelHargaData[] {
    return data.filter(item => {
      return (
        item.commodity &&
        item.region &&
        item.price > 0 &&
        item.date &&
        !isNaN(item.date.getTime()) &&
        item.source
      );
    });
  }

  // Override postProcess to add additional data cleaning
  protected async postProcess(data: PanelHargaData[]): Promise<PanelHargaData[]> {
    // Remove duplicates based on commodity, region, and date
    const uniqueData = data.filter((item, index, array) => {
      return index === array.findIndex(t => (
        t.commodity === item.commodity &&
        t.region === item.region &&
        t.date.getTime() === item.date.getTime()
      ));
    });

    // Sort by date (newest first)
    uniqueData.sort((a, b) => b.date.getTime() - a.date.getTime());

    logger.info(`[Panel Harga] Processed ${uniqueData.length} unique price records`);
    return uniqueData;
  }

  // Public method to get latest prices for specific commodity/region
  async getLatestPrices(commodityCode?: string, regionCode?: string): Promise<PanelHargaData[]> {
    try {
      const result = await this.run();
      
      if (!result.success) {
        return [];
      }

      let filteredData = result.data;

      if (commodityCode) {
        filteredData = filteredData.filter(item => 
          item.commodityCode === commodityCode
        );
      }

      if (regionCode) {
        filteredData = filteredData.filter(item => 
          item.regionCode === regionCode
        );
      }

      return filteredData.slice(0, 100); // Return latest 100 records

    } catch (error) {
      logger.error('[Panel Harga] Failed to get latest prices:', error);
      return [];
    }
  }
}

export default PanelHargaScraper;
