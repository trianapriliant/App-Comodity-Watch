import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  RefreshCw,
  Download,
  Maximize2,
  Settings,
  Grid3X3,
  List,
  TrendingUp as TrendUp,
  Volume2,
  Layers
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { getChangeStatus, getStatusColors, getTrendColor, getChartColor, getCommodityColor } from '@/lib/colorUtils'

// Import our new components
import SimpleLineChart from '@/components/SimpleLineChart'
import AlertCenter from '@/components/AlertCenter'
import FilterPanel from '@/components/FilterPanel'
import ThemeToggle from '@/components/ThemeToggle'
import EnhancedNewsAlerts from '@/components/EnhancedNewsAlerts'

interface CommodityData {
  id: string
  name: string
  unit: string
  currentPrice: number
  previousPrice: number
  change: number
  category: string
  description: string
  volume: number
  marketCap: number
  volatility: number
  supplyStatus: string
  priceHistory: {
    '1H': Array<{ date: string; price: number; time?: string }>
    '1D': Array<{ date: string; price: number }>
    '1W': Array<{ date: string; price: number }>
    '1M': Array<{ date: string; price: number }>
    '1Y': Array<{ date: string; price: number }>
  }
  predictions?: Array<{
    date: string
    predicted_price: number
    confidence: number
    lower_bound: number
    upper_bound: number
  }>
  regionalData?: Array<{
    province: string
    price: number
    supply_status: string
    last_updated: string
  }>
  lastUpdated?: string
}

interface AlertData {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  commodity: string
  province: string
  timestamp: string
  isActive: boolean
  isRead: boolean
  isPinned: boolean
  price?: number
  threshold?: number
  changePercent?: number
}

interface FilterOptions {
  searchTerm: string
  categories: string[]
  provinces: string[]
  priceRange: [number, number]
  changeRange: [number, number]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  volatilityRange: [number, number]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  showOnlyAlerts: boolean
  showOnlyFavorites: boolean
}

type ViewMode = 'grid' | 'list' | 'charts'

