"""
Demo Data Generation untuk User Testing
Menghasilkan sample data realistic untuk 5 komoditas utama
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import random
from typing import Dict, List

# Set random seed untuk reproducibility
np.random.seed(42)
random.seed(42)

class DemoDataGenerator:
    """Generator untuk sample data realistic untuk demo sessions."""
    
    def __init__(self):
        self.commodities = {
            "CABAI_MERAH": {
                "name": "Cabai Merah",
                "unit": "kg",
                "base_price": 45000,
                "volatility": 0.25,
                "seasonal_factor": 1.3,
                "weather_sensitivity": 0.4
            },
            "BERAS": {
                "name": "Beras",
                "unit": "kg", 
                "base_price": 12000,
                "volatility": 0.08,
                "seasonal_factor": 1.1,
                "weather_sensitivity": 0.2
            },
            "TOMAT": {
                "name": "Tomat",
                "unit": "kg",
                "base_price": 8500,
                "volatility": 0.20,
                "seasonal_factor": 1.2,
                "weather_sensitivity": 0.35
            },
            "BAWANG_MERAH": {
                "name": "Bawang Merah", 
                "unit": "kg",
                "base_price": 25000,
                "volatility": 0.18,
                "seasonal_factor": 1.4,
                "weather_sensitivity": 0.25
            },
            "DAGING_AYAM": {
                "name": "Daging Ayam",
                "unit": "kg",
                "base_price": 32000,
                "volatility": 0.12,
                "seasonal_factor": 1.15,
                "weather_sensitivity": 0.1
            }
        }
        
        self.regions = {
            "11": {"name": "Aceh", "type": "rural", "development": "medium"},
            "12": {"name": "Sumatera Utara", "type": "mixed", "development": "high"},
            "31": {"name": "DKI Jakarta", "type": "urban", "development": "very_high"},
            "32": {"name": "Jawa Barat", "type": "mixed", "development": "high"},
            "33": {"name": "Jawa Tengah", "type": "mixed", "development": "medium"},
            "34": {"name": "DI Yogyakarta", "type": "urban", "development": "high"},
            "35": {"name": "Jawa Timur", "type": "mixed", "development": "high"},
            "51": {"name": "Bali", "type": "tourism", "development": "high"},
            "73": {"name": "Sulawesi Selatan", "type": "mixed", "development": "medium"},
            "64": {"name": "Kalimantan Timur", "type": "industrial", "development": "high"}
        }
        
        self.start_date = datetime.now() - timedelta(days=180)  # 6 bulan historical
        self.end_date = datetime.now() + timedelta(days=30)     # 30 hari prediksi
    
    def generate_price_series(self, commodity_code: str, region_code: str, days: int) -> List[Dict]:
        """Generate realistic price series untuk komoditas dan region tertentu."""
        
        commodity = self.commodities[commodity_code]
        region = self.regions[region_code]
        
        # Base price dengan regional adjustment
        regional_multiplier = {
            "urban": 1.15,
            "mixed": 1.0, 
            "rural": 0.9,
            "tourism": 1.2,
            "industrial": 1.1
        }
        
        base_price = commodity["base_price"] * regional_multiplier[region["type"]]
        
        prices = []
        current_date = self.start_date
        
        for day in range(days):
            # Trend component (slight upward over time)
            trend = 1 + (day * 0.0002)
            
            # Seasonal component (stronger untuk commodities dengan high seasonal_factor)
            seasonal = 1 + (commodity["seasonal_factor"] - 1) * np.sin(2 * np.pi * day / 365) * 0.3
            
            # Weekly pattern (weekends slightly higher)
            weekly = 1 + 0.02 if current_date.weekday() >= 5 else 1.0
            
            # Random volatility
            random_factor = np.random.normal(1, commodity["volatility"] * 0.3)
            
            # Weather events (random spikes untuk weather-sensitive commodities)
            weather_spike = 1.0
            if random.random() < 0.05:  # 5% chance of weather event
                weather_spike = 1 + (commodity["weather_sensitivity"] * random.uniform(0.1, 0.4))
            
            # Calculate final price
            price = base_price * trend * seasonal * weekly * random_factor * weather_spike
            
            # Add some realistic constraints
            price = max(price, base_price * 0.5)  # Min 50% of base
            price = min(price, base_price * 2.0)  # Max 200% of base
            
            prices.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "commodity_code": commodity_code,
                "commodity_name": commodity["name"],
                "region_code": region_code,
                "region_name": region["name"],
                "price": round(price, 0),
                "unit": commodity["unit"],
                "currency": "IDR",
                "price_type": "KONSUMEN",
                "source": "DEMO_DATA",
                "is_prediction": day >= 180  # Last 30 days are predictions
            })
            
            current_date += timedelta(days=1)
        
        return prices
    
    def generate_weather_data(self, region_code: str, days: int) -> List[Dict]:
        """Generate weather data untuk correlation analysis."""
        
        weather_data = []
        current_date = self.start_date
        
        for day in range(days):
            # Seasonal patterns untuk Indonesia
            day_of_year = current_date.timetuple().tm_yday
            
            # Temperature (tropical pattern)
            base_temp = 27 + 3 * np.sin(2 * np.pi * day_of_year / 365)
            temperature = base_temp + np.random.normal(0, 2)
            
            # Rainfall (wet season Nov-Apr, dry season May-Oct)
            if (day_of_year >= 305 or day_of_year <= 120):  # Wet season
                rainfall = np.random.exponential(8) + random.uniform(0, 15)
            else:  # Dry season
                rainfall = np.random.exponential(2) + random.uniform(0, 5)
            
            # Humidity
            humidity = 70 + 10 * np.sin(2 * np.pi * day_of_year / 365) + np.random.normal(0, 8)
            humidity = max(60, min(95, humidity))
            
            for weather_type, value, unit in [
                ("TEMPERATURE", temperature, "°C"),
                ("RAINFALL", rainfall, "mm"),
                ("HUMIDITY", humidity, "%")
            ]:
                weather_data.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "region_code": region_code,
                    "region_name": self.regions[region_code]["name"],
                    "weather_type": weather_type,
                    "value": round(value, 1),
                    "unit": unit,
                    "source": "DEMO_BMKG"
                })
            
            current_date += timedelta(days=1)
        
        return weather_data
    
    def generate_anomaly_examples(self) -> List[Dict]:
        """Generate contoh anomali yang jelas untuk demo."""
        
        anomalies = [
            {
                "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                "commodity_code": "CABAI_MERAH",
                "commodity_name": "Cabai Merah",
                "region_code": "32",
                "region_name": "Jawa Barat",
                "actual_price": 75000,
                "expected_price": 45000,
                "anomaly_score": 0.92,
                "anomaly_type": "price_spike",
                "severity": "critical",
                "explanation": "Harga naik 67% akibat curah hujan tinggi yang merusak tanaman. Pasokan dari sentra produksi terganggu.",
                "weather_correlation": {
                    "rainfall_mm": 185,
                    "days_heavy_rain": 4,
                    "impact_factor": 0.85
                }
            },
            {
                "date": (datetime.now() - timedelta(days=12)).strftime("%Y-%m-%d"),
                "commodity_code": "TOMAT",
                "commodity_name": "Tomat",
                "region_code": "31",
                "region_name": "DKI Jakarta",
                "actual_price": 15000,
                "expected_price": 8500,
                "anomaly_score": 0.78,
                "anomaly_type": "supply_shortage",
                "severity": "high",
                "explanation": "Kelangkaan pasokan dari daerah supplier utama (Jawa Barat) karena panen mundur.",
                "supply_chain_impact": {
                    "supplier_regions": ["32", "33"],
                    "transport_delay": "2-3 days",
                    "stock_level": "critical"
                }
            },
            {
                "date": (datetime.now() - timedelta(days=8)).strftime("%Y-%m-%d"),
                "commodity_code": "BAWANG_MERAH",
                "commodity_name": "Bawang Merah",
                "region_code": "35",
                "region_name": "Jawa Timur",
                "actual_price": 18000,
                "expected_price": 25000,
                "anomaly_score": 0.65,
                "anomaly_type": "price_drop",
                "severity": "medium",
                "explanation": "Harga turun karena panen raya simultan di beberapa daerah, menyebabkan oversupply sementara.",
                "market_dynamics": {
                    "harvest_volume": "+45%",
                    "storage_capacity": "limited",
                    "demand_elasticity": "low"
                }
            }
        ]
        
        return anomalies
    
    def generate_prediction_examples(self) -> List[Dict]:
        """Generate contoh prediksi dengan confidence intervals."""
        
        predictions = []
        
        for commodity_code in ["CABAI_MERAH", "BERAS", "TOMAT"]:
            commodity = self.commodities[commodity_code]
            
            for days_ahead in [1, 3, 7, 14, 30]:
                prediction_date = datetime.now() + timedelta(days=days_ahead)
                
                # Base prediction
                base_price = commodity["base_price"]
                trend_factor = 1 + (days_ahead * 0.001)
                seasonal_factor = 1 + 0.1 * np.sin(2 * np.pi * prediction_date.timetuple().tm_yday / 365)
                
                predicted_price = base_price * trend_factor * seasonal_factor
                
                # Confidence intervals (wider untuk longer horizons)
                confidence = max(0.6, 0.95 - (days_ahead * 0.01))
                error_margin = commodity["volatility"] * np.sqrt(days_ahead) * 0.1
                
                lower_bound = predicted_price * (1 - error_margin)
                upper_bound = predicted_price * (1 + error_margin)
                
                predictions.append({
                    "commodity_code": commodity_code,
                    "commodity_name": commodity["name"],
                    "region_code": "32",  # Jawa Barat sebagai default
                    "prediction_date": prediction_date.strftime("%Y-%m-%d"),
                    "horizon_days": days_ahead,
                    "predicted_price": round(predicted_price, 0),
                    "lower_bound": round(lower_bound, 0),
                    "upper_bound": round(upper_bound, 0),
                    "confidence": round(confidence, 2),
                    "model_type": "prophet" if days_ahead <= 14 else "lstm",
                    "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
        
        return predictions
    
    def generate_market_intelligence(self) -> Dict:
        """Generate market intelligence summary untuk regulator."""
        
        return {
            "summary_date": datetime.now().strftime("%Y-%m-%d"),
            "period": "last_30_days",
            "national_inflation": {
                "food_inflation_rate": 3.2,
                "target_rate": 3.0,
                "status": "slightly_above_target",
                "contributing_commodities": [
                    {"commodity": "CABAI_MERAH", "contribution": 1.2},
                    {"commodity": "TOMAT", "contribution": 0.8},
                    {"commodity": "BAWANG_MERAH", "contribution": 0.6}
                ]
            },
            "regional_highlights": [
                {
                    "region": "DKI Jakarta",
                    "status": "stable",
                    "avg_price_change": 2.1,
                    "alert_level": "green"
                },
                {
                    "region": "Jawa Barat", 
                    "status": "volatile",
                    "avg_price_change": 8.5,
                    "alert_level": "yellow"
                },
                {
                    "region": "Jawa Timur",
                    "status": "declining",
                    "avg_price_change": -3.2,
                    "alert_level": "green"
                }
            ],
            "supply_chain_alerts": [
                {
                    "type": "weather_impact",
                    "severity": "medium",
                    "affected_regions": ["32", "33"],
                    "commodities": ["CABAI_MERAH", "TOMAT"],
                    "estimated_duration": "7-14 days"
                }
            ],
            "policy_recommendations": [
                "Monitor Jawa Barat region closely untuk potential intervention",
                "Consider temporary import facilitation untuk cabai merah",
                "Enhance early warning system untuk weather-sensitive crops"
            ]
        }
    
    def save_all_demo_data(self, output_dir: str = "/workspace/user-testing-materials/sample-data"):
        """Generate dan save semua demo data."""
        
        print("🔄 Generating comprehensive demo data...")
        
        # 1. Price data untuk semua komoditas dan region
        all_prices = []
        for commodity_code in self.commodities.keys():
            for region_code in self.regions.keys():
                prices = self.generate_price_series(commodity_code, region_code, 210)
                all_prices.extend(prices)
        
        price_df = pd.DataFrame(all_prices)
        price_df.to_csv(f"{output_dir}/historical_prices_demo.csv", index=False)
        price_df.to_json(f"{output_dir}/historical_prices_demo.json", orient="records", indent=2)
        
        # 2. Weather data untuk key regions
        all_weather = []
        for region_code in ["31", "32", "35"]:  # Key regions
            weather = self.generate_weather_data(region_code, 210)
            all_weather.extend(weather)
        
        weather_df = pd.DataFrame(all_weather)
        weather_df.to_csv(f"{output_dir}/weather_data_demo.csv", index=False)
        weather_df.to_json(f"{output_dir}/weather_data_demo.json", orient="records", indent=2)
        
        # 3. Anomaly examples
        anomalies = self.generate_anomaly_examples()
        with open(f"{output_dir}/anomaly_examples.json", "w") as f:
            json.dump(anomalies, f, indent=2)
        
        # 4. Prediction examples
        predictions = self.generate_prediction_examples()
        with open(f"{output_dir}/prediction_examples.json", "w") as f:
            json.dump(predictions, f, indent=2)
        
        # 5. Market intelligence
        market_intel = self.generate_market_intelligence()
        with open(f"{output_dir}/market_intelligence.json", "w") as f:
            json.dump(market_intel, f, indent=2)
        
        # 6. Summary statistics
        summary = {
            "generation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_period": {
                "start_date": self.start_date.strftime("%Y-%m-%d"),
                "end_date": self.end_date.strftime("%Y-%m-%d"),
                "historical_days": 180,
                "prediction_days": 30
            },
            "coverage": {
                "commodities": len(self.commodities),
                "regions": len(self.regions),
                "total_price_records": len(all_prices),
                "weather_records": len(all_weather),
                "anomaly_examples": len(anomalies),
                "prediction_examples": len(predictions)
            },
            "data_quality": {
                "completeness": "100%",
                "accuracy": "synthetic_realistic",
                "consistency": "validated",
                "timeliness": "current"
            }
        }
        
        with open(f"{output_dir}/data_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        print("✅ Demo data generation completed!")
        print(f"📁 Files saved to: {output_dir}")
        print(f"📊 Generated {len(all_prices):,} price records")
        print(f"🌤️ Generated {len(all_weather):,} weather records")
        print(f"🚨 Created {len(anomalies)} anomaly examples")
        print(f"🔮 Created {len(predictions)} prediction examples")
        
        return summary

if __name__ == "__main__":
    generator = DemoDataGenerator()
    summary = generator.save_all_demo_data()
    print("\n📋 Data Summary:")
    print(json.dumps(summary, indent=2))
