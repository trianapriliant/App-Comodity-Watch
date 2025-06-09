# Demo Backend API Endpoints - Komoditas Watch Indonesia

## 🔗 **BACKEND API STRUCTURE & RESPONSES**

### **BASE URL**: `http://localhost:3000/api/v1`

---

## 🔐 **1. AUTHENTICATION ENDPOINTS**

### **POST /auth/register** - User Registration
```json
Request:
{
    "email": "petani@example.com",
    "password": "securepassword123",
    "name": "Ahmad Petani",
    "role": "PETANI",
    "phone": "081234567890",
    "region_code": "32"
}

Response:
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "id": "uuid-user-id",
            "email": "petani@example.com", 
            "name": "Ahmad Petani",
            "role": "PETANI",
            "region_code": "32",
            "region_name": "Jawa Barat",
            "verified": false,
            "created_at": "2025-06-07T12:00:00Z"
        },
        "tokens": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "expires_in": 3600
        }
    }
}
```

### **POST /auth/login** - User Login
```json
Request:
{
    "email": "petani@example.com",
    "password": "securepassword123"
}

Response:
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": "uuid-user-id",
            "email": "petani@example.com",
            "name": "Ahmad Petani", 
            "role": "PETANI",
            "region_code": "32",
            "permissions": ["READ_PRICES", "INPUT_DATA", "VIEW_DASHBOARD"]
        },
        "tokens": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "expires_in": 3600
        }
    }
}
```

---

## 📊 **2. COMMODITY DATA ENDPOINTS**

### **GET /commodities** - List All Commodities
```json
Response:
{
    "success": true,
    "data": {
        "commodities": [
            {
                "id": "BERAS",
                "code": "BERAS", 
                "name": "Beras Premium",
                "category": "KEBUTUHAN_POKOK",
                "unit": "kg",
                "description": "Beras kualitas premium IR64",
                "seasonal_pattern": "stable",
                "volatility_level": "low",
                "current_price_avg": 14500.0,
                "regions_available": 34,
                "last_updated": "2025-06-07T10:30:00Z"
            },
            {
                "id": "CABAI",
                "code": "CABAI",
                "name": "Cabai Merah Keriting", 
                "category": "SAYURAN",
                "unit": "kg",
                "description": "Cabai merah keriting kualitas A",
                "seasonal_pattern": "high_volatility",
                "volatility_level": "very_high",
                "current_price_avg": 42500.0,
                "regions_available": 34,
                "last_updated": "2025-06-07T10:30:00Z"
            }
        ],
        "total": 12,
        "categories": {
            "KEBUTUHAN_POKOK": 4,
            "SAYURAN": 4, 
            "PERKEBUNAN": 2,
            "PROTEIN": 2
        }
    }
}
```

### **GET /commodities/{commodity_code}** - Commodity Detail
```json
Response:
{
    "success": true,
    "data": {
        "commodity": {
            "id": "BERAS",
            "code": "BERAS",
            "name": "Beras Premium",
            "category": "KEBUTUHAN_POKOK",
            "unit": "kg",
            "description": "Beras kualitas premium IR64",
            "specifications": {
                "quality_grade": "Premium",
                "moisture_content": "14%",
                "broken_rice": "<5%",
                "packaging": "25kg, 50kg"
            },
            "price_statistics": {
                "current_avg": 14500.0,
                "weekly_change": 1.2,
                "monthly_change": 3.4,
                "yearly_change": 8.7,
                "min_price": 12000.0,
                "max_price": 18000.0,
                "volatility_30d": 2.1
            },
            "regional_data": [
                {
                    "region_code": "31",
                    "region_name": "DKI Jakarta",
                    "current_price": 15200.0,
                    "change_24h": 0.8,
                    "last_updated": "2025-06-07T09:00:00Z"
                },
                {
                    "region_code": "32", 
                    "region_name": "Jawa Barat",
                    "current_price": 14100.0,
                    "change_24h": 1.1,
                    "last_updated": "2025-06-07T09:15:00Z"
                }
            ],
            "seasonal_insights": {
                "harvest_season": "Maret-Juni, Agustus-November",
                "peak_price_months": ["Juli", "Desember"], 
                "low_price_months": ["April", "September"],
                "weather_sensitivity": "medium"
            }
        }
    }
}
```

