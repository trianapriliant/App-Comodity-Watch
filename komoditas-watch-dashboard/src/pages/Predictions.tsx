import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SimpleLineChart from '@/components/SimpleLineChart'
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Brain,
  Calendar,
  AlertCircle,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Bar, BarChart } from 'recharts'

interface PredictionData {
  currentPrice: number
  shortTerm: {
    days: number
    predictedPrice: number
    confidence: number
    trend: string
    factors: string[]
    dailyForecast: Array<{ date: string; price: number; confidence: number }>
  }
  mediumTerm: {
    days: number
    predictedPrice: number
    confidence: number
    trend: string
    factors: string[]
  }
  longTerm: {
    days: number
    predictedPrice: number
    confidence: number
    trend: string
    factors: string[]
  }
}

interface PredictionsResponse {
  modelInfo: {
    version: string
    lastTrained: string
    accuracy: number
    confidenceInterval: number
  }
  predictions: Record<string, PredictionData>
}

interface CommodityData {
  id: string
  name: string
  unit: string
  currentPrice: number
  change: number
  category: string
  volatility: number
  predictions: Array<{
    date: string
    predicted_price: number
    confidence: number
    lower_bound: number
    upper_bound: number
  }>
  priceHistory: {
    '1D': Array<{ date: string; price: number }>
    '1W': Array<{ date: string; price: number }>
    '1M': Array<{ date: string; price: number }>
  }
}

