#!/usr/bin/env python3
"""
Test script untuk mengeksplorasi API Indonesia yang tersedia
untuk platform monitoring komoditas pangan
"""

import requests
import json
import time
from datetime import datetime
import pandas as pd

def test_bmkg_open_data():
    """Test akses ke data terbuka BMKG"""
    print("🌤️  Testing BMKG Open Data API...")
    
    try:
        # URL data terbuka BMKG yang umum digunakan
        base_url = "https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/"
        
        # List provinsi untuk test
        provinces = ["DKIJakarta", "JawaBarat", "JawaTengah", "JawaTimur", "Bali"]
        
        bmkg_data = []
        
        for province in provinces:
            try:
                url = f"{base_url}DigitalForecast-{province}.xml"
                print(f"  📍 Mengakses data cuaca {province}: {url}")
                
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    bmkg_data.append({
                        "province": province,
                        "url": url,
                        "status": "✅ Berhasil",
                        "content_length": len(response.content),
                        "content_type": response.headers.get('content-type', 'unknown')
                    })
                    print(f"    ✅ Berhasil - Size: {len(response.content)} bytes")
                else:
                    bmkg_data.append({
                        "province": province,
                        "url": url,
                        "status": f"❌ Error {response.status_code}",
                        "content_length": 0,
                        "content_type": "none"
                    })
                    print(f"    ❌ Error {response.status_code}")
                    
                time.sleep(1)  # Rate limiting
                
            except Exception as e:
                bmkg_data.append({
                    "province": province,
                    "url": url,
                    "status": f"❌ Exception: {str(e)}",
                    "content_length": 0,
                    "content_type": "none"
                })
                print(f"    ❌ Exception: {str(e)}")
        
        # Simpan hasil test
        with open('/workspace/data/bmkg_api_test_results.json', 'w') as f:
            json.dump(bmkg_data, f, indent=2)
        
        print(f"\n📊 BMKG Test Results:")
        successful = len([d for d in bmkg_data if "✅" in d["status"]])
        print(f"  Successful: {successful}/{len(bmkg_data)} provinces")
        
        return bmkg_data
        
    except Exception as e:
        print(f"❌ BMKG Test Error: {str(e)}")
        return []

