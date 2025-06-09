# Laporan Komprehensif: API dan Data Sources untuk Platform Komoditas Watch Indonesia

**Tanggal**: 07 Juni 2025  
**Peneliti**: AI Research Agent  
**Tujuan**: Identifikasi dan analisis API serta sumber data untuk monitoring komoditas pangan Indonesia

---

## 🎯 Executive Summary

Penelitian ini mengidentifikasi beberapa sumber data dan API yang dapat diintegrasikan untuk platform monitoring komoditas pangan Indonesia. Hasil utama menunjukkan bahwa **BPS Web API** dan **BMKG Open Data** adalah sumber yang paling matang dan dapat diandalkan, sementara sumber lain memerlukan pendekatan khusus atau memiliki keterbatasan akses.

### Rekomendasi Utama
1. **BPS Web API** - Sumber primer untuk data harga dan statistik ekonomi
2. **BMKG Open Data** - Sumber primer untuk data cuaca pertanian
3. **Portal Satu Data Pertanian Kementan** - Sumber sekunder untuk data produksi
4. **Commodities API Global** - Referensi harga internasional

---

## 📊 Hasil Riset API Indonesia

### 1. BPS (Badan Pusat Statistik) Web API ⭐⭐⭐⭐⭐

**Status**: ✅ **SANGAT REKOMENDASI** - API lengkap dan matang

#### Keunggulan:
- **API yang komprehensif** dengan dokumentasi lengkap
- **Data harga komoditas** tersedia melalui endpoint Dynamic Data
- **Coverage nasional** (549 domain: pusat, provinsi, kabupaten/kota)
- **Format JSON** yang terstruktur
- **Data historis** tersedia dengan ID variabel spesifik

#### Endpoint Kunci untuk Komoditas:
```
Base URL: https://webapi.bps.go.id/v1/api/

1. Dynamic Data: /list/model/data/domain/{domain}/var/{var_id}/key/{api_key}
2. Foreign Trade: /dataexim/sumber/{source}/periode/{period}/kodehs/{hs_code}/key/{api_key}
3. Subject List: /list/model/subject/domain/{domain}/key/{api_key}
```

#### Data Komoditas Tersedia:
- **Indeks Harga Konsumen Makanan** (ID: 2212, 1905)
- **Wholesale Price Index** (ID: 2498, 1721)
- **Inflasi Makanan & Minuman** (ID: 1890)
- **Data Ekspor-Impor** pertanian (endpoint dataexim)
- **GDP Pertanian** dan sektor terkait

#### Akses API:
- **Registrasi**: Melalui webapi.bps.go.id/developer
- **API Key**: 2-3 token per pengguna
- **Rate Limit**: Tidak disebutkan secara eksplisit
- **Dokumentasi**: https://webapi.bps.go.id/documentation

#### Frekuensi Update:
- Data dinamis: Bulanan/triwulanan
- Data statistik: Sesuai jadwal rilis publikasi
- SDGs indicators: Update tahunan

---

### 2. BMKG (Badan Meteorologi) Open Data ⭐⭐⭐⭐

**Status**: ✅ **SANGAT REKOMENDASI** - Data cuaca real-time tersedia

#### Keunggulan:
- **Data cuaca real-time** untuk seluruh provinsi Indonesia
- **Format XML** yang terstruktur dan konsisten
- **Akses gratis** tanpa API key
- **Update reguler** (prakiraan 3 harian)
- **Coverage geografis lengkap** (34 provinsi)

#### Endpoint Utama:
```
Base URL: https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/

Format: DigitalForecast-{NamaProvinsi}.xml

Contoh:
- DigitalForecast-DKIJakarta.xml
- DigitalForecast-JawaBarat.xml
- DigitalForecast-JawaTengah.xml
```

#### Data yang Tersedia:
- **Prakiraan cuaca** 3 hari ke depan
- **Parameter cuaca**: suhu, kelembaban, arah angin, kecepatan angin
- **Koordinat geografis** untuk setiap lokasi
- **Timestamp** update terakhir

#### Hasil Testing:
- ✅ 5/5 provinsi berhasil diakses
- ✅ Data konsisten (~18KB XML per provinsi)
- ✅ Format terstruktur dengan parameter lengkap

#### Implementasi untuk Pertanian:
- **Prediksi panen** berdasarkan cuaca
- **Warning sistem** untuk cuaca ekstrem
- **Optimasi jadwal tanam** berdasarkan prakiraan
- **Analisis korelasi** cuaca vs harga komoditas

---

### 3. Portal Satu Data Pertanian (Kementan) ⭐⭐⭐

