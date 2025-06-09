import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, UTCTimestamp, CandlestickData, HistogramData, LineData } from 'lightweight-charts'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  Maximize2,
  Download,
  Settings,
  Activity,
  Volume2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react'

interface OHLCData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

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
  technicalIndicators: {
    ma7: number
    ma14: number
    ma30: number
    rsi: number
    bollinger: {
      upper: number
      middle: number
      lower: number
    }
  }
  ohlcData: OHLCData[]
}

interface TradingViewChartProps {
  commodity: CommodityData
  height?: number
  showControls?: boolean
  autoSize?: boolean
}

type TimeframeType = '1H' | '4H' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  commodity, 
  height = 500, 
  showControls = true,
  autoSize = true 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chart = useRef<any>(null)
  const candlestickSeries = useRef<any>(null)
  const volumeSeries = useRef<any>(null)
  const ma7Series = useRef<any>(null)
  const ma14Series = useRef<any>(null)
  const ma30Series = useRef<any>(null)
  const bollingerUpperSeries = useRef<any>(null)
  const bollingerLowerSeries = useRef<any>(null)

  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('1D')
  const [showVolume, setShowVolume] = useState(true)
  const [showMA, setShowMA] = useState(true)
  const [showBollinger, setShowBollinger] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  // Convert date string to UTC timestamp
  const convertToTimestamp = (dateString: string): UTCTimestamp => {
    return Math.floor(new Date(dateString).getTime() / 1000) as UTCTimestamp
  }

  // Prepare chart data
  const prepareCandlestickData = (): CandlestickData[] => {
    return commodity.ohlcData.map(item => ({
      time: convertToTimestamp(item.time),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }))
  }

  const prepareVolumeData = (): HistogramData[] => {
    return commodity.ohlcData.map(item => ({
      time: convertToTimestamp(item.time),
      value: item.volume,
      color: item.close >= item.open ? '#26a69a' : '#ef5350'
    }))
  }

  const prepareMAData = (period: number): LineData[] => {
    const maValue = period === 7 ? commodity.technicalIndicators.ma7 :
                    period === 14 ? commodity.technicalIndicators.ma14 :
                    commodity.technicalIndicators.ma30
    
    return commodity.ohlcData.map(item => ({
      time: convertToTimestamp(item.time),
      value: maValue + (Math.random() - 0.5) * 100 // Simulate MA variation
    }))
  }

  const prepareBollingerData = (type: 'upper' | 'lower'): LineData[] => {
    const baseValue = type === 'upper' ? 
      commodity.technicalIndicators.bollinger.upper : 
      commodity.technicalIndicators.bollinger.lower
    
    return commodity.ohlcData.map(item => ({
      time: convertToTimestamp(item.time),
      value: baseValue + (Math.random() - 0.5) * 50 // Simulate Bollinger variation
    }))
  }

  const initChart = () => {
    if (!chartContainerRef.current) return

    try {
      // Create chart
      chart.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: {
            color: '#f0f0f0',
          },
          horzLines: {
            color: '#f0f0f0',
          },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#cccccc',
        },
        timeScale: {
          borderColor: '#cccccc',
          timeVisible: true,
          secondsVisible: false,
        },
        height: height,
        ...(autoSize && { autoSize: true })
      })

      // Add candlestick series
      if (chart.current && typeof chart.current.addCandlestickSeries === 'function') {
        candlestickSeries.current = chart.current.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderDownColor: '#ef5350',
          borderUpColor: '#26a69a',
          wickDownColor: '#ef5350',
          wickUpColor: '#26a69a',
        })
      } else {
        console.warn('Candlestick series not available, falling back to line chart')
        // Fallback to line series if candlestick is not available
        candlestickSeries.current = chart.current.addLineSeries({
          color: '#2196F3',
          lineWidth: 2,
        })
      }

      // Add volume series
      if (showVolume && chart.current.addHistogramSeries) {
        volumeSeries.current = chart.current.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.7,
            bottom: 0,
          },
        })
      }

      // Add Moving Averages
      if (showMA && chart.current.addLineSeries) {
        ma7Series.current = chart.current.addLineSeries({
          color: '#2196F3',
          lineWidth: 2,
          title: 'MA7',
        })

        ma14Series.current = chart.current.addLineSeries({
          color: '#FF9800',
          lineWidth: 2,
          title: 'MA14',
        })

        ma30Series.current = chart.current.addLineSeries({
          color: '#9C27B0',
          lineWidth: 2,
          title: 'MA30',
        })
      }

      // Add Bollinger Bands
      if (showBollinger && chart.current.addLineSeries) {
        bollingerUpperSeries.current = chart.current.addLineSeries({
          color: '#E91E63',
          lineWidth: 1,
          title: 'BB Upper',
          lineStyle: 2, // Dashed
        })

        bollingerLowerSeries.current = chart.current.addLineSeries({
          color: '#E91E63',
          lineWidth: 1,
          title: 'BB Lower',
          lineStyle: 2, // Dashed
        })
      }

      setChartReady(true)
      setChartError(null)
    } catch (error) {
      console.error('Error initializing chart:', error)
      setChartReady(false)
      setChartError(error instanceof Error ? error.message : 'Failed to initialize chart')
    }
  }

  const updateChartData = () => {
    if (!chartReady || !candlestickSeries.current) return

    try {
      const candlestickData = prepareCandlestickData()
      
      // Try to set candlestick data, fallback to line data if needed
      if (candlestickSeries.current.setData) {
        candlestickSeries.current.setData(candlestickData)
      } else if (candlestickSeries.current.setData) {
        // Convert to line data if candlestick fails
        const lineData = commodity.ohlcData.map(item => ({
          time: convertToTimestamp(item.time),
          value: item.close
        }))
        candlestickSeries.current.setData(lineData)
      }

    if (showVolume && volumeSeries.current) {
      const volumeData = prepareVolumeData()
      volumeSeries.current.setData(volumeData)
    }

    if (showMA) {
      if (ma7Series.current) {
        ma7Series.current.setData(prepareMAData(7))
      }
      if (ma14Series.current) {
        ma14Series.current.setData(prepareMAData(14))
      }
      if (ma30Series.current) {
        ma30Series.current.setData(prepareMAData(30))
      }
    }

    if (showBollinger) {
      if (bollingerUpperSeries.current) {
        bollingerUpperSeries.current.setData(prepareBollingerData('upper'))
      }
      if (bollingerLowerSeries.current) {
        bollingerLowerSeries.current.setData(prepareBollingerData('lower'))
      }
    }
    } catch (error) {
      console.error('Error updating chart data:', error)
    }
  }

  const handleTimeframeChange = (timeframe: TimeframeType) => {
    setSelectedTimeframe(timeframe)
    // In real implementation, this would fetch different data
    updateChartData()
  }

  const handleZoomIn = () => {
    chart.current?.timeScale().scrollToPosition(2, true)
  }

  const handleZoomOut = () => {
    chart.current?.timeScale().scrollToPosition(-2, true)
  }

  const handleReset = () => {
    chart.current?.timeScale().fitContent()
  }

  const handleDownload = () => {
    // Implement screenshot/download functionality
    console.log('Download chart')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    initChart()

    return () => {
      if (chart.current) {
        chart.current.remove()
      }
    }
  }, [])

  useEffect(() => {
    updateChartData()
  }, [chartReady, showVolume, showMA, showBollinger, commodity])

  useEffect(() => {
    if (chart.current && autoSize) {
      chart.current.applyOptions({ autoSize: true })
    }
  }, [autoSize])

  const getTrendIcon = () => {
    return commodity.change > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  const getTrendColor = () => {
    return commodity.change > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className={`shadow-soft hover:shadow-depth transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" />
              {commodity.name}
              <Badge variant="outline" className="font-mono text-xs">
                {selectedTimeframe}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span>Rp {commodity.currentPrice.toLocaleString('id-ID')} per {commodity.unit}</span>
              <span className={`flex items-center gap-1 font-semibold ${getTrendColor()}`}>
                {getTrendIcon()}
                {commodity.change > 0 ? '+' : ''}{commodity.change.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">
                Vol: {commodity.volume.toLocaleString('id-ID')}
              </span>
            </CardDescription>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1H">1H</SelectItem>
                  <SelectItem value="4H">4H</SelectItem>
                  <SelectItem value="1D">1D</SelectItem>
                  <SelectItem value="1W">1W</SelectItem>
                  <SelectItem value="1M">1M</SelectItem>
                  <SelectItem value="3M">3M</SelectItem>
                  <SelectItem value="6M">6M</SelectItem>
                  <SelectItem value="1Y">1Y</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-3 h-3" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-3 h-3" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3 h-3" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowVolume(!showVolume)}
                className={showVolume ? 'bg-blue-50' : ''}
              >
                <Volume2 className="w-3 h-3" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMA(!showMA)}
                className={showMA ? 'bg-green-50' : ''}
              >
                MA
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowBollinger(!showBollinger)}
                className={showBollinger ? 'bg-purple-50' : ''}
              >
                BB
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-3 h-3" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {chartError ? (
          // Fallback chart using Recharts
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Using fallback chart (Recharts)</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                TradingView integration unavailable: {chartError}
              </p>
            </div>
            
            <div style={{ height: isFullscreen ? 'calc(100vh - 350px)' : `${height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commodity.ohlcData.map(item => ({
                  time: new Date(item.time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
                  price: item.close,
                  volume: item.volume
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
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
                    formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Harga']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563EB" 
                    strokeWidth={2}
                    dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div 
            ref={chartContainerRef} 
            className="w-full" 
            style={{ height: isFullscreen ? 'calc(100vh - 200px)' : `${height}px` }}
          />
        )}
        
        {/* Technical Indicators Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">RSI (14):</span>
              <span className={`ml-2 font-semibold ${
                commodity.technicalIndicators.rsi > 70 ? 'text-red-600' :
                commodity.technicalIndicators.rsi < 30 ? 'text-green-600' : 'text-gray-800'
              }`}>
                {commodity.technicalIndicators.rsi.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Volatilitas:</span>
              <span className="ml-2 font-semibold text-gray-800">
                {commodity.volatility.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">MA7:</span>
              <span className="ml-2 font-semibold text-blue-600">
                Rp {commodity.technicalIndicators.ma7.toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Volume:</span>
              <span className="ml-2 font-semibold text-gray-800">
                {(commodity.volume / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TradingViewChart
