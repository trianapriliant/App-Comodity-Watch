import { BaseScraper, ScrapingResult, ScrapingConfig } from './BaseScraper';
import { logger } from '../config/logger';

export interface BPSPriceData {
  commodityCode: string;
  commodityName: string;
  regionCode: string;
  regionName: string;
  priceType: string;
  price: number;
  unit: string;
  date: Date;
  source: string;
  period?: string;
  category?: string;
}

export class BPSScraper extends BaseScraper {
  private readonly endpoints = {
    // BPS WebAPI endpoints
    staticTable: '/api/list/model/statictable/domain/',
    dynamicTable: '/api/list/model/dynamictable/domain/',
    publication: '/api/list/model/publication/domain/',
    pressRelease: '/api/list/model/pressrelease/domain/',
    data: '/api/list/model/data/domain/',
  };

  private readonly domains = {
    consumer_prices: '0000',
    producer_prices: '0000',
    regional_economy: '0000',
  };

  private readonly commodityMapping: Record<string, string> = {
    'beras': 'BERAS',
    'jagung': 'JAGUNG',
    'kedelai': 'KEDELAI',
    'gula pasir': 'GULA_PASIR',
    'gula': 'GULA_PASIR',
    'minyak goreng': 'MINYAK_GORENG',
    'minyak': 'MINYAK_GORENG',
    'daging sapi': 'DAGING_SAPI',
    'daging ayam': 'DAGING_AYAM',
    'ayam': 'DAGING_AYAM',
    'telur ayam': 'TELUR_AYAM',
    'telur': 'TELUR_AYAM',
    'cabai merah': 'CABAI_MERAH',
    'cabai': 'CABAI_MERAH',
    'bawang merah': 'BAWANG_MERAH',
    'bawang putih': 'BAWANG_PUTIH',
    'tomat': 'TOMAT',
  };

  constructor() {
    const config: Partial<ScrapingConfig> = {
      baseUrl: 'https://webapi.bps.go.id/v1',
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
      rateLimit: 3000, // 3 seconds between requests
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    };

    super('bps-statistics', config);
  }

