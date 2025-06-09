#!/usr/bin/env python3
"""
Test script untuk mengakses API komoditas global
Membantu memahami struktur data dan komoditas yang tersedia
"""

import asyncio
import json
import concurrent.futures
from external_api.data_sources.client import get_client

async def test_supported_commodities():
    """Test mendapatkan daftar komoditas yang didukung"""
    try:
        client = get_client()
        print("🔍 Mengambil daftar komoditas yang didukung...")
        
        result = await client.commodities.get_supported_commodities()
        
        if result["success"]:
            print("✅ Berhasil mendapatkan data komoditas")
            
            # Simpan data lengkap
            with open('/workspace/data/supported_commodities.json', 'w') as f:
                json.dump(result, f, indent=2)
            
            # Analisis data
            commodities = result["data"]["commodities"]
            currencies = result["data"]["currencies"]
            
            print(f"\n📊 Total komoditas tersedia: {len(commodities)}")
            print(f"💱 Total mata uang tersedia: {len(currencies)}")
            
            print("\n🌾 Komoditas yang tersedia:")
            for i, commodity in enumerate(commodities[:10], 1):  # Tampilkan 10 pertama
                print(f"{i:2d}. {commodity['commodity_name']} ({commodity['commodity_code']}) - {commodity['commodity_weight_measurement']}")
            
            if len(commodities) > 10:
                print(f"    ... dan {len(commodities) - 10} komoditas lainnya")
            
            print("\n💰 Mata uang yang didukung:")
            for currency in currencies:
                print(f"    - {currency['currency_name']} ({currency['currency_code']})")
            
            return result
        else:
            print(f"❌ Gagal: {result.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

async def test_commodity_prices():
    """Test mendapatkan harga komoditas tertentu"""
    try:
        client = get_client()
        
        # Test beberapa komoditas yang relevan dengan Indonesia
        test_commodities = ["WHEAT", "CORN", "SUGAR", "COFFEE", "COCOA"]
        
        print(f"\n🔍 Mengambil harga komoditas: {', '.join(test_commodities)}")
        
        result = await client.commodities.get_commodities_price(
            commodity_code=",".join(test_commodities),
            currency_code="USD"
        )
        
        if result["success"]:
            print("✅ Berhasil mendapatkan harga komoditas")
            
            # Simpan data lengkap
            with open('/workspace/data/commodity_prices_sample.json', 'w') as f:
                json.dump(result, f, indent=2)
            
            # Analisis harga
            rates = result["data"]["rates"]
            base_currency = result["data"]["base_currency"]
            
            print(f"\n💱 Harga dalam {base_currency}:")
            for commodity, prices in rates.items():
                print(f"\n🌾 {commodity}:")
                print(f"    Current: ${prices['current']:,}")
                print(f"    Open:    ${prices['open']:,}")
                print(f"    High:    ${prices['high']:,}")
                print(f"    Low:     ${prices['low']:,}")
                print(f"    Prev:    ${prices['prev']:,}")
                
                # Hitung perubahan
                change = prices['current'] - prices['prev']
                change_pct = (change / prices['prev']) * 100 if prices['prev'] != 0 else 0
                trend = "📈" if change > 0 else "📉" if change < 0 else "➡️"
                print(f"    Change:  {trend} ${change:+,.2f} ({change_pct:+.2f}%)")
            
            return result
        else:
            print(f"❌ Gagal: {result.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

async def main():
    """Main function untuk menjalankan semua test"""
    print("🚀 Testing Commodities API...")
    print("=" * 50)
    
    # Test 1: Daftar komoditas yang didukung
    supported_data = await test_supported_commodities()
    
    if supported_data:
        # Test 2: Harga komoditas sample
        await test_commodity_prices()
    
    print("\n" + "=" * 50)
    print("✅ Testing selesai!")

def run_async_with_thread_pool():
    """Menjalankan async function menggunakan thread pool"""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(main())
        finally:
            loop.close()

if __name__ == "__main__":
    run_async_with_thread_pool()