**Status**: ⚠️ **REKOMENDASI DENGAN CATATAN** - Data lengkap tapi akses terbatas

#### Keunggulan:
- **Dataset komprehensif**: 151 datasets, 258 publikasi
- **Data produksi pertanian** per komoditas dan wilayah
- **Sistem informasi geospasial** (SIMONTANDI, SIM-Bawang Merah)
- **Data historis** tersedia dalam publikasi

#### Keterbatasan:
- **Tidak ada API publik** yang ditemukan
- **Akses data** melalui portal web dan sistem permohonan
- **Format data** bervariasi (Excel, PDF, shapefile)
- **Update** tidak real-time

#### Data Yang Tersedia:
- **Produksi komoditas**: padi, bawang merah, jagung, bawang putih
- **Luas areal tanam** per wilayah
- **Monitoring fase pertanaman** (satelit LANDSAT 8)
- **Statistik harga produsen** pertanian

#### Akses Data:
- **Portal utama**: satudata.pertanian.go.id
- **Permohonan data**: simpeldatin.setjen.pertanian.go.id (memerlukan login)
- **Geospasial**: sig.pertanian.go.id

---

### 4. Portal Satu Data Indonesia (data.go.id) ⭐⭐

**Status**: ⚠️ **AKSES TERBATAS** - Data ada tapi API bermasalah

#### Status Testing:
- ❌ API endpoint /api/3/action/package_search mengembalikan 404
- ❌ 0/5 query pencarian berhasil
- ⚠️ Mungkin memerlukan autentikasi atau endpoint berbeda

#### Potensi Data:
- **454,166+ datasets** tersedia
- **70 kementerian/lembaga** terhubung
- **Dataset pertanian** dari berbagai instansi
- **Format**: XLSX, CSV, JSON

#### Rekomendasi:
- **Investigasi lebih lanjut** struktur API yang benar
- **Kontak langsung** dengan pengelola portal
- **Alternatif scraping** untuk dataset penting

---

### 5. Panel Harga Pangan (Badan Pangan Nasional) ⭐⭐

**Status**: ⚠️ **DATA BAGUS, API TERBATAS** - Website accessible, API tidak publik

#### Testing Results:
- ✅ 5/5 endpoint dapat diakses
- ❌ Semua response berupa HTML (bukan JSON)
- ⚠️ Tidak ada API publik yang ditemukan

#### Data Potensial:
- **Harga real-time** komoditas strategis nasional
- **Coverage geografis** per wilayah/provinsi
- **Perbandingan harga** harian
- **Monitoring inflasi** komoditas

#### Pendekatan Alternatif:
- **Web scraping** data dari panelharga.badanpangan.go.id
- **Partnership** dengan Badan Pangan Nasional
- **Integrasi manual** melalui file export

---

### 6. Bank Indonesia (PIHPS) ⭐⭐⭐

**Status**: ⚠️ **DATA BERHARGA, AKSES MANUAL**

#### Data Tersedia:
- **Harga Pangan Strategis Nasional** (PIHPS)
- **Panel monitoring** harga real-time
- **Data histori** fluktuasi harga

#### Akses:
- **Website**: bi.go.id/hargapangan
- **Format**: Web dashboard
- **API publik**: Tidak ditemukan

---

### 7. Commodities API (Global) ⭐⭐⭐⭐

**Status**: ✅ **TERSEDIA & TERUJI** - Referensi harga internasional

#### Hasil Testing:
- ✅ 13 komoditas tersedia (WHEAT, CORN, SUGAR, COFFEE, COCOA, dll)
- ✅ 158 mata uang didukung (termasuk IDR)
- ✅ Real-time pricing dengan historical data
- ✅ Format JSON terstruktur

#### Kegunaan untuk Platform:
- **Referensi harga global** untuk prediksi
- **Analisis spread** harga domestik vs internasional
- **Early warning** perubahan harga global
- **Import price forecasting**

---

## 🔧 Implementasi & Integrasi

### Arsitektur API Recommended

```python
# 1. BPS API - Data Harga Domestik
bps_api = {
    "base_url": "https://webapi.bps.go.id/v1/api/",
    "endpoints": {
        "harga_konsumen": "/list/model/data/domain/0000/var/2212",
        "wholesale_price": "/list/model/data/domain/0000/var/2498",
        "trade_data": "/dataexim/sumber/1/periode/1"
    },
    "auth": "API_KEY_required"
}

# 2. BMKG API - Data Cuaca
bmkg_api = {
    "base_url": "https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/",
    "format": "XML",
    "provinces": ["DKIJakarta", "JawaBarat", "JawaTengah", ...],
    "auth": "tidak_diperlukan"
}

# 3. Global Commodities - Referensi
commodities_api = {
    "client": "get_client().commodities",
    "functions": ["get_supported_commodities", "get_commodities_price"],
    "currencies": "IDR_supported"
}
```