const EnhancedDashboard: React.FC = () => {
  const [commodities, setCommodities] = useState<CommodityData[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityData | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    categories: [],
    provinces: [],
    priceRange: [0, 100000],
    changeRange: [-50, 50],
    dateRange: { from: undefined, to: undefined },
    volatilityRange: [0, 100],
    sortBy: 'name',
    sortOrder: 'asc',
    showOnlyAlerts: false,
    showOnlyFavorites: false
  })

  const fetchData = async () => {
    setRefreshing(true)
    try {
      const [commoditiesRes, alertsRes] = await Promise.all([
        fetch('/data/enhanced_commodities.json'),
        fetch('/data/alerts.json')
      ])
      
      const commoditiesData = await commoditiesRes.json()
      const alertsData = await alertsRes.json()
      
      setCommodities(commoditiesData.commodities || [])
      setAlerts(alertsData.alerts?.filter((alert: AlertData) => alert.isActive) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      // Fallback to basic data if enhanced data fails
      try {
        const fallbackRes = await fetch('/data/commodities.json')
        const fallbackData = await fallbackRes.json()
        setCommodities(fallbackData.commodities || [])
      } catch (fallbackError) {
        console.error('Error fetching fallback data:', fallbackError)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Enhanced filtering logic
  const filteredCommodities = useMemo(() => {
    let result = [...commodities]

    // Apply search filter
    if (filters.searchTerm) {
      result = result.filter(commodity =>
        commodity.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        commodity.category.toLowerCase().includes(filters.searchTerm.toLowerCase())
      )
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      result = result.filter(commodity => filters.categories.includes(commodity.category))
    }

    // Apply price range filter
    result = result.filter(commodity =>
      commodity.currentPrice >= filters.priceRange[0] &&
      commodity.currentPrice <= filters.priceRange[1]
    )

    // Apply change range filter
    result = result.filter(commodity =>
      commodity.change >= filters.changeRange[0] &&
      commodity.change <= filters.changeRange[1]
    )

    // Apply volatility filter (if volatility data exists)
    result = result.filter(commodity => {
      const volatility = commodity.volatility || Math.abs(commodity.change)
      return volatility >= filters.volatilityRange[0] && volatility <= filters.volatilityRange[1]
    })

    // Apply alerts filter
    if (filters.showOnlyAlerts) {
      const commoditiesWithAlerts = alerts.map(alert => alert.commodity)
      result = result.filter(commodity => commoditiesWithAlerts.includes(commodity.name))
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'price':
          aValue = a.currentPrice
          bValue = b.currentPrice
          break
        case 'change':
          aValue = a.change
          bValue = b.change
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        case 'volatility':
          aValue = a.volatility || Math.abs(a.change)
          bValue = b.volatility || Math.abs(b.change)
          break
        default:
          aValue = a.name
          bValue = b.name
      }

      if (typeof aValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
    })

    return result
  }, [commodities, filters, alerts])

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

  const chartData = filteredCommodities.map((item, index) => ({
    name: item.name.replace(' ', '\n'),
    price: item.currentPrice,
    change: item.change,
    previous: item.previousPrice,
    color: getChartColor(index),
    status: getChangeStatus(item.change)
  }))

  const getInflationData = () => {
    const categories = ['Sayuran', 'Biji-bijian', 'Kebutuhan Pokok', 'Perkebunan']
    return categories.map((category, index) => {
      const categoryItems = filteredCommodities.filter(c => c.category === category)
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

  const handleExportData = useCallback(() => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      commodities: filteredCommodities,
      summary: {
        total: filteredCommodities.length,
        avgInflation: filteredCommodities.length > 0 
          ? (filteredCommodities.reduce((sum, item) => sum + item.change, 0) / filteredCommodities.length).toFixed(2)
          : 0,
        activeAlerts: alerts.filter(a => a.isActive).length
      }
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `komoditas-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredCommodities, alerts])

  const openDetailModal = (commodity: CommodityData) => {
    setSelectedCommodity(commodity)
    setShowDetailModal(true)
  }

  const renderCommodityCard = (commodity: CommodityData) => {
    const status = getChangeStatus(commodity.change)
    const colors = getStatusColors(status)
    
    return (
      <div 
        key={commodity.id} 
        className={`p-5 border-2 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${colors.border} bg-white dark:bg-gray-800 hover:border-blue-400`}
        onClick={() => openDetailModal(commodity)}
        title="Klik untuk melihat detail dan chart trading"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{commodity.name}</h3>
          <div className="flex items-center gap-2">
            {getTrendIcon(commodity.change)}
            <div className={`w-3 h-3 rounded-full ${colors.accent}`}></div>
            <Eye className="w-3 h-3 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            Rp {commodity.currentPrice.toLocaleString('id-ID')}
          </div>
          <div className={`text-sm font-semibold ${getEnhancedTrendColor(commodity.change)} flex items-center gap-1`}>
            {commodity.change > 0 ? '+' : ''}{commodity.change.toFixed(2)}%
            <span className="text-xs text-gray-500 font-normal">vs minggu lalu</span>
          </div>
          <div className="text-2xs text-gray-500 uppercase tracking-wide">per {commodity.unit}</div>
          {commodity.volatility && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Volatilitas: {commodity.volatility.toFixed(1)}%
            </div>
          )}
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
  }

  const renderCommodityList = (commodity: CommodityData) => {
    const status = getChangeStatus(commodity.change)
    const colors = getStatusColors(status)
    
    return (
      <div 
        key={commodity.id} 
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-200"
        onClick={() => openDetailModal(commodity)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${colors.accent}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{commodity.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{commodity.category}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-bold text-gray-900 dark:text-gray-100">
              Rp {commodity.currentPrice.toLocaleString('id-ID')}
            </div>
            <div className={`text-sm ${getEnhancedTrendColor(commodity.change)}`}>
              {commodity.change > 0 ? '+' : ''}{commodity.change.toFixed(2)}%
            </div>
          </div>
          
          {commodity.volatility && (
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {commodity.volatility.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Volatilitas</div>
            </div>
          )}
          
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {(commodity.volume / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500">Volume</div>
          </div>
          
          {getTrendIcon(commodity.change)}
        </div>
      </div>
    )
  }

  const ENHANCED_COLORS = [
    getChartColor(0), getChartColor(1), getChartColor(2), getChartColor(3),
    getChartColor(4), getChartColor(5), getChartColor(6), getChartColor(7)
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data komoditas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-bloomberg animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 font-inter">Enhanced Komoditas Watch</h1>
            <p className="text-xl text-emerald-100 font-light">
              Advanced Real-time Trading & Analytics Dashboard
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <Activity className="w-5 h-5" />
                <span className="font-medium">{commodities.length} Komoditas</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <TrendUp className="w-5 h-5" />
                <span className="font-medium">Live Charts</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-xs">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Technical Analysis</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20 animate-bounce-gentle">📊</div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls with Functional Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button 
              variant={viewMode === 'charts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('charts')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Charts
            </Button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <FilterPanel 
            filters={filters}
            onFiltersChange={setFilters}
            commodities={commodities}
          />
          
          <AlertCenter 
            alerts={alerts}
            onAlertUpdate={setAlerts}
          />
          
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
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportData}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <ThemeToggle />
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Rata-rata Inflasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 font-mono">
              {(filteredCommodities.length > 0 
                ? (filteredCommodities.reduce((sum, item) => sum + item.change, 0) / filteredCommodities.length) 
                : 0
              ).toFixed(1)}%
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center mt-2">
              <TrendingUp className="w-4 h-4 mr-1" />
              Filtered data: {filteredCommodities.length} items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 font-mono">{alerts.filter(a => a.isActive).length}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-red-500 text-white text-xs">
                {alerts.filter(a => a.severity === 'high' && a.isActive).length} High
              </Badge>
              <Badge className="bg-orange-500 text-white text-xs">
                {alerts.filter(a => a.severity === 'medium' && a.isActive).length} Medium
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Harga Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 font-mono">
              Rp {filteredCommodities.length > 0 ? Math.max(...filteredCommodities.map(c => c.currentPrice)).toLocaleString('id-ID') : 0}
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
              {filteredCommodities.find(c => c.currentPrice === Math.max(...filteredCommodities.map(x => x.currentPrice)))?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 shadow-soft hover:shadow-depth transition-all duration-300 animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Volatilitas Tinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 font-mono">
              {filteredCommodities.length > 0 ? Math.max(...filteredCommodities.map(c => c.volatility || Math.abs(c.change))).toFixed(1) : 0}%
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              {filteredCommodities.find(c => (c.volatility || Math.abs(c.change)) === Math.max(...filteredCommodities.map(x => x.volatility || Math.abs(x.change))))?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Charts Section */}
      {viewMode === 'charts' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCommodities.slice(0, 6).map(commodity => (
              <SimpleLineChart
                key={commodity.id}
                commodityName={commodity.name}
                data={commodity.priceHistory?.['1D'] || []}
                currentPrice={commodity.currentPrice}
                change={commodity.change}
                unit={commodity.unit}
                height={300}
                showPoints={true}
                showTrend={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Data View Section */}
      {viewMode !== 'charts' && (
        <Card className="shadow-soft hover:shadow-depth transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                Enhanced Commodities Overview
                <Badge variant="outline" className="ml-3 font-mono text-xs">
                  {filteredCommodities.length}/{commodities.length}
                </Badge>
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Advanced monitoring dengan enhanced filtering dan real-time updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredCommodities.map(renderCommodityCard)}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCommodities.map(renderCommodityList)}
              </div>
            )}
            
            {filteredCommodities.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tidak ada data yang sesuai filter</h3>
                <p className="text-gray-500 dark:text-gray-400">Ubah filter atau reset untuk melihat semua data</p>
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({
                    searchTerm: '',
                    categories: [],
                    provinces: [],
                    priceRange: [0, 100000],
                    changeRange: [-50, 50],
                    dateRange: { from: undefined, to: undefined },
                    volatilityRange: [0, 100],
                    sortBy: 'name',
                    sortOrder: 'asc',
                    showOnlyAlerts: false,
                    showOnlyFavorites: false
                  })}
                  className="mt-4"
                >
                  Reset Filter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced News & Alerts Section */}
      <EnhancedNewsAlerts />

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              {selectedCommodity?.name}
              <Badge variant="outline" className="font-mono text-xs">
                Detail Analysis
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Analisis mendalam dan trading chart untuk {selectedCommodity?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCommodity && (
            <div className="flex-1 overflow-y-auto">
              <SimpleLineChart
                commodityName={selectedCommodity.name}
                data={selectedCommodity.priceHistory?.['1D'] || []}
                currentPrice={selectedCommodity.currentPrice}
                change={selectedCommodity.change}
                unit={selectedCommodity.unit}
                height={400}
                showPoints={true}
                showTrend={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnhancedDashboard
