#!/usr/bin/env python3
"""
Indonesian Commodity API Integration Guide
Implementasi contoh untuk mengintegrasikan multiple API Indonesia
untuk platform monitoring komoditas pangan
"""

import asyncio
import aiohttp
import requests
import xml.etree.ElementTree as ET
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
from external_api.data_sources.client import get_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BPSAPIClient:
    """Client untuk mengakses BPS Web API"""
    
    def __init__(self, api_key: str):
        self.base_url = "https://webapi.bps.go.id/v1/api"
        self.api_key = api_key
        self.session = requests.Session()
    
    def get_domain_list(self) -> Dict[str, Any]:
        """Mendapatkan daftar domain BPS"""
        endpoint = f"{self.base_url}/domain/type/all/key/{self.api_key}"
        try:
            response = self.session.get(endpoint, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting BPS domains: {e}")
            return {"success": False, "error": str(e)}
    
    def get_consumer_price_index(self, domain: str = "0000", var_id: int = 2212) -> Dict[str, Any]:
        """Mendapatkan data Indeks Harga Konsumen Makanan"""
        endpoint = f"{self.base_url}/list/model/data/domain/{domain}/var/{var_id}/key/{self.api_key}"
        try:
            response = self.session.get(endpoint, timeout=30)
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "source": "BPS_CPI",
                "variable_id": var_id,
                "domain": domain,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting CPI data: {e}")
            return {"success": False, "error": str(e)}
    
    def get_wholesale_price_index(self, domain: str = "0000", var_id: int = 2498) -> Dict[str, Any]:
        """Mendapatkan data Indeks Harga Perdagangan Besar"""
        endpoint = f"{self.base_url}/list/model/data/domain/{domain}/var/{var_id}/key/{self.api_key}"
        try:
            response = self.session.get(endpoint, timeout=30)
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "source": "BPS_WPI",
                "variable_id": var_id,
                "domain": domain,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting WPI data: {e}")
            return {"success": False, "error": str(e)}

class BMKGWeatherClient:
    """Client untuk mengakses data cuaca BMKG"""
    
    def __init__(self):
        self.base_url = "https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast"
        self.provinces = [
            "DKIJakarta", "JawaBarat", "JawaTengah", "JawaTimur", 
            "Bali", "SumateraBarat", "SumateraUtara", "SumateraSelatan",
            "Kalimantan Barat", "KalimantanTimur", "SulawesiSelatan", "SulawesiUtara"
        ]
    
    def get_weather_data(self, province: str) -> Dict[str, Any]:
        """Mendapatkan data cuaca untuk satu provinsi"""
        url = f"{self.base_url}/DigitalForecast-{province}.xml"
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            forecast_data = self._parse_xml_forecast(root, province)
            
            return {
                "success": True,
                "source": "BMKG_Weather",
                "province": province,
                "data": forecast_data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting weather data for {province}: {e}")
            return {"success": False, "province": province, "error": str(e)}
    
    def _parse_xml_forecast(self, root: ET.Element, province: str) -> List[Dict[str, Any]]:
        """Parse XML forecast data menjadi struktur yang lebih mudah dibaca"""
        forecast_areas = []
        
        for area in root.findall('.//area'):
            area_data = {
                "area_id": area.get('id'),
                "area_description": area.get('description'),
                "province": province,
                "coordinates": {},
                "parameters": []
            }
            
            # Get coordinates
            for name_element in area.findall('name'):
                if name_element.text:
                    area_data["area_name"] = name_element.text
            
            # Get lat/lon
            lat_element = area.find('.//point[@coordinates]')
            if lat_element is not None:
                coords = lat_element.get('coordinates', '').split(',')
                if len(coords) == 2:
                    area_data["coordinates"] = {
                        "longitude": float(coords[0]),
                        "latitude": float(coords[1])
                    }
            
            # Get weather parameters
            for param in area.findall('.//parameter'):
                param_data = {
                    "id": param.get('id'),
                    "description": param.get('description'),
                    "type": param.get('type'),
                    "timeranges": []
                }
                
                for timerange in param.findall('timerange'):
                    timerange_data = {
                        "datetime": timerange.get('datetime'),
                        "value": None,
                        "unit": None
                    }
                    
                    value_element = timerange.find('value')
                    if value_element is not None:
                        timerange_data["value"] = value_element.text
                        timerange_data["unit"] = value_element.get('unit')
                    
                    param_data["timeranges"].append(timerange_data)
                
                area_data["parameters"].append(param_data)
            
            forecast_areas.append(area_data)
        
        return forecast_areas
    
    async def get_all_provinces_weather(self) -> Dict[str, Any]:
        """Mendapatkan data cuaca untuk semua provinsi secara concurrent"""
        results = {}
        async with aiohttp.ClientSession() as session:
            tasks = []
            for province in self.provinces:
                task = self._fetch_weather_async(session, province)
                tasks.append(task)
            
            province_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(province_results):
                province = self.provinces[i]
                if isinstance(result, Exception):
                    results[province] = {"success": False, "error": str(result)}
                else:
                    results[province] = result
        
        return {
            "success": True,
            "source": "BMKG_Weather_All",
            "total_provinces": len(self.provinces),
            "successful": len([r for r in results.values() if r.get("success")]),
            "data": results,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _fetch_weather_async(self, session: aiohttp.ClientSession, province: str) -> Dict[str, Any]:
        """Fetch weather data secara asynchronous"""
        url = f"{self.base_url}/DigitalForecast-{province}.xml"
        try:
            async with session.get(url, timeout=30) as response:
                response.raise_for_status()
                content = await response.text()
                
                root = ET.fromstring(content)
                forecast_data = self._parse_xml_forecast(root, province)
                
                return {
                    "success": True,
                    "province": province,
                    "data": forecast_data
                }
        except Exception as e:
            return {"success": False, "province": province, "error": str(e)}

class CommodityDataIntegrator:
    """Integrator untuk menggabungkan data dari multiple sources"""
    
    def __init__(self, bps_api_key: str):
        self.bps_client = BPSAPIClient(bps_api_key)
        self.bmkg_client = BMKGWeatherClient()
        self.commodities_client = None
        self._initialize_commodities_client()
    
    def _initialize_commodities_client(self):
        """Initialize global commodities client"""
        try:
            self.commodities_client = get_client()
        except Exception as e:
            logger.error(f"Error initializing commodities client: {e}")
    
    async def get_comprehensive_data(self) -> Dict[str, Any]:
        """Mendapatkan data komprehensif dari semua sumber"""
        logger.info("Starting comprehensive data collection...")
        
        results = {
            "collection_timestamp": datetime.now().isoformat(),
            "sources": {},
            "summary": {}
        }
        
        # 1. BPS Data
        logger.info("Collecting BPS data...")
        try:
            cpi_data = self.bps_client.get_consumer_price_index()
            wpi_data = self.bps_client.get_wholesale_price_index()
            results["sources"]["bps"] = {
                "consumer_price_index": cpi_data,
                "wholesale_price_index": wpi_data
            }
        except Exception as e:
            results["sources"]["bps"] = {"error": str(e)}
        
        # 2. BMKG Weather Data
        logger.info("Collecting BMKG weather data...")
        try:
            weather_data = await self.bmkg_client.get_all_provinces_weather()
            results["sources"]["bmkg"] = weather_data
        except Exception as e:
            results["sources"]["bmkg"] = {"error": str(e)}
        
        # 3. Global Commodities Data
        logger.info("Collecting global commodities data...")
        try:
            if self.commodities_client:
                global_data = await self._get_global_commodities()
                results["sources"]["global_commodities"] = global_data
            else:
                results["sources"]["global_commodities"] = {"error": "Client not initialized"}
        except Exception as e:
            results["sources"]["global_commodities"] = {"error": str(e)}
        
        # Generate summary
        results["summary"] = self._generate_summary(results)
        
        return results
    
    async def _get_global_commodities(self) -> Dict[str, Any]:
        """Mendapatkan data komoditas global"""
        try:
            # Get supported commodities
            supported = await self.commodities_client.commodities.get_supported_commodities()
            
            if supported.get("success"):
                # Get prices for agricultural commodities
                agricultural_commodities = ["WHEAT", "CORN", "SUGAR", "COFFEE", "COCOA"]
                prices = await self.commodities_client.commodities.get_commodities_price(
                    commodity_code=",".join(agricultural_commodities),
                    currency_code="USD"
                )
                
                return {
                    "success": True,
                    "supported_commodities": supported,
                    "agricultural_prices": prices,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {"success": False, "error": "Failed to get supported commodities"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _generate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary dari hasil collection"""
        summary = {
            "successful_sources": 0,
            "failed_sources": 0,
            "data_points_collected": 0,
            "coverage": {}
        }
        
        for source_name, source_data in results.get("sources", {}).items():
            if source_data.get("success", False) or (not source_data.get("error")):
                summary["successful_sources"] += 1
                
                # Count data points
                if source_name == "bmkg":
                    weather_data = source_data.get("data", {})
                    summary["data_points_collected"] += len(weather_data)
                    summary["coverage"]["weather_provinces"] = len(weather_data)
                
                elif source_name == "bps":
                    bps_endpoints = ["consumer_price_index", "wholesale_price_index"]
                    successful_bps = sum(1 for ep in bps_endpoints 
                                       if source_data.get(ep, {}).get("success"))
                    summary["data_points_collected"] += successful_bps
                    summary["coverage"]["bps_endpoints"] = successful_bps
                
                elif source_name == "global_commodities":
                    if source_data.get("agricultural_prices", {}).get("success"):
                        prices_data = source_data["agricultural_prices"].get("data", {})
                        commodity_count = len(prices_data.get("rates", {}))
                        summary["data_points_collected"] += commodity_count
                        summary["coverage"]["global_commodities"] = commodity_count
            else:
                summary["failed_sources"] += 1
        
        return summary
    
    def save_data(self, data: Dict[str, Any], filename: str = None):
        """Simpan data ke file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"/workspace/data/commodity_data_{timestamp}.json"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {filename}")
            return filename
        except Exception as e:
            logger.error(f"Error saving data: {e}")
            return None

class CommodityAnalyzer:
    """Analyzer untuk melakukan analisis data komoditas"""
    
    def __init__(self):
        pass
    
    def analyze_price_weather_correlation(self, commodity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analisis korelasi harga dengan cuaca"""
        try:
            analysis = {
                "correlation_analysis": {},
                "weather_impact_score": {},
                "recommendations": []
            }
            
            # Extract weather data
            weather_data = commodity_data.get("sources", {}).get("bmkg", {}).get("data", {})
            
            # Extract price data  
            bps_data = commodity_data.get("sources", {}).get("bps", {})
            
            if weather_data and bps_data:
                # Simple correlation analysis
                analysis["weather_coverage"] = len(weather_data)
                analysis["price_data_available"] = bool(bps_data.get("consumer_price_index", {}).get("success"))
                
                # Generate insights
                if analysis["price_data_available"]:
                    analysis["recommendations"].append("Data harga dan cuaca tersedia - dapat dilakukan analisis korelasi")
                else:
                    analysis["recommendations"].append("Data harga terbatas - perlukan sumber data tambahan")
                
                if analysis["weather_coverage"] > 5:
                    analysis["recommendations"].append("Coverage cuaca baik - dapat digunakan untuk prediksi regional")
                
            return analysis
            
        except Exception as e:
            return {"error": str(e)}

# Example usage and testing
async def demo_integration():
    """Demo penggunaan integrasi API"""
    print("🚀 Demo Indonesian Commodity API Integration")
    print("=" * 50)
    
    # Initialize (dalam production, gunakan real API key)
    bps_api_key = "YOUR_BPS_API_KEY_HERE"  # Dapatkan dari webapi.bps.go.id
    
    # Create integrator
    integrator = CommodityDataIntegrator(bps_api_key)
    analyzer = CommodityAnalyzer()
    
    # Collect comprehensive data
    print("📊 Collecting data from all sources...")
    comprehensive_data = await integrator.get_comprehensive_data()
    
    # Save data
    filename = integrator.save_data(comprehensive_data)
    print(f"💾 Data saved to: {filename}")
    
    # Analyze data
    print("🔍 Performing analysis...")
    analysis = analyzer.analyze_price_weather_correlation(comprehensive_data)
    
    # Print summary
    summary = comprehensive_data.get("summary", {})
    print(f"\n📈 Collection Summary:")
    print(f"  Successful sources: {summary.get('successful_sources', 0)}")
    print(f"  Failed sources: {summary.get('failed_sources', 0)}")
    print(f"  Data points collected: {summary.get('data_points_collected', 0)}")
    print(f"  Coverage: {summary.get('coverage', {})}")
    
    print(f"\n🔍 Analysis Results:")
    print(f"  Weather coverage: {analysis.get('weather_coverage', 0)} provinces")
    print(f"  Price data available: {analysis.get('price_data_available', False)}")
    print(f"  Recommendations: {len(analysis.get('recommendations', []))}")
    
    for i, rec in enumerate(analysis.get("recommendations", []), 1):
        print(f"    {i}. {rec}")
    
    return comprehensive_data, analysis

if __name__ == "__main__":
    # Run demo
    asyncio.run(demo_integration())