---

## 💰 **3. PRICE DATA ENDPOINTS**

### **GET /prices** - Price History with Filters
```json
Request Query Params:
?commodity_code=BERAS&region_code=31&start_date=2025-05-01&end_date=2025-06-07&granularity=daily

Response:
{
    "success": true,
    "data": {
        "commodity_code": "BERAS",
        "commodity_name": "Beras Premium",
        "region_code": "31",
        "region_name": "DKI Jakarta", 
        "period": {
            "start_date": "2025-05-01",
            "end_date": "2025-06-07",
            "granularity": "daily",
            "total_days": 37
        },
        "price_data": [
            {
                "date": "2025-05-01",
                "price": 14200.0,
                "source": "PANEL_HARGA_PANGAN",
                "market_type": "retail",
                "change_from_previous": 0.0,
                "volume_kg": 1250
            },
            {
                "date": "2025-05-02", 
                "price": 14250.0,
                "source": "PANEL_HARGA_PANGAN",
                "market_type": "retail",
                "change_from_previous": 0.35,
                "volume_kg": 1180
            }
        ],
        "statistics": {
            "average_price": 14387.5,
            "min_price": 14100.0,
            "max_price": 14650.0,
            "volatility": 1.8,
            "trend": "increasing",
            "total_volume": 46750
        }
    }
}
```

### **GET /prices/current** - Current Prices All Commodities
```json
Response:
{
    "success": true,
    "data": {
        "last_updated": "2025-06-07T10:30:00Z",
        "prices": [
            {
                "commodity_code": "BERAS",
                "commodity_name": "Beras Premium",
                "national_average": 14500.0,
                "change_24h": 1.2,
                "change_7d": 2.8,
                "volatility_7d": 2.1,
                "regional_min": {
                    "price": 13800.0,
                    "region": "Jawa Tengah"
                },
                "regional_max": {
                    "price": 15600.0,
                    "region": "Papua"
                },
                "price_status": "stable"
            },
            {
                "commodity_code": "CABAI",
                "commodity_name": "Cabai Merah Keriting", 
                "national_average": 42500.0,
                "change_24h": 8.5,
                "change_7d": 15.2,
                "volatility_7d": 18.7,
                "regional_min": {
                    "price": 38000.0,
                    "region": "Jawa Timur"
                },
                "regional_max": {
                    "price": 48000.0,
                    "region": "Jawa Barat"
                },
                "price_status": "volatile"
            }
        ]
    }
}
```

---

## 🌍 **4. REGIONAL DATA ENDPOINTS**

### **GET /regions** - List All Regions
```json
Response:
{
    "success": true,
    "data": {
        "regions": [
            {
                "code": "31",
                "name": "DKI Jakarta",
                "type": "province",
                "population": 10610000,
                "coordinates": {
                    "latitude": -6.2088,
                    "longitude": 106.8456
                },
                "commodity_count": 12,
                "market_centers": 15,
                "economic_indicators": {
                    "gdp_per_capita": 250000000,
                    "consumption_index": 125.4,
                    "price_level_index": 118.2
                }
            }
        ],
        "total": 34,
        "islands": {
            "Sumatera": 10,
            "Jawa-Bali": 8,
            "Kalimantan": 5,
            "Sulawesi": 6,
            "Indonesia_Timur": 5
        }
    }
}
```

### **GET /regions/{region_code}/dashboard** - Regional Dashboard Data
```json
Response:
{
    "success": true,
    "data": {
        "region": {
            "code": "32",
            "name": "Jawa Barat",
            "overview": {
                "total_commodities": 12,
                "active_markets": 45,
                "average_inflation": 2.8,
                "price_stability_index": 85.4
            }
        },
        "commodity_summary": [
            {
                "commodity_code": "BERAS",
                "current_price": 14100.0,
                "price_change_24h": 1.1,
                "supply_status": "sufficient",
                "demand_trend": "stable"
            },
            {
                "commodity_code": "CABAI",
                "current_price": 48000.0,
                "price_change_24h": 12.5,
                "supply_status": "shortage", 
                "demand_trend": "increasing"
            }
        ],
        "alerts": [
            {
                "commodity": "CABAI",
                "type": "price_spike",
                "severity": "high",
                "message": "Cabai melonjak 12.5% dalam 24 jam"
            }
        ],
        "weather_impact": {
            "current_conditions": "heavy_rain",
            "predicted_impact": "negative",
            "affected_commodities": ["CABAI", "TOMAT", "KANGKUNG"]
        }
    }
}
```

