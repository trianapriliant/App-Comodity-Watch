import { BaseScraper, ScrapingResult, ScrapingConfig } from './BaseScraper';
import { logger } from '../config/logger';
import xml2js from 'xml2js';

export interface BMKGWeatherData {
  regionId: string;
  regionName: string;
  weatherType: string;
  value: number;
  unit: string;
  date: Date;
  source: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

export class BMKGScraper extends BaseScraper {
  private readonly endpoints = {
    // BMKG XML data endpoints
    weather: '/DataMKG/MEWS/DigitalForecast/DigitalForecast.xml',
    earthquakes: '/DataMKG/TEWS/gempadirasakan.xml',
    maritimeWeather: '/DataMKG/MEWS/forecast_weather.xml',
    climateData: '/DataMKG/MEWS/climate_data.xml',
  };

  private readonly regionMapping: Record<string, string> = {
    'DKI Jakarta': '31',
    'Jawa Barat': '32',
    'Jawa Tengah': '33',
    'DI Yogyakarta': '34',
    'Jawa Timur': '35',
    'Banten': '36',
    'Bali': '51',
    'Nusa Tenggara Barat': '52',
    'Nusa Tenggara Timur': '53',
    'Kalimantan Barat': '61',
    'Kalimantan Tengah': '62',
    'Kalimantan Selatan': '63',
    'Kalimantan Timur': '64',
    'Kalimantan Utara': '65',
    'Sulawesi Utara': '71',
    'Sulawesi Tengah': '72',
    'Sulawesi Selatan': '73',
    'Sulawesi Tenggara': '74',
    'Gorontalo': '75',
    'Sulawesi Barat': '76',
    'Maluku': '81',
    'Maluku Utara': '82',
    'Papua Barat': '91',
    'Papua': '94',
    'Papua Selatan': '95',
    'Papua Tengah': '96',
    'Papua Pegunungan': '97',
    'Sumatera Utara': '12',
    'Sumatera Barat': '13',
    'Riau': '14',
    'Jambi': '15',
    'Sumatera Selatan': '16',
    'Bengkulu': '17',
    'Lampung': '18',
    'Kepulauan Bangka Belitung': '19',
    'Kepulauan Riau': '21',
    'Aceh': '11',
  };

  constructor() {
    const config: Partial<ScrapingConfig> = {
      baseUrl: 'https://data.bmkg.go.id',
      timeout: 45000,
      retries: 3,
      retryDelay: 3000,
      rateLimit: 5000, // 5 seconds between requests
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    };

    super('bmkg-weather', config);
  }

  async scrapeData(): Promise<ScrapingResult<BMKGWeatherData>> {
    try {
      logger.info('[BMKG] Starting weather data scraping');

      const weatherData: BMKGWeatherData[] = [];

      // Scrape different types of data
      const [
        digitalForecast,
        climateData,
        maritimeWeather
      ] = await Promise.allSettled([
        this.scrapeDigitalForecast(),
        this.scrapeClimateData(),
        this.scrapeMaritimeWeather(),
      ]);

      // Process results
      if (digitalForecast.status === 'fulfilled') {
        weatherData.push(...digitalForecast.value);
      } else {
        logger.error('[BMKG] Digital forecast failed:', digitalForecast.reason);
      }

      if (climateData.status === 'fulfilled') {
        weatherData.push(...climateData.value);
      } else {
        logger.warn('[BMKG] Climate data failed:', climateData.reason);
      }

      if (maritimeWeather.status === 'fulfilled') {
        weatherData.push(...maritimeWeather.value);
      } else {
        logger.warn('[BMKG] Maritime weather failed:', maritimeWeather.reason);
      }

      const validatedData = this.validateBMKGData(weatherData);

      return {
        success: true,
        data: validatedData,
        source: this.source,
        timestamp: new Date(),
        totalRecords: validatedData.length,
      };

    } catch (error) {
      logger.error('[BMKG] Scraping failed:', error);
      return {
        success: false,
        data: [],
        source: this.source,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async scrapeDigitalForecast(): Promise<BMKGWeatherData[]> {
    try {
      const cacheKey = this.createCacheKey('digital-forecast');
      const cached = await this.getCachedData<BMKGWeatherData[]>(cacheKey);
      
      if (cached) {
        logger.debug('[BMKG] Using cached digital forecast data');
        return cached;
      }

      const xmlData = await this.makeRequest(this.endpoints.weather);
      const parsedData = await this.parseXML(xmlData);

      const weatherData: BMKGWeatherData[] = [];

      // Parse BMKG digital forecast XML structure
      if (parsedData.data && parsedData.data.forecast) {
        const forecasts = Array.isArray(parsedData.data.forecast) 
          ? parsedData.data.forecast 
          : [parsedData.data.forecast];

        for (const forecast of forecasts) {
          if (forecast.area) {
            const areas = Array.isArray(forecast.area) ? forecast.area : [forecast.area];
            
            for (const area of areas) {
              const regionData = this.processAreaData(area);
              weatherData.push(...regionData);
            }
          }
        }
      }

      // Cache the results
      await this.setCachedData(cacheKey, weatherData, 3600); // Cache for 1 hour

      logger.info(`[BMKG] Scraped ${weatherData.length} digital forecast records`);
      return weatherData;

    } catch (error) {
      logger.error('[BMKG] Failed to scrape digital forecast:', error);
      return [];
    }
  }

  private async scrapeClimateData(): Promise<BMKGWeatherData[]> {
    try {
      // Try alternative BMKG endpoints for climate data
      const endpoints = [
        '/DataMKG/MEWS/climate_data.xml',
        '/autogempa.xml',
        '/DataMKG/MEWS/forecast.xml',
      ];

      for (const endpoint of endpoints) {
        try {
          const xmlData = await this.makeRequest(endpoint);
          const parsedData = await this.parseXML(xmlData);
          
          if (parsedData && Object.keys(parsedData).length > 0) {
            return this.processClimateXML(parsedData);
          }
        } catch (error) {
          logger.debug(`[BMKG] Climate endpoint ${endpoint} failed, trying next`);
        }
      }

      logger.warn('[BMKG] All climate data endpoints failed');
      return [];

    } catch (error) {
      logger.error('[BMKG] Failed to scrape climate data:', error);
      return [];
    }
  }

  private async scrapeMaritimeWeather(): Promise<BMKGWeatherData[]> {
    try {
      const xmlData = await this.makeRequest(this.endpoints.maritimeWeather);
      const parsedData = await this.parseXML(xmlData);

      return this.processMaritimeXML(parsedData);

    } catch (error) {
      logger.warn('[BMKG] Failed to scrape maritime weather:', error);
      return [];
    }
  }

  private async parseXML(xmlString: string): Promise<any> {
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });

      return await parser.parseStringPromise(xmlString);
    } catch (error) {
      logger.error('[BMKG] XML parsing error:', error);
      throw new Error('Failed to parse XML data');
    }
  }

  private processAreaData(area: any): BMKGWeatherData[] {
    const weatherData: BMKGWeatherData[] = [];
    
    try {
      const regionName = area.$.description || area.name || 'Unknown';
      const regionId = this.getRegionId(regionName);
      const coordinates = area.$.latitude && area.$.longitude ? {
        latitude: parseFloat(area.$.latitude),
        longitude: parseFloat(area.$.longitude),
      } : undefined;

      // Process weather parameters
      if (area.parameter) {
        const parameters = Array.isArray(area.parameter) ? area.parameter : [area.parameter];
        
        for (const param of parameters) {
          const weatherRecords = this.processWeatherParameter(param, regionId, regionName, coordinates);
          weatherData.push(...weatherRecords);
        }
      }

    } catch (error) {
      logger.error('[BMKG] Error processing area data:', error);
    }

    return weatherData;
  }

  private processWeatherParameter(
    parameter: any, 
    regionId: string, 
    regionName: string, 
    coordinates?: { latitude: number; longitude: number }
  ): BMKGWeatherData[] {
    const weatherData: BMKGWeatherData[] = [];

    try {
      const paramId = parameter.$.id;
      const paramDescription = parameter.$.description;
      
      // Map BMKG parameter IDs to our weather types
      const weatherType = this.mapParameterToWeatherType(paramId);
      if (!weatherType) return [];

      // Process time ranges
      if (parameter.timerange) {
        const timeranges = Array.isArray(parameter.timerange) ? parameter.timerange : [parameter.timerange];
        
        for (const timerange of timeranges) {
          const date = this.parseDate(timerange.$.datetime);
          if (!date) continue;

          // Process values
          if (timerange.value) {
            const values = Array.isArray(timerange.value) ? timerange.value : [timerange.value];
            
            for (const value of values) {
              const weatherValue = this.extractWeatherValue(value, weatherType);
              if (weatherValue !== null) {
                weatherData.push({
                  regionId,
                  regionName,
                  weatherType,
                  value: weatherValue,
                  unit: this.getWeatherUnit(weatherType),
                  date,
                  source: 'BMKG',
                  coordinates,
                  description: paramDescription,
                });
              }
            }
          }
        }
      }

    } catch (error) {
      logger.error('[BMKG] Error processing weather parameter:', error);
    }

    return weatherData;
  }

  private processClimateXML(parsedData: any): BMKGWeatherData[] {
    // Process different climate XML structures
    const weatherData: BMKGWeatherData[] = [];

    try {
      // Handle different XML structures that BMKG might use
      if (parsedData.Infogempa) {
        // This is earthquake data, but might contain weather info
        return this.processEarthquakeData(parsedData.Infogempa);
      }

      if (parsedData.weatherforecast) {
        return this.processWeatherForecast(parsedData.weatherforecast);
      }

      // Add more handlers for different XML structures as needed

    } catch (error) {
      logger.error('[BMKG] Error processing climate XML:', error);
    }

    return weatherData;
  }

  private processMaritimeXML(parsedData: any): BMKGWeatherData[] {
    const weatherData: BMKGWeatherData[] = [];

    try {
      // Process maritime weather data structure
      // This would depend on the actual XML structure from BMKG

    } catch (error) {
      logger.error('[BMKG] Error processing maritime XML:', error);
    }

    return weatherData;
  }

