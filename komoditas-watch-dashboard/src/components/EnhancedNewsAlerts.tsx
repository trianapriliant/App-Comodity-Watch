import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Filter,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Target,
  CloudSnow,
  DollarSign,
  FileText
} from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  source: string
  timestamp: string
  category: 'PRICE_ALERT' | 'POLICY' | 'WEATHER' | 'SUPPLY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  content: string
  impact: string
  relatedCommodities: string[]
}

interface AlertItem {
  id: string
  type: string
  commodity: string
  message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: string
  action: string
  threshold?: number
  currentChange?: number
  description?: string
}

interface MarketSentiment {
  overall: string
  volatilityIndex: number
  trendsUp: number
  trendsDown: number
  activeAlerts: number
}

interface NewsAlertsData {
  updated: string
  news: NewsItem[]
  alerts: AlertItem[]
  priceAlerts: {
    today: number
    week: number
    month: number
    critical: number
    warning: number
    info: number
  }
  marketSentiment: MarketSentiment
}

const EnhancedNewsAlerts: React.FC = () => {
  const [newsAlertsData, setNewsAlertsData] = useState<NewsAlertsData | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNewsAlerts = async () => {
      try {
        const response = await fetch('/data/real_news_alerts.json')
        const data = await response.json()
        setNewsAlertsData(data)
      } catch (error) {
        console.error('Error loading news and alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNewsAlerts()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadNewsAlerts, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white'
      case 'HIGH': return 'bg-orange-600 text-white'
      case 'MEDIUM': return 'bg-yellow-600 text-white'
      case 'LOW': return 'bg-blue-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="w-4 h-4" />
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />
      case 'MEDIUM': return <Info className="w-4 h-4" />
      case 'LOW': return <CheckCircle className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRICE_ALERT': return <DollarSign className="w-4 h-4" />
      case 'WEATHER': return <CloudSnow className="w-4 h-4" />
      case 'SUPPLY': return <Package className="w-4 h-4" />
      case 'POLICY': return <FileText className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} menit yang lalu`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} jam yang lalu`
    } else {
      return `${Math.floor(diffInMinutes / 1440)} hari yang lalu`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Loading News & Alerts...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!newsAlertsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Gagal memuat data berita dan alert. Silakan refresh halaman.</p>
        </CardContent>
      </Card>
    )
  }

  const filteredNews = selectedSeverity === 'all' 
    ? newsAlertsData.news 
    : newsAlertsData.news.filter(news => news.severity === selectedSeverity.toUpperCase())

  const filteredAlerts = selectedSeverity === 'all' 
    ? newsAlertsData.alerts 
    : newsAlertsData.alerts.filter(alert => alert.severity === selectedSeverity.toUpperCase())

  return (
    <div className="space-y-6">
      {/* Market Sentiment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            Sentimen Pasar Real-time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{newsAlertsData.marketSentiment.trendsUp}</div>
              <div className="text-sm text-gray-600">Trend Naik</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{newsAlertsData.marketSentiment.trendsDown}</div>
              <div className="text-sm text-gray-600">Trend Turun</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{newsAlertsData.marketSentiment.volatilityIndex}%</div>
              <div className="text-sm text-gray-600">Volatilitas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{newsAlertsData.marketSentiment.activeAlerts}</div>
              <div className="text-sm text-gray-600">Alert Aktif</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alert Hari Ini</p>
                <p className="text-2xl font-bold">{newsAlertsData.priceAlerts.today}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kritis</p>
                <p className="text-2xl font-bold text-red-600">{newsAlertsData.priceAlerts.critical}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Peringatan</p>
                <p className="text-2xl font-bold text-orange-600">{newsAlertsData.priceAlerts.warning}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Informasi</p>
                <p className="text-2xl font-bold text-blue-600">{newsAlertsData.priceAlerts.info}</p>
              </div>
              <Info className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* News and Alerts Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Newspaper className="w-5 h-5 mr-2 text-purple-600" />
              Berita & Alert Real-time
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Diperbarui: {getTimeAgo(newsAlertsData.updated)}
              </Badge>
              <select 
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">Semua Tingkat</option>
                <option value="critical">Kritis</option>
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="news">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="news">
                Berita ({filteredNews.length})
              </TabsTrigger>
              <TabsTrigger value="alerts">
                Alert ({filteredAlerts.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="news" className="space-y-4 mt-4">
              {filteredNews.map((news) => (
                <Card key={news.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getCategoryIcon(news.category)}
                          <Badge className={getSeverityColor(news.severity)}>
                            {news.severity}
                          </Badge>
                          <Badge variant="outline">{news.category}</Badge>
                          <span className="text-xs text-gray-500">{getTimeAgo(news.timestamp)}</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{news.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{news.content}</p>
                        <p className="text-xs text-blue-600 font-medium">💡 {news.impact}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          {news.source}
                          {news.relatedCommodities.length > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <Package className="w-3 h-3 mr-1" />
                              {news.relatedCommodities.join(', ')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4 mt-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getSeverityIcon(alert.severity)}
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                          <span className="text-xs text-gray-500">{getTimeAgo(alert.timestamp)}</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{alert.message}</h4>
                        {alert.description && (
                          <p className="text-xs text-gray-600 mb-2">{alert.description}</p>
                        )}
                        {alert.currentChange && (
                          <div className="flex items-center space-x-1 text-xs mb-2">
                            {alert.currentChange > 0 ? 
                              <TrendingUp className="w-3 h-3 text-red-600" /> : 
                              <TrendingDown className="w-3 h-3 text-green-600" />
                            }
                            <span className={alert.currentChange > 0 ? 'text-red-600' : 'text-green-600'}>
                              {alert.currentChange > 0 ? '+' : ''}{alert.currentChange}%
                            </span>
                            {alert.threshold && (
                              <span className="text-gray-500">(Threshold: {alert.threshold}%)</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-green-600 font-medium">🎯 {alert.action}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Package className="w-3 h-3 mr-1" />
                          {alert.commodity}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedNewsAlerts
