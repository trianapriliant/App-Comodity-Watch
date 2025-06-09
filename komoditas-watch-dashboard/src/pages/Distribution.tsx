import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Map as MapIcon, 
  MapPin,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  Eye,
  Filter,
  RefreshCw,
  Layers
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from 'recharts'
import { getHeatmapColor, getChartColor, getStatusColors, getChangeStatus } from '@/lib/colorUtils'

interface ProvinceData {
  id: string
  name: string
  capital: string
  coordinates: [number, number]
  area: number
  population: number
  averagePrice: number
  stockLevel: number
  inflationRate: number
  lastUpdate: string
  commodityData: Record<string, {
    price: number
    stock: number
    trend: string
  }>
}

const Distribution: React.FC = () => {
  const [provinces, setProvinces] = useState<ProvinceData[]>([])
  const [commoditiesData, setCommoditiesData] = useState<any[]>([])
  const [selectedCommodity, setSelectedCommodity] = useState('cabai')
  const [selectedMetric, setSelectedMetric] = useState('price')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch provinces data
        const provincesResponse = await fetch('/data/provinces.json')
        const provincesData = await provincesResponse.json()
        setProvinces(provincesData.provinces || [])

        // Fetch commodities data
        const commoditiesResponse = await fetch('/data/enhanced_commodities.json')
        const commoditiesJson = await commoditiesResponse.json()
        console.log('Distribution - Loaded commodities:', commoditiesJson.commodities?.length || 0)
        setCommoditiesData(commoditiesJson.commodities || [])
        
        // Set first commodity as default if available
        if (commoditiesJson.commodities && commoditiesJson.commodities.length > 0) {
          setSelectedCommodity(commoditiesJson.commodities[0].id)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Create commodity names mapping from the loaded data
  const commodityNames: Record<string, string> = commoditiesData.reduce((acc, commodity) => {
    acc[commodity.id] = commodity.name
    return acc
  }, {} as Record<string, string>)

  const metricNames: Record<string, string> = {
    price: 'Harga',
    stock: 'Stok',
    trend: 'Trend',
    inflation: 'Inflasi'
  }

  const getHeatmapData = () => {
    return provinces.map(province => {
      const commodityData = province.commodityData[selectedCommodity]
      let value = 0
      let normalizedValue = 0
      let color = '#94A3B8' // default gray

      switch (selectedMetric) {
        case 'price':
          value = commodityData?.price || 0
          const maxPrice = Math.max(...provinces.map(p => p.commodityData[selectedCommodity]?.price || 0))
          const minPrice = Math.min(...provinces.map(p => p.commodityData[selectedCommodity]?.price || 0))
          normalizedValue = maxPrice > minPrice ? (value - minPrice) / (maxPrice - minPrice) : 0
          color = getHeatmapColor(normalizedValue, 'price')
          break
        case 'stock':
          value = commodityData?.stock || 0
          const maxStock = Math.max(...provinces.map(p => p.commodityData[selectedCommodity]?.stock || 0))
          const minStock = Math.min(...provinces.map(p => p.commodityData[selectedCommodity]?.stock || 0))
          normalizedValue = maxStock > minStock ? (value - minStock) / (maxStock - minStock) : 0
          color = getHeatmapColor(normalizedValue, 'stock')
          break
        case 'inflation':
          value = province.inflationRate
          const maxInflation = Math.max(...provinces.map(p => p.inflationRate))
          const minInflation = Math.min(...provinces.map(p => p.inflationRate))
          normalizedValue = maxInflation > minInflation ? (value - minInflation) / (maxInflation - minInflation) : 0
          color = getHeatmapColor(normalizedValue, 'volatility')
          break
        default:
          value = 0
          normalizedValue = 0
      }

      return {
        ...province,
        value,
        normalizedValue,
        color,
        opacity: 0.7 + (normalizedValue * 0.3), // Dynamic opacity based on value
        commodityData: commodityData || { price: 0, stock: 0, trend: 'stable' }
      }
    })
  }

  const getTopProvinces = (metric: string, count: number = 5) => {
    return provinces
      .map(province => ({
        ...province,
        value: metric === 'price' 
          ? province.commodityData[selectedCommodity]?.price || 0
          : metric === 'stock'
          ? province.commodityData[selectedCommodity]?.stock || 0
          : province.inflationRate
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, count)
  }

  const getRegionalStats = () => {
    const regions = {
      'Sumatera': provinces.filter(p => ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21'].includes(p.id)),
      'Jawa-Bali': provinces.filter(p => ['31', '32', '33', '34', '35', '36', '51'].includes(p.id)),
      'Kalimantan': provinces.filter(p => ['61', '62', '63', '64', '65'].includes(p.id)),
      'Sulawesi': provinces.filter(p => ['71', '72', '73', '74', '75', '76'].includes(p.id)),
      'Indonesia Timur': provinces.filter(p => ['52', '53', '81', '82', '91', '94'].includes(p.id))
    }

    return Object.entries(regions).map(([region, regionProvinces]) => {
      const avgPrice = regionProvinces.reduce((sum, p) => sum + (p.commodityData[selectedCommodity]?.price || 0), 0) / regionProvinces.length
      const avgStock = regionProvinces.reduce((sum, p) => sum + (p.commodityData[selectedCommodity]?.stock || 0), 0) / regionProvinces.length
      const avgInflation = regionProvinces.reduce((sum, p) => sum + p.inflationRate, 0) / regionProvinces.length

      return {
        region,
        avgPrice: Math.round(avgPrice),
        avgStock: Math.round(avgStock),
        avgInflation: Math.round(avgInflation * 100) / 100,
        provinces: regionProvinces.length
      }
    })
  }

  const heatmapData = getHeatmapData()
  const topProvinces = getTopProvinces(selectedMetric)
  const regionalStats = getRegionalStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data geografis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-bloomberg animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 font-inter">Distribusi Geografis</h1>
            <p className="text-xl text-green-100 font-light">
              Pemetaan dan Analisis Regional Komoditas Indonesia
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <MapIcon className="w-5 h-5" />
                <span className="font-medium">34 Provinsi</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Real-time Mapping</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <Package className="w-5 h-5" />
                <span className="font-medium">Supply Chain Analytics</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20 animate-bounce-gentle">🗺️</div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-xl p-4 shadow-soft border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
            <SelectTrigger className="w-full sm:w-64 border-gray-200 font-medium">
              <SelectValue placeholder="Pilih Komoditas" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(commodityNames).map(([key, name]) => (
                <SelectItem key={key} value={key}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-full sm:w-64 border-gray-200 font-medium">
              <SelectValue placeholder="Pilih Metrik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Harga per Kg</SelectItem>
              <SelectItem value="stock">Level Stok</SelectItem>
              <SelectItem value="inflation">Tingkat Inflasi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <Layers className="w-4 h-4 mr-2" />
            Layers
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">Harga Tertinggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              Rp {Math.max(...provinces.map(p => p.commodityData[selectedCommodity]?.price || 0)).toLocaleString('id-ID')}
            </div>
            <p className="text-sm text-blue-600">
              {provinces.find(p => p.commodityData[selectedCommodity]?.price === Math.max(...provinces.map(x => x.commodityData[selectedCommodity]?.price || 0)))?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">Stok Tertinggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {Math.max(...provinces.map(p => p.commodityData[selectedCommodity]?.stock || 0))} ton
            </div>
            <p className="text-sm text-green-600">
              {provinces.find(p => p.commodityData[selectedCommodity]?.stock === Math.max(...provinces.map(x => x.commodityData[selectedCommodity]?.stock || 0)))?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700">Inflasi Tertinggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {Math.max(...provinces.map(p => p.inflationRate)).toFixed(1)}%
            </div>
            <p className="text-sm text-orange-600">
              {provinces.find(p => p.inflationRate === Math.max(...provinces.map(x => x.inflationRate)))?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700">Rata-rata Nasional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {selectedMetric === 'price' && `Rp ${Math.round(provinces.reduce((sum, p) => sum + (p.commodityData[selectedCommodity]?.price || 0), 0) / provinces.length).toLocaleString('id-ID')}`}
              {selectedMetric === 'stock' && `${Math.round(provinces.reduce((sum, p) => sum + (p.commodityData[selectedCommodity]?.stock || 0), 0) / provinces.length)} ton`}
              {selectedMetric === 'inflation' && `${(provinces.reduce((sum, p) => sum + p.inflationRate, 0) / provinces.length).toFixed(1)}%`}
            </div>
            <p className="text-sm text-purple-600">Across Indonesia</p>
          </CardContent>
        </Card>
      </div>

      {/* Map Visualization and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Heatmap Visual Representation */}
        <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <MapIcon className="w-5 h-5 mr-2 text-green-600" />
                Enhanced Heatmap {commodityNames[selectedCommodity]}
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                Interactive
              </Badge>
            </CardTitle>
            <CardDescription>
              Visualisasi {metricNames[selectedMetric].toLowerCase()} berdasarkan provinsi dengan enhanced color coding
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Enhanced grid-based heatmap representation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0, selectedMetric as any) }}></div>
                  <span className="font-medium">Rendah</span>
                </div>
                <span className="font-bold text-gray-700">{metricNames[selectedMetric]}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Tinggi</span>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(1, selectedMetric as any) }}></div>
                </div>
              </div>
              
              {/* Main Indonesia grid representation */}
              <div className="grid grid-cols-6 gap-2 mb-4">
                {heatmapData.slice(0, 24).map((province, index) => (
                  <div
                    key={province.id}
                    className="group relative aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 border-2 border-white hover:border-gray-300"
                    style={{ 
                      backgroundColor: province.color,
                      opacity: province.opacity
                    }}
                  >
                    <span className="text-center leading-tight drop-shadow-sm">
                      {province.name.length > 10 ? province.name.substring(0, 8) + '...' : province.name}
                    </span>
                    
                    {/* Enhanced Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                      <div className="font-semibold">{province.name}</div>
                      <div className="text-gray-200">
                        {selectedMetric === 'price' && `Rp ${province.value.toLocaleString('id-ID')}/kg`}
                        {selectedMetric === 'stock' && `${province.value} ton`}
                        {selectedMetric === 'inflation' && `${province.value.toFixed(1)}%`}
                      </div>
                      <div className="text-xs text-gray-300">
                        {province.commodityData.trend === 'up' ? '📈 Naik' : province.commodityData.trend === 'down' ? '📉 Turun' : '➡️ Stabil'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Eastern Indonesia grid */}
              <div className="grid grid-cols-5 gap-2">
                {heatmapData.slice(24).map((province, index) => (
                  <div
                    key={province.id}
                    className="group relative aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 border-2 border-white hover:border-gray-300"
                    style={{ 
                      backgroundColor: province.color,
                      opacity: province.opacity
                    }}
                  >
                    <span className="text-center leading-tight drop-shadow-sm">
                      {province.name.length > 10 ? province.name.substring(0, 8) + '...' : province.name}
                    </span>
                    
                    {/* Enhanced Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                      <div className="font-semibold">{province.name}</div>
                      <div className="text-gray-200">
                        {selectedMetric === 'price' && `Rp ${province.value.toLocaleString('id-ID')}/kg`}
                        {selectedMetric === 'stock' && `${province.value} ton`}
                        {selectedMetric === 'inflation' && `${province.value.toFixed(1)}%`}
                      </div>
                      <div className="text-xs text-gray-300">
                        {province.commodityData.trend === 'up' ? '📈 Naik' : province.commodityData.trend === 'down' ? '📉 Turun' : '➡️ Stabil'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Enhanced Legend */}
            <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Color Legend & Analytics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 mb-2">Gradasi Warna:</div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0, selectedMetric as any) }}></div>
                      <span className="text-xs">{selectedMetric === 'stock' ? 'Stok Tinggi' : 'Nilai Rendah'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0.5, selectedMetric as any) }}></div>
                      <span className="text-xs">Sedang</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(1, selectedMetric as any) }}></div>
                      <span className="text-xs">{selectedMetric === 'stock' ? 'Stok Rendah' : 'Nilai Tinggi'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 mb-2">Quick Stats:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded p-2">
                      <div className="font-semibold text-gray-700">Tertinggi</div>
                      <div className="text-gray-600">{Math.max(...heatmapData.map(p => p.value)).toLocaleString('id-ID')}</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="font-semibold text-gray-700">Terendah</div>
                      <div className="text-gray-600">{Math.min(...heatmapData.map(p => p.value)).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Provinces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Top 5 Provinsi
            </CardTitle>
            <CardDescription>
              Ranking berdasarkan {metricNames[selectedMetric].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProvinces.map((province, index) => (
                <div key={province.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{province.name}</div>
                      <div className="text-sm text-gray-500">{province.capital}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {selectedMetric === 'price' && `Rp ${province.value.toLocaleString('id-ID')}`}
                      {selectedMetric === 'stock' && `${province.value} ton`}
                      {selectedMetric === 'inflation' && `${province.value.toFixed(1)}%`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {province.commodityData[selectedCommodity]?.trend === 'up' ? (
                        <span className="flex items-center text-red-600">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Naik
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Turun
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
              Analisis Regional
            </span>
            <Button size="sm" variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Detail View
            </Button>
          </CardTitle>
          <CardDescription>
            Perbandingan rata-rata harga, stok, dan inflasi antar wilayah
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip formatter={(value: any, name: string) => [
                name === 'avgPrice' ? `Rp ${Number(value).toLocaleString('id-ID')}` :
                name === 'avgStock' ? `${value} ton` :
                `${value}%`,
                name === 'avgPrice' ? 'Rata-rata Harga' :
                name === 'avgStock' ? 'Rata-rata Stok' :
                'Rata-rata Inflasi'
              ]} />
              {selectedMetric === 'price' && <Bar dataKey="avgPrice" fill="#10B981" radius={4} />}
              {selectedMetric === 'stock' && <Bar dataKey="avgStock" fill="#3B82F6" radius={4} />}
              {selectedMetric === 'inflation' && <Bar dataKey="avgInflation" fill="#F59E0B" radius={4} />}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Province List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="w-5 h-5 mr-2 text-purple-600" />
              Data Provinsi Lengkap
            </span>
            <Button size="sm" variant="outline">Export CSV</Button>
          </CardTitle>
          <CardDescription>
            Data {commodityNames[selectedCommodity]} untuk semua provinsi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Provinsi</th>
                  <th className="text-left p-2">Harga (Rp/kg)</th>
                  <th className="text-left p-2">Stok (ton)</th>
                  <th className="text-left p-2">Trend</th>
                  <th className="text-left p-2">Inflasi (%)</th>
                  <th className="text-left p-2">Update</th>
                </tr>
              </thead>
              <tbody>
                {provinces.map((province) => (
                  <tr key={province.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{province.name}</td>
                    <td className="p-2">
                      {province.commodityData[selectedCommodity]?.price 
                        ? `Rp ${province.commodityData[selectedCommodity].price.toLocaleString('id-ID')}`
                        : 'N/A'
                      }
                    </td>
                    <td className="p-2">
                      {province.commodityData[selectedCommodity]?.stock || 'N/A'} ton
                    </td>
                    <td className="p-2">
                      <Badge variant={
                        province.commodityData[selectedCommodity]?.trend === 'up' ? 'destructive' : 'secondary'
                      }>
                        {province.commodityData[selectedCommodity]?.trend === 'up' ? '↗️ Naik' : 
                         province.commodityData[selectedCommodity]?.trend === 'down' ? '↘️ Turun' : '➡️ Stabil'}
                      </Badge>
                    </td>
                    <td className="p-2">{province.inflationRate.toFixed(1)}%</td>
                    <td className="p-2 text-gray-500">{province.lastUpdate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Distribution