  private processEarthquakeData(earthquakeData: any): BMKGWeatherData[] {
    // Even though this is earthquake data, it might contain atmospheric conditions
    return [];
  }

  private processWeatherForecast(forecastData: any): BMKGWeatherData[] {
    const weatherData: BMKGWeatherData[] = [];

    try {
      // Process weather forecast XML structure
      // Implementation depends on actual XML structure

    } catch (error) {
      logger.error('[BMKG] Error processing weather forecast:', error);
    }

    return weatherData;
  }

  private mapParameterToWeatherType(paramId: string): string | null {
    const parameterMap: Record<string, string> = {
      't': 'TEMPERATURE',
      'temp': 'TEMPERATURE',
      'temperature': 'TEMPERATURE',
      'hu': 'HUMIDITY',
      'humidity': 'HUMIDITY',
      'rh': 'HUMIDITY',
      'ws': 'WIND_SPEED',
      'wind_speed': 'WIND_SPEED',
      'windspeed': 'WIND_SPEED',
      'wd': 'WIND_DIRECTION',
      'wind_direction': 'WIND_DIRECTION',
      'pr': 'PRESSURE',
      'pressure': 'PRESSURE',
      'mslp': 'PRESSURE',
      'weather': 'WEATHER_CONDITION',
      'wd_deg': 'WIND_DIRECTION',
    };

    return parameterMap[paramId.toLowerCase()] || null;
  }

  private extractWeatherValue(valueData: any, weatherType: string): number | null {
    try {
      let value: number;

      if (typeof valueData === 'object') {
        // Handle different value structures
        value = parseFloat(valueData._ || valueData.value || valueData.$text || valueData);
      } else {
        value = parseFloat(valueData);
      }

      if (isNaN(value)) return null;

      // Convert units if necessary
      switch (weatherType) {
        case 'TEMPERATURE':
          // Ensure temperature is in Celsius
          if (value > 100) {
            value = value - 273.15; // Convert from Kelvin
          }
          break;
        case 'HUMIDITY':
          // Ensure humidity is in percentage
          if (value > 1 && value <= 100) {
            // Already in percentage
          } else if (value <= 1) {
            value = value * 100; // Convert from decimal
          }
          break;
        case 'PRESSURE':
          // Ensure pressure is in hPa/mbar
          if (value > 10000) {
            value = value / 100; // Convert from Pa to hPa
          }
          break;
      }

      return value;

    } catch (error) {
      logger.error('[BMKG] Error extracting weather value:', error);
      return null;
    }
  }

  private getWeatherUnit(weatherType: string): string {
    const unitMap: Record<string, string> = {
      'TEMPERATURE': '°C',
      'HUMIDITY': '%',
      'WIND_SPEED': 'm/s',
      'WIND_DIRECTION': '°',
      'PRESSURE': 'hPa',
      'RAINFALL': 'mm',
      'WEATHER_CONDITION': '',
    };

    return unitMap[weatherType] || '';
  }

  private getRegionId(regionName: string): string {
    // Try to match region name to ID
    for (const [name, id] of Object.entries(this.regionMapping)) {
      if (regionName.toLowerCase().includes(name.toLowerCase())) {
        return id;
      }
    }

    // Default or generate ID based on name
    return regionName.replace(/\s+/g, '_').toLowerCase();
  }

  private validateBMKGData(data: BMKGWeatherData[]): BMKGWeatherData[] {
    return data.filter(item => {
      return (
        item.regionId &&
        item.regionName &&
        item.weatherType &&
        typeof item.value === 'number' &&
        !isNaN(item.value) &&
        item.date &&
        !isNaN(item.date.getTime()) &&
        item.source
      );
    });
  }

  // Override postProcess to add additional data processing
  protected async postProcess(data: BMKGWeatherData[]): Promise<BMKGWeatherData[]> {
    // Remove duplicates based on region, weather type, and date
    const uniqueData = data.filter((item, index, array) => {
      return index === array.findIndex(t => (
        t.regionId === item.regionId &&
        t.weatherType === item.weatherType &&
        Math.abs(t.date.getTime() - item.date.getTime()) < 3600000 // Within 1 hour
      ));
    });

    // Sort by date (newest first)
    uniqueData.sort((a, b) => b.date.getTime() - a.date.getTime());

    logger.info(`[BMKG] Processed ${uniqueData.length} unique weather records`);
    return uniqueData;
  }

  // Public method to get weather data for specific region and type
  async getWeatherData(regionId?: string, weatherType?: string): Promise<BMKGWeatherData[]> {
    try {
      const result = await this.run();
      
      if (!result.success) {
        return [];
      }

      let filteredData = result.data;

      if (regionId) {
        filteredData = filteredData.filter(item => 
          item.regionId === regionId
        );
      }

      if (weatherType) {
        filteredData = filteredData.filter(item => 
          item.weatherType === weatherType
        );
      }

      return filteredData.slice(0, 100); // Return latest 100 records

    } catch (error) {
      logger.error('[BMKG] Failed to get weather data:', error);
      return [];
    }
  }
}

// Install xml2js if not already installed
export default BMKGScraper;