### Data Pipeline Rekomendasi

```
1. Real-time Data Collection:
   BMKG (Weather) → Every 6 hours
   Panel Harga → Daily scraping
   Commodities Global → Daily
   
2. Periodic Data Collection:
   BPS API → Weekly/Monthly
   Kementan Portal → Manual monthly
   
3. Data Processing:
   Raw Data → Standardization → Storage → API
   
4. Analysis Layer:
   Price Correlation + Weather Impact + Supply Chain
```

---

## 📈 Coverage Analysis

### Komoditas yang Dapat Dimonitor

| Komoditas | BPS | BMKG | Kementan | Panel Harga | Global |
|-----------|-----|------|----------|-------------|--------|
| **Beras** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Cabai** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Bawang** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Jagung** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Kedelai** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Gula** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Kopi** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Kakao** | ✅ | ✅ | ❌ | ❌ | ✅ |

### Coverage Geografis

- **BPS**: 549 domain (nasional, 34 provinsi, 514 kabupaten/kota)
- **BMKG**: 34 provinsi dengan detail kecamatan
- **Kementan**: Data nasional dan provinsi
- **Panel Harga**: Per wilayah dan kota besar

---

## ⚠️ Limitasi & Challenges

### 1. Akses API
- **BPS**: Memerlukan registrasi dan API key
- **BMKG**: Terbuka, format XML perlu parsing
- **Panel Harga**: Tidak ada API publik
- **Data.go.id**: API endpoint bermasalah

### 2. Frekuensi Update
- **Real-time**: BMKG, Panel Harga (scraping)
- **Harian**: Global commodities
- **Mingguan/Bulanan**: BPS, Kementan
- **Irregular**: Portal datasets

### 3. Format Data
- **JSON**: BPS, Commodities
- **XML**: BMKG (perlu parsing)
- **HTML**: Panel Harga (perlu scraping)
- **File Download**: Kementan (Excel/PDF)

### 4. Biaya & Licensing
- **Gratis**: BMKG, Portal Satu Data
- **Registration**: BPS (gratis setelah daftar)
- **Commercial**: Commodities API (ada free tier)
- **Partnership**: Panel Harga, Kementan

---

## 🎯 Rekomendasi Implementasi

### Fase 1: Foundation (Bulan 1-2)
1. **Setup BPS Web API** - Registrasi dan testing endpoint
2. **Implement BMKG XML Parser** - Real-time weather data
3. **Deploy Commodities API** - Global price reference
4. **Basic dashboard** dengan 3 sumber data utama

### Fase 2: Enhancement (Bulan 3-4)
1. **Panel Harga Web Scraper** - Automated price collection
2. **Kementan Data Integration** - Manual/scheduled import
3. **Advanced analytics** - Price correlation dengan weather
4. **Alert system** untuk anomali harga

### Fase 3: Optimization (Bulan 5-6)
1. **Machine learning models** untuk price forecasting
2. **API optimization** dan caching
3. **Mobile app** development
4. **Partnership** dengan instansi terkait

### Timeline & Resource Estimate

```
Development Team: 3-4 developers
Timeline: 6 bulan
Budget Estimate:
- API Access: $0-500/bulan
- Infrastructure: $200-1000/bulan
- Development: 6 bulan x team cost
```

---

## 📝 Kesimpulan

Platform Komoditas Watch Indonesia dapat dibangun dengan menggabungkan:

1. **BPS Web API** sebagai tulang punggung data harga dan statistik
2. **BMKG Open Data** untuk real-time weather monitoring
3. **Global Commodities API** untuk referensi harga internasional
4. **Web scraping solutions** untuk Panel Harga dan data.go.id
5. **Manual integration** untuk data Kementan yang kritis

**Success Factors**:
- Reliable data pipeline dengan error handling
- Real-time processing untuk data time-sensitive
- Smart caching untuk optimasi performa
- Partnership dengan instansi pemerintah
- Compliance dengan regulasi data Indonesia

**Expected Outcome**:
Platform yang dapat memonitor 8+ komoditas strategis dengan data real-time weather, harga domestik & internasional, serta prediksi berbasis machine learning untuk early warning inflasi komoditas pangan.

---

*Laporan ini dibuat berdasarkan riset komprehensif tanggal 07 Juni 2025 dengan testing langsung terhadap API yang tersedia.*