---

## 🚨 **5. ALERTS & NOTIFICATIONS ENDPOINTS**

### **GET /alerts** - Active Alerts
```json
Response:
{
    "success": true,
    "data": {
        "alerts": [
            {
                "id": "alert_001",
                "type": "PRICE_SPIKE",
                "severity": "CRITICAL",
                "commodity_code": "CABAI",
                "commodity_name": "Cabai Merah Keriting",
                "region_code": "32",
                "region_name": "Jawa Barat",
                "message": "Harga cabai melonjak 26% dalam 2 hari",
                "details": {
                    "current_price": 48000.0,
                    "previous_price": 38000.0,
                    "price_change": 26.32,
                    "threshold_breached": 15.0
                },
                "created_at": "2025-06-05T14:30:00Z",
                "status": "ACTIVE",
                "priority": 1
            },
            {
                "id": "alert_002",
                "type": "SUPPLY_SHORTAGE",
                "severity": "HIGH",
                "commodity_code": "BAWANG",
                "commodity_name": "Bawang Merah",
                "region_code": "35",
                "region_name": "Jawa Timur",
                "message": "Indikasi shortage supply bawang merah",
                "details": {
                    "supply_level": "low",
                    "demand_increase": 18.5,
                    "estimated_shortage_duration": "7-14 days"
                },
                "created_at": "2025-06-04T09:15:00Z",
                "status": "ACTIVE",
                "priority": 2
            }
        ],
        "summary": {
            "total_active": 6,
            "critical": 1,
            "high": 2,
            "medium": 3,
            "most_affected_region": "Jawa Barat"
        }
    }
}
```

---

## 📝 **6. DATA INPUT ENDPOINTS**

### **POST /data-input/prices** - Submit Price Data
```json
Request (from Petani):
{
    "commodity_code": "CABAI",
    "region_code": "32",
    "price": 45000.0,
    "volume_kg": 150,
    "market_type": "farmgate",
    "quality_grade": "A",
    "notes": "Harvest fresh, kualitas bagus",
    "location": {
        "latitude": -6.9175,
        "longitude": 107.6191,
        "address": "Pasar Cileunyi, Bandung"
    }
}

Response:
{
    "success": true,
    "message": "Data berhasil disimpan dan menunggu validasi",
    "data": {
        "submission_id": "sub_001",
        "status": "PENDING_REVIEW",
        "submitted_by": {
            "user_id": "uuid-user-id",
            "name": "Ahmad Petani",
            "role": "PETANI"
        },
        "validation_required": true,
        "estimated_processing_time": "2-6 jam",
        "tracking_number": "TRK202506071234"
    }
}
```

### **GET /data-input/submissions** - User's Submissions
```json
Response:
{
    "success": true,
    "data": {
        "submissions": [
            {
                "id": "sub_001",
                "commodity_code": "CABAI",
                "price": 45000.0,
                "status": "APPROVED",
                "submitted_at": "2025-06-07T08:30:00Z",
                "reviewed_at": "2025-06-07T10:15:00Z",
                "reviewer": "Validator Regional",
                "feedback": "Data valid, harga sesuai kondisi pasar"
            },
            {
                "id": "sub_002",
                "commodity_code": "TOMAT",
                "price": 18000.0,
                "status": "PENDING_REVIEW",
                "submitted_at": "2025-06-07T09:45:00Z"
            }
        ],
        "statistics": {
            "total_submissions": 45,
            "approved": 38,
            "pending": 4,
            "rejected": 3,
            "approval_rate": 84.4
        }
    }
}
```