const Predictions: React.FC = () => {
  const [commoditiesData, setCommoditiesData] = useState<CommodityData[]>([])
  const [selectedCommodity, setSelectedCommodity] = useState('cabai')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1W')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/enhanced_commodities.json')
        const data = await response.json()
        setCommoditiesData(data.commodities || [])
        if (data.commodities && data.commodities.length > 0) {
          setSelectedCommodity(data.commodities[0].id)
        }
      } catch (error) {
        console.error('Error fetching commodities data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const selectedCommodityData = commoditiesData.find(c => c.id === selectedCommodity)
  
  // Mock predictions data with model info
  const predictionsData = {
    modelInfo: {
      accuracy: 92.5,
      confidenceInterval: 85,
      version: '2.1.0',
      lastTrained: '2025-06-01T00:00:00Z'
    }
  }

  // Mock current term data for prediction factors
  const currentTermData = {
    days: 7,
    factors: [
      'Kondisi cuaca dan iklim regional',
      'Trend permintaan pasar domestik',
      'Kebijakan pemerintah terkini',
      'Supply chain dan distribusi',
      'Faktor musiman produksi',
      'Kondisi ekonomi makro'
    ]
  }

  // Mock comparison data for charts
  const comparisonData = commoditiesData.map(commodity => ({
    name: commodity.name.substring(0, 8) + '...',
    shortTermChange: ((Math.random() - 0.5) * 20).toFixed(1),
    mediumTermChange: ((Math.random() - 0.5) * 15).toFixed(1),
    longTermChange: ((Math.random() - 0.5) * 25).toFixed(1)
  })).slice(0, 10) // Limit to 10 for chart readability
  
  const timeframeOptions = {
    '1D': 'Harian (7 hari)',
    '1W': 'Mingguan (12 minggu)', 
    '1M': 'Bulanan (12 bulan)'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-5 h-5 text-red-500" />
      case 'decreasing':
        return <TrendingDown className="w-5 h-5 text-green-500" />
      case 'slightly_increasing':
        return <TrendingUp className="w-5 h-5 text-orange-500" />
      default:
        return <Target className="w-5 h-5 text-blue-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600 bg-red-50'
      case 'decreasing':
        return 'text-green-600 bg-green-50'
      case 'slightly_increasing':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50'
    if (confidence >= 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (loading || commoditiesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat prediksi...</p>
        </div>
      </div>
    )
  }

  if (!selectedCommodityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Data komoditas tidak ditemukan</p>
        </div>
      </div>
    )
  }
  // Prepare chart data for historical and prediction
  const historicalData = selectedCommodityData.priceHistory?.[selectedTimeframe] || []
  const predictionData = selectedCommodityData.predictions || []
  
  // Combine historical and prediction data for chart
  const combinedChartData = [
    ...historicalData.map(item => ({
      date: item.date,
      price: item.price,
      type: 'historical'
    })),
    ...predictionData.slice(0, 14).map(item => ({
      date: item.date,
      price: item.predicted_price,
      confidence: item.confidence,
      lower_bound: item.lower_bound,
      upper_bound: item.upper_bound,
      type: 'prediction'
    }))
  ]

  // Calculate prediction summary
  const avgPrediction = predictionData.length > 0 
    ? predictionData.slice(0, 7).reduce((sum, item) => sum + item.predicted_price, 0) / Math.min(7, predictionData.length)
    : selectedCommodityData.currentPrice
    
  const avgConfidence = predictionData.length > 0
    ? predictionData.slice(0, 7).reduce((sum, item) => sum + item.confidence, 0) / Math.min(7, predictionData.length)
    : 85
    
  const priceChange = ((avgPrediction - selectedCommodityData.currentPrice) / selectedCommodityData.currentPrice) * 100

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Prediksi & Anomali</h1>
            <p className="text-xl text-blue-100">
              Forecasting Harga Komoditas dengan Machine Learning
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Akurasi Model: {predictionsData.modelInfo.accuracy}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Confidence: {predictionsData.modelInfo.confidenceInterval}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Model v{predictionsData.modelInfo.version}</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20">🧠</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Pilih Komoditas" />
          </SelectTrigger>
          <SelectContent>
            {commoditiesData.map((commodity) => (
              <SelectItem key={commodity.id} value={commodity.id}>{commodity.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Pilih Timeframe" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeframeOptions).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Prediction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Harga Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">
              Rp {selectedCommodityData.currentPrice.toLocaleString('id-ID')}
            </div>
            <p className="text-sm text-emerald-600 mt-1">
              {selectedCommodityData.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Prediksi 7 Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              Rp {Math.round(avgPrediction).toLocaleString('id-ID')}
            </div>
            <div className="flex items-center mt-2 space-x-2">
              {priceChange > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
              <span className={`text-sm font-medium px-2 py-1 rounded-md ${priceChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Confidence Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {Math.round(avgConfidence)}%
            </div>
            <div className={`text-sm font-medium px-2 py-1 rounded-md mt-2 inline-block ${avgConfidence >= 90 ? 'bg-green-100 text-green-800' : avgConfidence >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              {avgConfidence >= 90 ? 'Tinggi' : avgConfidence >= 80 ? 'Sedang' : 'Rendah'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forecast Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChartIcon className="w-5 h-5 mr-2 text-blue-600" />
              Prediksi 7 Hari ke Depan
            </CardTitle>
            <CardDescription>
              {selectedCommodityData.name} - Prediksi dengan Machine Learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleLineChart
              commodityName={selectedCommodityData.name}
              data={historicalData}
              currentPrice={selectedCommodityData.currentPrice}
              change={selectedCommodityData.change}
              unit={selectedCommodityData.unit}
              height={300}
              showPoints={true}
              showTrend={true}
              timeScale={selectedTimeframe}
            />
          </CardContent>
        </Card>

        {/* Factors Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Faktor Prediksi
            </CardTitle>
            <CardDescription>
              Faktor-faktor yang mempengaruhi prediksi {currentTermData.days} hari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentTermData.factors.map((factor: string, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">{factor}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Model Performance</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Last Training:</span>
                  <div className="font-medium">
                    {new Date(predictionsData.modelInfo.lastTrained).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Version:</span>
                  <div className="font-medium">{predictionsData.modelInfo.version}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Across Timeframes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
              Perbandingan Prediksi Semua Komoditas
            </span>
            <Button size="sm" variant="outline">Export Data</Button>
          </CardTitle>
          <CardDescription>
            Prediksi perubahan harga untuk semua komoditas dalam berbagai timeframe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shortTerm" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shortTerm">7 Hari</TabsTrigger>
              <TabsTrigger value="mediumTerm">14 Hari</TabsTrigger>
              <TabsTrigger value="longTerm">30 Hari</TabsTrigger>
            </TabsList>
            
            <TabsContent value="shortTerm" className="mt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Perubahan Prediksi']} />
                  <Bar 
                    dataKey="shortTermChange" 
                    fill="#3B82F6"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="mediumTerm" className="mt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Perubahan Prediksi']} />
                  <Bar 
                    dataKey="mediumTermChange" 
                    fill="#F59E0B"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="longTerm" className="mt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Perubahan Prediksi']} />
                  <Bar 
                    dataKey="longTermChange" 
                    fill="#8B5CF6"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Predictions
