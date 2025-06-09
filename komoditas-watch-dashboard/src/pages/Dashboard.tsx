import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  BarChart3,
  Activity,
  DollarSign,
  Package,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { getChangeStatus, getStatusColors, getTrendColor, getChartColor, getCommodityColor } from '@/lib/colorUtils'

interface CommodityData {
  id: string
  name: string
  unit: string
  currentPrice: number
  previousPrice: number
  change: number
  category: string
  description: string
  historicalData: Array<{ date: string; price: number }>
}

interface AlertData {
  id: string
  type: string
  severity: string
  title: string
  message: string
  commodity: string
  province: string
  timestamp: string
  isActive: boolean
}

const Dashboard: React.FC = () => {
  const [commodities, setCommodities] = useState<CommodityData[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    setRefreshing(true)
    try {
      const [commoditiesRes, alertsRes] = await Promise.all([
        fetch('/data/commodities.json'),
        fetch('/data/alerts.json')
      ])
      
      const commoditiesData = await commoditiesRes.json()
      const alertsData = await alertsRes.json()
      
      setCommodities(commoditiesData.commodities || [])
      setAlerts(alertsData.alerts?.filter((alert: AlertData) => alert.isActive) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getTrendIcon = (change: number) => {
    const status = getChangeStatus(change)
    if (change > 0) return <TrendingUp className={`w-4 h-4 ${status === 'danger' ? 'text-status-danger' : status === 'warning' ? 'text-status-warning' : 'text-status-success'}`} />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-status-success" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getEnhancedTrendColor = (change: number) => {
    const status = getChangeStatus(change)
    const colors = getStatusColors(status)
    return colors.text
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-status-danger'
      case 'medium': return 'bg-status-critical'
      case 'low': return 'bg-status-warning'
      default: return 'bg-gray-500'
    }
  }

  const filteredCommodities = commodities.filter(commodity => {
    if (selectedCategory === 'all') return true
    return commodity.category === selectedCategory
  })

  const getInflationData = () => {
    const categories = ['Sayuran', 'Biji-bijian', 'Kebutuhan Pokok', 'Perkebunan']
    return categories.map((category, index) => {
      const categoryItems = commodities.filter(c => c.category === category)
      const avgInflation = categoryItems.length > 0 
        ? categoryItems.reduce((sum, item) => sum + item.change, 0) / categoryItems.length 
        : 0
      return {
        category,
        inflation: Math.round(avgInflation * 100) / 100,
        count: categoryItems.length,
        color: getCommodityColor(category)
      }
    })
  }

  const chartData = filteredCommodities.map((item, index) => ({
    name: item.name.replace(' ', '\n'),
    price: item.currentPrice,
    change: item.change,
    previous: item.previousPrice,
    color: getChartColor(index),
    status: getChangeStatus(item.change)
  }))

  const trendData = filteredCommodities.slice(0, 4).map((item, index) => ({
    name: item.name,
    color: getChartColor(index),
    data: item.historicalData.slice(-7).map(point => ({
      date: new Date(point.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      price: point.price
    }))
  }))

  const ENHANCED_COLORS = [
    getChartColor(0), getChartColor(1), getChartColor(2), getChartColor(3),
    getChartColor(4), getChartColor(5), getChartColor(6), getChartColor(7)
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data komoditas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-bloomberg animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 font-inter">Dashboard Komoditas Watch</h1>
            <p className="text-xl text-emerald-100 font-light">
              Monitoring Real-time Harga Komoditas Pangan Indonesia
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <Activity className="w-5 h-5" />
                <span className="font-medium">{commodities.length} Komoditas Dipantau</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <Package className="w-5 h-5" />
                <span className="font-medium">34 Provinsi Terintegrasi</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Real-time Analytics</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20 animate-bounce-gentle">🌾</div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-xl p-4 shadow-soft border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-full sm:w-48 border-gray-200 font-medium">
              <SelectValue placeholder="Pilih Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24 Jam Terakhir</SelectItem>
              <SelectItem value="7d">7 Hari Terakhir</SelectItem>
              <SelectItem value="30d">30 Hari Terakhir</SelectItem>
              <SelectItem value="90d">90 Hari Terakhir</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 border-gray-200 font-medium">
              <SelectValue placeholder="Kategori Komoditas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="Sayuran">Sayuran</SelectItem>
              <SelectItem value="Biji-bijian">Biji-bijian</SelectItem>
              <SelectItem value="Kebutuhan Pokok">Kebutuhan Pokok</SelectItem>
              <SelectItem value="Perkebunan">Perkebunan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <Eye className="w-4 h-4 mr-2" />
            View Options
          </Button>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Rata-rata Inflasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 font-mono">
              {(filteredCommodities.length > 0 
                ? (filteredCommodities.reduce((sum, item) => sum + item.change, 0) / filteredCommodities.length) 
                : 0
              ).toFixed(1)}%
            </div>
            <p className="text-sm text-emerald-600 flex items-center mt-2">
              <TrendingUp className="w-4 h-4 mr-1" />
              +0.5% dari minggu lalu
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Total Alert Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 font-mono">{alerts.length}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-status-danger text-white">
                {alerts.filter(a => a.severity === 'high').length} High
              </Badge>
              <Badge className="bg-status-warning text-white">
                {alerts.filter(a => a.severity === 'medium').length} Medium
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Harga Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 font-mono">
              Rp {Math.max(...filteredCommodities.map(c => c.currentPrice)).toLocaleString('id-ID')}
            </div>
            <p className="text-sm text-orange-600 font-medium">
              {filteredCommodities.find(c => c.currentPrice === Math.max(...filteredCommodities.map(x => x.currentPrice)))?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Volatilitas Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 font-mono">
              {Math.max(...filteredCommodities.map(c => Math.abs(c.change))).toFixed(1)}%
            </div>
            <p className="text-sm text-purple-600 font-medium">
              {filteredCommodities.find(c => Math.abs(c.change) === Math.max(...filteredCommodities.map(x => Math.abs(x.change))))?.name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Price Comparison Chart */}
        <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-emerald-600" />
                Perbandingan Harga Komoditas
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {filteredCommodities.length} items
              </Badge>
            </CardTitle>
            <CardDescription>Harga saat ini vs periode sebelumnya dengan color coding volatilitas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  fontSize={11}
                  tick={{ fontSize: 10, fill: '#666' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  fontSize={11}
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                    name === 'price' ? 'Harga Saat Ini' : 'Harga Sebelumnya'
                  ]}
                />
                <Bar 
                  dataKey="price" 
                  fill="#2563EB" 
                  radius={[4, 4, 0, 0]}
                  name="price"
                />
                <Bar 
                  dataKey="previous" 
                  fill="#94A3B8" 
                  radius={[4, 4, 0, 0]}
                  name="previous"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enhanced Inflation by Category */}
        <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                Inflasi per Kategori
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                Real-time
              </Badge>
            </CardTitle>
            <CardDescription>Distribusi inflasi berdasarkan kategori komoditas dengan enhanced color coding</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={getInflationData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, inflation }) => `${category}: ${inflation}%`}
                  outerRadius={100}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="inflation"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {getInflationData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || ENHANCED_COLORS[index % ENHANCED_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any) => [`${value}%`, 'Tingkat Inflasi']} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* New Trend Analysis Section */}
      <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-600" />
              Trend Analysis - Top 4 Komoditas
            </span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs font-mono">7 Days</Badge>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Pergerakan harga historical dengan confidence bands</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trendData[0]?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#666' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Harga']}
              />
              {trendData.slice(0, 4).map((trend, index) => (
                <Area
                  key={trend.name}
                  type="monotone"
                  dataKey="price"
                  data={trend.data}
                  stroke={trend.color}
                  fill={trend.color}
                  fillOpacity={0.1 + (index * 0.05)}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Enhanced Commodities Overview */}
      <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-emerald-600" />
              Overview Komoditas
              <Badge variant="outline" className="ml-3 font-mono text-xs">
                {filteredCommodities.length}/{commodities.length}
              </Badge>
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Lihat Detail
              </Button>
              <Button size="sm" variant="outline">
                Export Data
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Monitoring harga dan trend komoditas dengan enhanced color coding
            {selectedCategory !== 'all' && ` - Kategori: ${selectedCategory}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCommodities.map((commodity) => {
              const status = getChangeStatus(commodity.change)
              const colors = getStatusColors(status)
              return (
                <div 
                  key={commodity.id} 
                  className={`p-5 border-2 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${colors.border} bg-white`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{commodity.name}</h3>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(commodity.change)}
                      <div className={`w-3 h-3 rounded-full ${colors.accent}`}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-gray-900 font-mono">
                      Rp {commodity.currentPrice.toLocaleString('id-ID')}
                    </div>
                    <div className={`text-sm font-semibold ${getEnhancedTrendColor(commodity.change)} flex items-center gap-1`}>
                      {commodity.change > 0 ? '+' : ''}{commodity.change.toFixed(2)}%
                      <span className="text-xs text-gray-500 font-normal">vs minggu lalu</span>
                    </div>
                    <div className="text-2xs text-gray-500 uppercase tracking-wide">per {commodity.unit}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: getCommodityColor(commodity.category) + '20', color: getCommodityColor(commodity.category) }}
                    >
                      {commodity.category}
                    </Badge>
                    <div className={`px-2 py-1 rounded-md text-2xs font-semibold ${colors.bg} ${colors.text}`}>
                      {status === 'danger' ? 'HIGH' : status === 'warning' ? 'WATCH' : 'STABLE'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredCommodities.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Tidak ada data komoditas</h3>
              <p className="text-gray-500">Pilih kategori lain atau reset filter untuk melihat data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Active Alerts */}
      <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600 animate-pulse-slow" />
              Alert Aktif
              <Badge className="ml-3 bg-status-critical text-white font-mono">
                {alerts.length}
              </Badge>
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                Kelola Alert
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Peringatan dan anomali yang memerlukan perhatian immediate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.slice(0, 6).map((alert, index) => {
              const severityColors = {
                high: { bg: 'bg-status-danger-light', border: 'border-status-danger', dot: 'bg-status-danger', text: 'text-status-danger-dark' },
                medium: { bg: 'bg-status-critical-light', border: 'border-status-critical', dot: 'bg-status-critical', text: 'text-status-critical-dark' },
                low: { bg: 'bg-status-warning-light', border: 'border-status-warning', dot: 'bg-status-warning', text: 'text-status-warning-dark' }
              }
              const colors = severityColors[alert.severity as keyof typeof severityColors] || severityColors.low
              
              return (
                <div 
                  key={alert.id} 
                  className={`flex items-start space-x-4 p-4 border-2 rounded-xl hover:shadow-md transition-all duration-300 ${colors.bg} ${colors.border} animate-slide-in-right`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-4 h-4 rounded-full ${colors.dot} mt-1 animate-pulse`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`font-mono text-xs ${colors.text} border ${colors.border}`}
                          variant="outline"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.severity === 'high' && (
                          <Badge className="bg-status-critical text-white animate-bounce-gentle">
                            URGENT
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">{alert.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-600 space-x-4 font-medium">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {alert.commodity}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {alert.province}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(alert.timestamp).toLocaleString('id-ID', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {alerts.length === 0 && (
            <div className="text-center py-8">
              <div className="text-green-400 text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Semua Normal</h3>
              <p className="text-gray-500">Tidak ada alert aktif saat ini</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