  async scrapeData(): Promise<ScrapingResult<BPSPriceData>> {
    try {
      logger.info('[BPS] Starting statistical data scraping');

      const priceData: BPSPriceData[] = [];

      // Get different types of price data
      const [
        consumerPrices,
        producerPrices,
        regionalData
      ] = await Promise.allSettled([
        this.scrapeConsumerPrices(),
        this.scrapeProducerPrices(),
        this.scrapeRegionalData(),
      ]);

      // Process results
      if (consumerPrices.status === 'fulfilled') {
        priceData.push(...consumerPrices.value);
      } else {
        logger.error('[BPS] Consumer prices failed:', consumerPrices.reason);
      }

      if (producerPrices.status === 'fulfilled') {
        priceData.push(...producerPrices.value);
      } else {
        logger.warn('[BPS] Producer prices failed:', producerPrices.reason);
      }

      if (regionalData.status === 'fulfilled') {
        priceData.push(...regionalData.value);
      } else {
        logger.warn('[BPS] Regional data failed:', regionalData.reason);
      }

      const validatedData = this.validateBPSData(priceData);

      return {
        success: true,
        data: validatedData,
        source: this.source,
        timestamp: new Date(),
        totalRecords: validatedData.length,
      };

    } catch (error) {
      logger.error('[BPS] Scraping failed:', error);
      return {
        success: false,
        data: [],
        source: this.source,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async scrapeConsumerPrices(): Promise<BPSPriceData[]> {
    try {
      const cacheKey = this.createCacheKey('consumer-prices');
      const cached = await this.getCachedData<BPSPriceData[]>(cacheKey);
      
      if (cached) {
        logger.debug('[BPS] Using cached consumer prices data');
        return cached;
      }

      const priceData: BPSPriceData[] = [];

      // Try different approaches to get consumer price data
      const approaches = [
        () => this.getStaticTableData('consumer_prices'),
        () => this.getDynamicTableData('consumer_prices'),
        () => this.scrapeBPSWebsite(),
      ];

      for (const approach of approaches) {
        try {
          const data = await approach();
          if (data.length > 0) {
            priceData.push(...data);
            break; // Use first successful approach
          }
        } catch (error) {
          logger.debug('[BPS] Consumer price approach failed, trying next');
        }
      }

      // Cache the results if we got data
      if (priceData.length > 0) {
        await this.setCachedData(cacheKey, priceData, 7200); // Cache for 2 hours
      }

      logger.info(`[BPS] Scraped ${priceData.length} consumer price records`);
      return priceData;

    } catch (error) {
      logger.error('[BPS] Failed to scrape consumer prices:', error);
      return [];
    }
  }

  private async scrapeProducerPrices(): Promise<BPSPriceData[]> {
    try {
      const priceData: BPSPriceData[] = [];

      // Try to get producer price data
      const data = await this.getStaticTableData('producer_prices');
      priceData.push(...data);

      logger.info(`[BPS] Scraped ${priceData.length} producer price records`);
      return priceData;

    } catch (error) {
      logger.error('[BPS] Failed to scrape producer prices:', error);
      return [];
    }
  }

  private async scrapeRegionalData(): Promise<BPSPriceData[]> {
    try {
      const priceData: BPSPriceData[] = [];

      // Get regional economic data
      const data = await this.getStaticTableData('regional_economy');
      priceData.push(...data);

      logger.info(`[BPS] Scraped ${priceData.length} regional data records`);
      return priceData;

    } catch (error) {
      logger.error('[BPS] Failed to scrape regional data:', error);
      return [];
    }
  }

  private async getStaticTableData(category: string): Promise<BPSPriceData[]> {
    try {
      const domain = this.domains[category as keyof typeof this.domains] || '0000';
      const endpoint = `${this.endpoints.staticTable}${domain}`;
      
      const response = await this.makeRequest(endpoint);
      const data = JSON.parse(response);

      if (!data || !Array.isArray(data.data)) {
        logger.warn(`[BPS] No static table data found for ${category}`);
        return [];
      }

      const priceData: BPSPriceData[] = [];

      // Process each static table
      for (const table of data.data) {
        try {
          const tableData = await this.getTableData(table.table_id);
          const processedData = this.processTableData(tableData, category);
          priceData.push(...processedData);
        } catch (error) {
          logger.warn(`[BPS] Failed to process table ${table.table_id}:`, error);
        }
      }

      return priceData;

    } catch (error) {
      logger.error(`[BPS] Failed to get static table data for ${category}:`, error);
      return [];
    }
  }

  private async getDynamicTableData(category: string): Promise<BPSPriceData[]> {
    try {
      const domain = this.domains[category as keyof typeof this.domains] || '0000';
      const endpoint = `${this.endpoints.dynamicTable}${domain}`;
      
      const response = await this.makeRequest(endpoint);
      const data = JSON.parse(response);

      if (!data || !Array.isArray(data.data)) {
        return [];
      }

      const priceData: BPSPriceData[] = [];

      // Process dynamic tables
      for (const table of data.data) {
        try {
          const tableData = await this.getTableData(table.table_id);
          const processedData = this.processTableData(tableData, category);
          priceData.push(...processedData);
        } catch (error) {
          logger.warn(`[BPS] Failed to process dynamic table ${table.table_id}:`, error);
        }
      }

      return priceData;

    } catch (error) {
      logger.error(`[BPS] Failed to get dynamic table data for ${category}:`, error);
      return [];
    }
  }

  private async getTableData(tableId: string): Promise<any> {
    try {
      const endpoint = `/api/view/model/data/lang/ind/domain/0000/var/${tableId}`;
      const response = await this.makeRequest(endpoint);
      return JSON.parse(response);
    } catch (error) {
      logger.error(`[BPS] Failed to get table data for ${tableId}:`, error);
      throw error;
    }
  }

  private processTableData(tableData: any, category: string): BPSPriceData[] {
    const priceData: BPSPriceData[] = [];

    try {
      if (!tableData || !tableData.datacontent) {
        return [];
      }

      const content = tableData.datacontent;
      
      // Process different table structures
      if (Array.isArray(content)) {
        for (const row of content) {
          const processedRow = this.processTableRow(row, category);
          if (processedRow) {
            priceData.push(processedRow);
          }
        }
      } else if (content.data && Array.isArray(content.data)) {
        for (const row of content.data) {
          const processedRow = this.processTableRow(row, category);
          if (processedRow) {
            priceData.push(processedRow);
          }
        }
      }

    } catch (error) {
      logger.error('[BPS] Error processing table data:', error);
    }

    return priceData;
  }

  private processTableRow(row: any, category: string): BPSPriceData | null {
    try {
      // Extract commodity information
      const commodityName = this.extractCommodityName(row);
      if (!commodityName) return null;

      const commodityCode = this.mapCommodityNameToCode(commodityName);
      if (!commodityCode) return null;

      // Extract region information
      const regionName = this.extractRegionName(row);
      const regionCode = this.mapRegionNameToCode(regionName);

      // Extract price and date
      const price = this.extractPrice(row);
      if (!price || price <= 0) return null;

      const date = this.extractDate(row);
      if (!date) return null;

      return {
        commodityCode,
        commodityName,
        regionCode: regionCode || 'NATIONAL',
        regionName: regionName || 'Indonesia',
        priceType: this.determinePriceType(category),
        price,
        unit: this.determineUnit(commodityCode),
        date,
        source: 'BPS',
        category,
        period: this.extractPeriod(row),
      };

    } catch (error) {
      logger.error('[BPS] Error processing table row:', error);
      return null;
    }
  }

  private async scrapeBPSWebsite(): Promise<BPSPriceData[]> {
    try {
      // Fallback: scrape BPS website directly
      const priceData: BPSPriceData[] = [];

      const urls = [
        'https://www.bps.go.id/statictable/2009/06/15/907/rata-rata-harga-beras-di-penggilingan.html',
        'https://www.bps.go.id/statictable/2014/09/08/950/rata-rata-harga-pembelian-petani.html',
      ];

      for (const url of urls) {
        try {
          const html = await this.makeRequest(url);
          const $ = this.parseHtml(html);
          
          // Extract data from BPS table structure
          $('table.table-responsive tbody tr').each((_, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 3) {
              const commodity = $(cells[0]).text().trim();
              const priceText = $(cells[1]).text().trim();
              const dateText = $(cells[2]).text().trim();
              
              const price = this.parsePrice(priceText);
              const date = this.parseDate(dateText);
              const commodityCode = this.mapCommodityNameToCode(commodity);
              
              if (price && date && commodityCode) {
                priceData.push({
                  commodityCode,
                  commodityName: commodity,
                  regionCode: 'NATIONAL',
                  regionName: 'Indonesia',
                  priceType: 'KONSUMEN',
                  price,
                  unit: this.determineUnit(commodityCode),
                  date,
                  source: 'BPS Website',
                });
              }
            }
          });

        } catch (error) {
          logger.warn(`[BPS] Failed to scrape URL ${url}:`, error);
        }
      }

      return priceData;

    } catch (error) {
      logger.error('[BPS] Failed to scrape BPS website:', error);
      return [];
    }
  }

  private extractCommodityName(row: any): string | null {
    // Try different field names that might contain commodity information
    const possibleFields = [
      'komoditas', 'commodity', 'barang', 'item', 'produk',
      'uraian', 'keterangan', 'nama_komoditas'
    ];

    for (const field of possibleFields) {
      if (row[field] && typeof row[field] === 'string') {
        return row[field].trim();
      }
    }

    // If row is an array, try to find commodity in first few elements
    if (Array.isArray(row) && row.length > 0) {
      for (let i = 0; i < Math.min(3, row.length); i++) {
        const value = row[i];
        if (typeof value === 'string' && this.isCommodityName(value)) {
          return value.trim();
        }
      }
    }

    return null;
  }

  private extractRegionName(row: any): string | null {
    const possibleFields = [
      'provinsi', 'province', 'daerah', 'region', 'wilayah',
      'nama_provinsi', 'kab_kota', 'kabupaten'
    ];

    for (const field of possibleFields) {
      if (row[field] && typeof row[field] === 'string') {
        return row[field].trim();
      }
    }

    return null;
  }

  private extractPrice(row: any): number | null {
    const possibleFields = [
      'harga', 'price', 'nilai', 'value', 'rata_rata',
      'harga_rata_rata', 'average_price'
    ];

    for (const field of possibleFields) {
      if (row[field]) {
        const price = this.parsePrice(row[field].toString());
        if (price && price > 0) {
          return price;
        }
      }
    }

    // If row is an array, look for numeric values
    if (Array.isArray(row)) {
      for (const value of row) {
        if (typeof value === 'number' && value > 0) {
          return value;
        }
        if (typeof value === 'string') {
          const price = this.parsePrice(value);
          if (price && price > 0) {
            return price;
          }
        }
      }
    }

    return null;
  }

  private extractDate(row: any): Date | null {
    const possibleFields = [
      'tanggal', 'date', 'periode', 'period', 'tahun', 'year',
      'bulan', 'month', 'waktu', 'time'
    ];

    for (const field of possibleFields) {
      if (row[field]) {
        const date = this.parseDate(row[field].toString());
        if (date) {
          return date;
        }
      }
    }

    // Default to current date if no date found
    return new Date();
  }

  private extractPeriod(row: any): string | null {
    const possibleFields = ['periode', 'period', 'tahun_bulan'];

    for (const field of possibleFields) {
      if (row[field] && typeof row[field] === 'string') {
        return row[field].trim();
      }
    }

    return null;
  }

  private isCommodityName(text: string): boolean {
    const lowerText = text.toLowerCase();
    const commodityKeywords = Object.keys(this.commodityMapping);
    
    return commodityKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  private mapCommodityNameToCode(commodityName: string): string | null {
    if (!commodityName) return null;

    const lowerName = commodityName.toLowerCase();
    
    for (const [keyword, code] of Object.entries(this.commodityMapping)) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return code;
      }
    }

    return null;
  }

  private mapRegionNameToCode(regionName: string | null): string | null {
    if (!regionName) return null;

    // Simple mapping - should be expanded based on actual BPS region codes
    const regionMapping: Record<string, string> = {
      'dki jakarta': '31',
      'jawa barat': '32',
      'jawa tengah': '33',
      'jawa timur': '35',
      'yogyakarta': '34',
      'banten': '36',
      // Add more regions as needed
    };

    const lowerName = regionName.toLowerCase();
    
    for (const [name, code] of Object.entries(regionMapping)) {
      if (lowerName.includes(name)) {
        return code;
      }
    }

    return null;
  }

  private determinePriceType(category: string): string {
    switch (category) {
      case 'consumer_prices':
        return 'KONSUMEN';
      case 'producer_prices':
        return 'PRODUSEN';
      default:
        return 'KONSUMEN';
    }
  }

  private determineUnit(commodityCode: string): string {
    const unitMapping: Record<string, string> = {
      'BERAS': 'kg',
      'JAGUNG': 'kg',
      'KEDELAI': 'kg',
      'GULA_PASIR': 'kg',
      'MINYAK_GORENG': 'liter',
      'DAGING_SAPI': 'kg',
      'DAGING_AYAM': 'kg',
      'TELUR_AYAM': 'kg',
      'CABAI_MERAH': 'kg',
      'BAWANG_MERAH': 'kg',
      'BAWANG_PUTIH': 'kg',
      'TOMAT': 'kg',
    };

    return unitMapping[commodityCode] || 'kg';
  }

  private validateBPSData(data: BPSPriceData[]): BPSPriceData[] {
    return data.filter(item => {
      return (
        item.commodityCode &&
        item.commodityName &&
        item.price > 0 &&
        item.date &&
        !isNaN(item.date.getTime()) &&
        item.source
      );
    });
  }

  // Override postProcess to add additional data processing
  protected async postProcess(data: BPSPriceData[]): Promise<BPSPriceData[]> {
    // Remove duplicates and sort
    const uniqueData = data.filter((item, index, array) => {
      return index === array.findIndex(t => (
        t.commodityCode === item.commodityCode &&
        t.regionCode === item.regionCode &&
        t.priceType === item.priceType &&
        Math.abs(t.date.getTime() - item.date.getTime()) < 86400000 // Within 1 day
      ));
    });

    uniqueData.sort((a, b) => b.date.getTime() - a.date.getTime());

    logger.info(`[BPS] Processed ${uniqueData.length} unique price records`);
    return uniqueData;
  }

  // Public method to get specific BPS data
  async getBPSData(commodityCode?: string, regionCode?: string): Promise<BPSPriceData[]> {
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

      return filteredData.slice(0, 100);

    } catch (error) {
      logger.error('[BPS] Failed to get BPS data:', error);
      return [];
    }
  }
}

export default BPSScraper;