def test_data_go_id_api():
    """Test akses ke Portal Satu Data Indonesia (data.go.id)"""
    print("\n🏛️  Testing Portal Satu Data Indonesia...")
    
    try:
        # API endpoint untuk pencarian dataset
        search_url = "https://data.go.id/api/3/action/package_search"
        
        # Parameter pencarian untuk data pertanian dan komoditas
        search_queries = [
            "harga pangan",
            "produksi pertanian", 
            "komoditas",
            "beras",
            "cabai"
        ]
        
        results = []
        
        for query in search_queries:
            try:
                params = {
                    'q': query,
                    'rows': 5,  # Limit hasil
                    'start': 0
                }
                
                print(f"  🔍 Searching for: '{query}'")
                response = requests.get(search_url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        count = data['result']['count']
                        datasets = data['result']['results']
                        
                        query_result = {
                            "query": query,
                            "total_count": count,
                            "datasets_returned": len(datasets),
                            "status": "✅ Berhasil",
                            "datasets": []
                        }
                        
                        for dataset in datasets[:3]:  # Top 3 results
                            query_result["datasets"].append({
                                "title": dataset.get('title', 'No title'),
                                "organization": dataset.get('organization', {}).get('title', 'Unknown'),
                                "resources_count": len(dataset.get('resources', [])),
                                "metadata_modified": dataset.get('metadata_modified', ''),
                                "id": dataset.get('id', '')
                            })
                        
                        results.append(query_result)
                        print(f"    ✅ Found {count} datasets, showing top {len(datasets)}")
                        
                    else:
                        results.append({
                            "query": query,
                            "status": "❌ API returned success=false",
                            "total_count": 0,
                            "datasets_returned": 0,
                            "datasets": []
                        })
                        print(f"    ❌ API returned success=false")
                else:
                    results.append({
                        "query": query,
                        "status": f"❌ HTTP {response.status_code}",
                        "total_count": 0,
                        "datasets_returned": 0,
                        "datasets": []
                    })
                    print(f"    ❌ HTTP {response.status_code}")
                    
                time.sleep(1)  # Rate limiting
                
            except Exception as e:
                results.append({
                    "query": query,
                    "status": f"❌ Exception: {str(e)}",
                    "total_count": 0,
                    "datasets_returned": 0,
                    "datasets": []
                })
                print(f"    ❌ Exception: {str(e)}")
        
        # Simpan hasil
        with open('/workspace/data/data_go_id_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Data.go.id Test Results:")
        successful = len([r for r in results if "✅" in r["status"]])
        total_datasets = sum([r["total_count"] for r in results if r["total_count"] > 0])
        print(f"  Successful queries: {successful}/{len(search_queries)}")
        print(f"  Total datasets found: {total_datasets}")
        
        return results
        
    except Exception as e:
        print(f"❌ Data.go.id Test Error: {str(e)}")
        return []

def test_panel_harga_api():
    """Test akses ke Panel Harga Pangan (jika ada API publik)"""
    print("\n💰 Testing Panel Harga Pangan...")
    
    try:
        # Coba akses beberapa endpoint yang mungkin ada
        base_url = "https://panelharga.badanpangan.go.id"
        
        endpoints_to_test = [
            "/api/harga",
            "/api/data",
            "/data",
            "/harga",
            "/api/komoditas"
        ]
        
        results = []
        
        for endpoint in endpoints_to_test:
            try:
                url = base_url + endpoint
                print(f"  🔍 Testing endpoint: {endpoint}")
                
                response = requests.get(url, timeout=10)
                
                result = {
                    "endpoint": endpoint,
                    "url": url,
                    "status_code": response.status_code,
                    "status": f"HTTP {response.status_code}",
                    "content_type": response.headers.get('content-type', 'unknown'),
                    "content_length": len(response.content)
                }
                
                if response.status_code == 200:
                    result["status"] = "✅ Accessible"
                    print(f"    ✅ Accessible - Content-Type: {result['content_type']}")
                    
                    # Check if it's JSON
                    if 'json' in result['content_type'].lower():
                        try:
                            json_data = response.json()
                            result["json_keys"] = list(json_data.keys()) if isinstance(json_data, dict) else "Not a dict"
                        except:
                            result["json_keys"] = "Invalid JSON"
                else:
                    result["status"] = f"❌ HTTP {response.status_code}"
                    print(f"    ❌ HTTP {response.status_code}")
                
                results.append(result)
                time.sleep(1)
                
            except Exception as e:
                results.append({
                    "endpoint": endpoint,
                    "url": base_url + endpoint,
                    "status": f"❌ Exception: {str(e)}",
                    "status_code": 0,
                    "content_type": "none",
                    "content_length": 0
                })
                print(f"    ❌ Exception: {str(e)}")
        
        # Simpan hasil
        with open('/workspace/data/panel_harga_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Panel Harga Test Results:")
        accessible = len([r for r in results if "✅" in r["status"]])
        print(f"  Accessible endpoints: {accessible}/{len(endpoints_to_test)}")
        
        return results
        
    except Exception as e:
        print(f"❌ Panel Harga Test Error: {str(e)}")
        return []

def create_api_summary():
    """Buat ringkasan hasil test semua API"""
    print("\n📋 Creating API Test Summary...")
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    summary = {
        "test_timestamp": timestamp,
        "apis_tested": ["BMKG Open Data", "Portal Satu Data Indonesia", "Panel Harga Pangan"],
        "test_results": {},
        "recommendations": []
    }
    
    # Load hasil test sebelumnya
    try:
        with open('/workspace/data/bmkg_api_test_results.json', 'r') as f:
            bmkg_results = json.load(f)
        summary["test_results"]["bmkg"] = {
            "total_tested": len(bmkg_results),
            "successful": len([r for r in bmkg_results if "✅" in r["status"]]),
            "status": "Available" if any("✅" in r["status"] for r in bmkg_results) else "Limited"
        }
    except:
        summary["test_results"]["bmkg"] = {"status": "Not tested"}
    
    try:
        with open('/workspace/data/data_go_id_test_results.json', 'r') as f:
            data_go_results = json.load(f)
        summary["test_results"]["data_go_id"] = {
            "total_queries": len(data_go_results),
            "successful_queries": len([r for r in data_go_results if "✅" in r["status"]]),
            "total_datasets_found": sum([r["total_count"] for r in data_go_results if r["total_count"] > 0]),
            "status": "Available" if any("✅" in r["status"] for r in data_go_results) else "Limited"
        }
    except:
        summary["test_results"]["data_go_id"] = {"status": "Not tested"}
    
    try:
        with open('/workspace/data/panel_harga_test_results.json', 'r') as f:
            panel_results = json.load(f)
        summary["test_results"]["panel_harga"] = {
            "total_endpoints": len(panel_results),
            "accessible_endpoints": len([r for r in panel_results if "✅" in r["status"]]),
            "status": "Available" if any("✅" in r["status"] for r in panel_results) else "No public API"
        }
    except:
        summary["test_results"]["panel_harga"] = {"status": "Not tested"}
    
    # Buat rekomendasi
    if summary["test_results"].get("bmkg", {}).get("status") == "Available":
        summary["recommendations"].append("BMKG: Data cuaca tersedia melalui XML endpoint - cocok untuk data weather yang mempengaruhi pertanian")
    
    if summary["test_results"].get("data_go_id", {}).get("status") == "Available":
        summary["recommendations"].append("Data.go.id: Portal memiliki dataset pertanian - gunakan API search untuk menemukan dataset spesifik")
    
    # Simpan summary
    with open('/workspace/data/api_test_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("✅ API Summary created and saved")
    return summary

def main():
    """Main function untuk menjalankan semua test"""
    print("🚀 Testing Indonesian Government APIs for Commodity Monitoring")
    print("=" * 70)
    
    # Test semua API
    bmkg_results = test_bmkg_open_data()
    data_go_results = test_data_go_id_api()
    panel_results = test_panel_harga_api()
    
    # Buat summary
    summary = create_api_summary()
    
    print("\n" + "=" * 70)
    print("✅ All API tests completed!")
    print("\nFiles created:")
    print("  📄 /workspace/data/bmkg_api_test_results.json")
    print("  📄 /workspace/data/data_go_id_test_results.json") 
    print("  📄 /workspace/data/panel_harga_test_results.json")
    print("  📄 /workspace/data/api_test_summary.json")

if __name__ == "__main__":
    main()
