import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

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

interface AlertCenterProps {
  alerts: AlertData[]
  onAlertUpdate?: (alerts: AlertData[]) => void
  onCreateAlert?: (alert: Partial<AlertData>) => void
}

const AlertCenter: React.FC<AlertCenterProps> = ({ 
  alerts: initialAlerts = [], 
  onAlertUpdate, 
  onCreateAlert 
}) => {
  const [alerts, setAlerts] = useState<AlertData[]>(initialAlerts)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showRead, setShowRead] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Filter alerts based on search and filters
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.commodity.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity
    const matchesType = filterType === 'all' || alert.type === filterType
    const matchesReadStatus = showRead || !alert.isRead

    return matchesSearch && matchesSeverity && matchesType && matchesReadStatus && alert.isActive
  })

  // Group alerts by severity
  const alertsBySeverity = {
    critical: filteredAlerts.filter(a => a.severity === 'critical'),
    high: filteredAlerts.filter(a => a.severity === 'high'),
    medium: filteredAlerts.filter(a => a.severity === 'medium'),
    low: filteredAlerts.filter(a => a.severity === 'low')
  }

  const unreadCount = alerts.filter(alert => !alert.isRead && alert.isActive).length

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-600" />
      case 'low':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      default:
        return <Info className="w-4 h-4 text-gray-600" />
    }
  }

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          dot: 'bg-red-500',
          text: 'text-red-800',
          badge: 'bg-red-500'
        }
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          dot: 'bg-orange-500',
          text: 'text-orange-800',
          badge: 'bg-orange-500'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500',
          text: 'text-yellow-800',
          badge: 'bg-yellow-500'
        }
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
          text: 'text-blue-800',
          badge: 'bg-blue-500'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          dot: 'bg-gray-500',
          text: 'text-gray-800',
          badge: 'bg-gray-500'
        }
    }
  }

  const markAsRead = (alertId: string) => {
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isRead: true } : alert
    )
    setAlerts(updatedAlerts)
    onAlertUpdate?.(updatedAlerts)
  }

  const markAllAsRead = () => {
    const updatedAlerts = alerts.map(alert => ({ ...alert, isRead: true }))
    setAlerts(updatedAlerts)
    onAlertUpdate?.(updatedAlerts)
  }

  const togglePin = (alertId: string) => {
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isPinned: !alert.isPinned } : alert
    )
    setAlerts(updatedAlerts)
    onAlertUpdate?.(updatedAlerts)
  }

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isActive: false } : alert
    )
    setAlerts(updatedAlerts)
    onAlertUpdate?.(updatedAlerts)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const alertTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'Baru saja'
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} jam lalu`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} hari lalu`
  }

  // Simulate new alerts coming in
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // In real app, this would fetch from API
      const hasNewAlerts = Math.random() > 0.8 // 20% chance of new alert
      
      if (hasNewAlerts && alerts.length > 0) {
        const newAlert: AlertData = {
          id: `alert_${Date.now()}`,
          type: 'price_spike',
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
          title: 'Kenaikan Harga Terpantau',
          message: `Harga ${alerts[0].commodity} mengalami kenaikan signifikan`,
          commodity: alerts[0].commodity,
          province: alerts[0].province,
          timestamp: new Date().toISOString(),
          isActive: true,
          isRead: false,
          isPinned: false,
          price: 25000 + Math.random() * 20000,
          changePercent: 5 + Math.random() * 15
        }
        
        setAlerts(prev => [newAlert, ...prev])
        
        if (soundEnabled) {
          // Play notification sound (would use actual audio file)
          console.log('🔔 New alert sound')
        }
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, soundEnabled, alerts.length])

  // Update alerts when prop changes
  useEffect(() => {
    setAlerts(initialAlerts)
  }, [initialAlerts])

  return (
    <>
      {/* Alert Bell Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="relative border-gray-200 hover:bg-gray-50"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Pusat Alert & Notifikasi
                <Badge variant="outline" className="font-mono">
                  {filteredAlerts.length} active
                </Badge>
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={soundEnabled ? 'bg-blue-50' : ''}
                >
                  {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'bg-green-50' : ''}
                >
                  <Clock className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Tandai Semua Dibaca
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Monitor dan kelola semua alert komoditas dalam real-time
            </DialogDescription>
          </DialogHeader>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari alert..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="price_spike">Kenaikan Harga</SelectItem>
                <SelectItem value="price_drop">Penurunan Harga</SelectItem>
                <SelectItem value="supply_shortage">Kelangkaan</SelectItem>
                <SelectItem value="weather_alert">Cuaca</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRead(!showRead)}
              className={!showRead ? 'bg-blue-50' : ''}
            >
              {showRead ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>

          {/* Alert Summary */}
          <div className="grid grid-cols-4 gap-4 p-4">
            {Object.entries(alertsBySeverity).map(([severity, alerts]) => {
              const colors = getSeverityColors(severity)
              return (
                <div key={severity} className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{severity}</span>
                    <Badge className={`${colors.badge} text-white`}>
                      {alerts.length}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Tidak ada alert</h3>
                <p className="text-gray-500">Semua kondisi normal atau filter tidak menampilkan hasil</p>
              </div>
            ) : (
              filteredAlerts.map((alert, index) => {
                const colors = getSeverityColors(alert.severity)
                const isUnread = !alert.isRead
                
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start space-x-4 p-4 border-2 rounded-xl hover:shadow-md transition-all duration-300 cursor-pointer ${
                      colors.bg
                    } ${colors.border} ${isUnread ? 'shadow-lg' : ''}`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className={`w-4 h-4 rounded-full ${colors.dot} mt-1 ${isUnread ? 'animate-pulse' : ''}`}></div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <h4 className={`font-semibold text-sm ${colors.text} ${isUnread ? 'font-bold' : ''}`}>
                            {alert.title}
                          </h4>
                          {alert.isPinned && (
                            <Badge variant="outline" className="text-xs">
                              📌
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Badge className={`text-xs ${colors.badge} text-white`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatTimeAgo(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-600 space-x-4 font-medium">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {alert.commodity}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.province}
                          </span>
                          {alert.price && (
                            <span className="flex items-center gap-1">
                              Rp {alert.price.toLocaleString('id-ID')}
                            </span>
                          )}
                          {alert.changePercent && (
                            <span className={`flex items-center gap-1 ${
                              alert.changePercent > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {alert.changePercent > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {alert.changePercent > 0 ? '+' : ''}{alert.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(alert.id)
                            }}
                            className="h-6 px-2"
                          >
                            📌
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAlert(alert.id)
                            }}
                            className="h-6 px-2 hover:bg-red-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AlertCenter