---

## 📊 **7. ANALYTICS & REPORTS ENDPOINTS**

### **GET /analytics/dashboard** - Dashboard Analytics
```json
Response:
{
    "success": true,
    "data": {
        "overview": {
            "total_commodities": 12,
            "total_regions": 34,
            "active_alerts": 6,
            "data_freshness": "Real-time"
        },
        "national_indicators": {
            "inflation_rate": 2.7,
            "price_stability_index": 78.5,
            "supply_sufficiency": 85.2,
            "volatility_index": 12.8
        },
        "top_commodities_by_volatility": [
            {
                "commodity": "CABAI",
                "volatility_7d": 18.7,
                "price_change": 15.2
            },
            {
                "commodity": "BAWANG",
                "volatility_7d": 14.3,
                "price_change": 12.8
            }
        ],
        "regional_performance": [
            {
                "region": "Jawa Barat",
                "stability_score": 65.4,
                "alert_count": 3
            },
            {
                "region": "Jawa Timur", 
                "stability_score": 71.2,
                "alert_count": 2
            }
        ]
    }
}
```

### **POST /reports/generate** - Generate Custom Report
```json
Request:
{
    "report_type": "EXECUTIVE_SUMMARY",
    "period": {
        "start_date": "2025-05-01",
        "end_date": "2025-06-07"
    },
    "commodities": ["BERAS", "CABAI", "BAWANG"],
    "regions": ["31", "32", "33"],
    "format": "PDF",
    "include_predictions": true,
    "include_recommendations": true
}

Response:
{
    "success": true,
    "message": "Report generation started",
    "data": {
        "report_id": "rpt_001",
        "status": "GENERATING",
        "estimated_completion": "2025-06-07T11:45:00Z",
        "download_url": null,
        "progress": 0
    }
}
```

---

## 🔍 **8. SEARCH & FILTERING**

### **GET /search** - Global Search
```json
Request Query:
?q=cabai+jawa+barat&type=all&limit=10

Response:
{
    "success": true,
    "data": {
        "query": "cabai jawa barat",
        "results": {
            "commodities": [
                {
                    "type": "commodity",
                    "commodity_code": "CABAI",
                    "name": "Cabai Merah Keriting",
                    "relevance": 0.95
                }
            ],
            "regions": [
                {
                    "type": "region",
                    "region_code": "32", 
                    "name": "Jawa Barat",
                    "relevance": 0.90
                }
            ],
            "alerts": [
                {
                    "type": "alert",
                    "message": "Harga cabai melonjak di Jawa Barat",
                    "relevance": 0.88
                }
            ]
        },
        "total_results": 7,
        "search_suggestions": [
            "cabai merah keriting jawa barat",
            "harga cabai hari ini",
            "prediksi cabai minggu depan"
        ]
    }
}
```

---

## 🔧 **9. SYSTEM ENDPOINTS**

### **GET /health** - Health Check
```json
Response:
{
    "status": "healthy",
    "timestamp": "2025-06-07T11:00:00Z",
    "services": {
        "database": {
            "status": "connected",
            "response_time_ms": 12
        },
        "redis": {
            "status": "connected", 
            "response_time_ms": 3
        },
        "ml_service": {
            "status": "connected",
            "response_time_ms": 45
        },
        "web_scrapers": {
            "bps": "active",
            "panel_harga": "active", 
            "bmkg": "active"
        }
    },
    "performance": {
        "uptime_seconds": 86400,
        "memory_usage_mb": 512,
        "cpu_usage_percent": 15.7
    }
}
```

## 🎯 **KEY STRENGTHS BACKEND API**

1. **Role-based Access**: 4 user roles dengan permissions berbeda
2. **Real-time Data**: Live updates dari web scrapers  
3. **Comprehensive Coverage**: 12 komoditas, 34 provinsi
4. **Multi-format Support**: JSON, PDF, Excel exports
5. **Advanced Filtering**: Powerful search dan analytics
6. **Production Ready**: Error handling, logging, monitoring
7. **Scalable Architecture**: Microservices-ready design
8. **Data Validation**: Multi-level validation untuk quality assurance
