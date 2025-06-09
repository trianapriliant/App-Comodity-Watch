import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Clock,
  Calendar,
  CalendarDays,
  Target
} from 'lucide-react'

interface PriceData {
  date: string
  price: number
  time?: string
}

interface SimpleLineChartProps {
  commodityName: string
  data: PriceData[]
  currentPrice: number
  change: number
  unit: string
  showPoints?: boolean
  showTrend?: boolean
  colors?: string[]
  height?: number
  timeScale?: string
  onTimeScaleChange?: (scale: string) => void
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  commodityName,
  data,
  currentPrice,
  change,
  unit,
  showPoints = true,
  showTrend = true,
  colors = ['#3B82F6', '#10B981', '#F59E0B'],
  height = 300,
  timeScale = '1D',
  onTimeScaleChange
}) => {
  const [selectedTimeScale, setSelectedTimeScale] = useState(timeScale)

  const timeScales = {
    '1H': { label: 'Jam', icon: Clock, desc: '24 jam terakhir' },
    '1D': { label: 'Hari', icon: Calendar, desc: '30 hari terakhir' },
    '1W': { label: 'Minggu', icon: CalendarDays, desc: '12 minggu terakhir' },
    '1M': { label: 'Bulan', icon: CalendarDays, desc: '12 bulan terakhir' },
    '1Y': { label: 'Tahun', icon: Target, desc: '5 tahun terakhir' }
  }

  const handleTimeScaleChange = (scale: string) => {
    setSelectedTimeScale(scale)
    if (onTimeScaleChange) {
      onTimeScaleChange(scale)
    }
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  const getChartColor = (change: number) => {
    if (change > 0) return '#10B981' // Green
    if (change < 0) return '#EF4444' // Red
    return '#3B82F6' // Blue
  }

  const formatTooltipValue = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    switch (selectedTimeScale) {
      case '1H':
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      case '1D':
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      case '1W':
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      case '1M':
        return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      case '1Y':
        return date.toLocaleDateString('id-ID', { year: 'numeric' })
      default:
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{commodityName}</CardTitle>
            <CardDescription>
              Grafik harga {timeScales[selectedTimeScale]?.desc || 'real-time'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              Rp {currentPrice.toLocaleString('id-ID')}
              <span className="text-sm font-normal text-gray-500">/{unit}</span>
            </div>
            <div className={`flex items-center justify-end space-x-1 ${getTrendColor(change)}`}>
              {getTrendIcon(change)}
              <span className="font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Time Scale Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(timeScales).map(([scale, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={scale}
                variant={selectedTimeScale === scale ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeScaleChange(scale)}
                className="flex items-center space-x-1"
              >
                <Icon className="w-3 h-3" />
                <span>{config.label}</span>
              </Button>
            )
          })}
        </div>

        {/* Chart */}
        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            {showTrend ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => [formatTooltipValue(value), 'Harga']}
                  labelFormatter={(date) => `Tanggal: ${formatDate(date)}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={getChartColor(change)}
                  strokeWidth={2}
                  fill={getChartColor(change)}
                  fillOpacity={0.1}
                  dot={showPoints ? { r: 3, strokeWidth: 2 } : false}
                />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => [formatTooltipValue(value), 'Harga']}
                  labelFormatter={(date) => `Tanggal: ${formatDate(date)}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={getChartColor(change)}
                  strokeWidth={2}
                  dot={showPoints ? { r: 3, strokeWidth: 2 } : false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Info */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <Badge variant="outline" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              {data.length} titik data
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            Update terakhir: {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SimpleLineChart
