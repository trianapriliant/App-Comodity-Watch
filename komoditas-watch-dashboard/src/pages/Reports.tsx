import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Share2,
  Filter,
  Eye,
  Clock,
  File
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import { DateRange } from 'react-day-picker'

const Reports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [selectedReport, setSelectedReport] = useState('summary')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>(['cabai', 'beras', 'tomat'])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(['jawa-barat', 'jawa-tengah', 'jawa-timur'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false)
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [commoditiesData, setCommoditiesData] = useState<any[]>([])
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Load commodities data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/enhanced_commodities.json')
        const data = await response.json()
        setCommoditiesData(data.commodities || [])
      } catch (error) {
        console.error('Error loading commodities data:', error)
      }
    }
    loadData()
  }, [])

  // Commodity and Province options
  const commodityOptions = [
    { id: 'beras', name: 'Beras Premium' },
    { id: 'jagung', name: 'Jagung Pakan' },
    { id: 'kedelai', name: 'Kedelai Lokal' },
    { id: 'gula', name: 'Gula Pasir' },
    { id: 'cabai', name: 'Cabai Merah' },
    { id: 'tomat', name: 'Tomat' },
    { id: 'bawang-merah', name: 'Bawang Merah' },
    { id: 'daging-ayam', name: 'Daging Ayam' },
    { id: 'kopi', name: 'Kopi Arabika' },
    { id: 'kelapa-sawit', name: 'TBS Kelapa Sawit' }
  ]

  const provinceOptions = [
    { id: 'dki-jakarta', name: 'DKI Jakarta' },
    { id: 'jawa-barat', name: 'Jawa Barat' },
    { id: 'jawa-tengah', name: 'Jawa Tengah' },
    { id: 'jawa-timur', name: 'Jawa Timur' },
    { id: 'sumatera-utara', name: 'Sumatera Utara' },
    { id: 'sumatera-barat', name: 'Sumatera Barat' },
    { id: 'sulawesi-selatan', name: 'Sulawesi Selatan' },
    { id: 'kalimantan-timur', name: 'Kalimantan Timur' }
  ]

  const handleCommodityToggle = (commodityId: string) => {
    setSelectedCommodities(prev => 
      prev.includes(commodityId) 
        ? prev.filter(id => id !== commodityId)
        : [...prev, commodityId]
    )
  }

  const handleProvinceToggle = (provinceId: string) => {
    setSelectedProvinces(prev => 
      prev.includes(provinceId) 
        ? prev.filter(id => id !== provinceId)
        : [...prev, provinceId]
    )
  }

  // Report Generation Functions
  const generateReportData = () => {
    const filteredCommodities = commoditiesData.filter(c => 
      selectedCommodities.includes(c.id)
    )
    
    const reportSummary = {
      title: getReportTitle(),
      period: selectedPeriod,
      dateRange: dateRange,
      commoditiesCount: filteredCommodities.length,
      provincesCount: selectedProvinces.length,
      generatedAt: new Date().toISOString(),
      commodities: filteredCommodities.map(c => ({
        name: c.name,
        currentPrice: c.currentPrice,
        change: c.change,
        volatility: c.volatility,
        category: c.category
      })),
      provinces: selectedProvinces,
      summary: {
        avgPrice: filteredCommodities.reduce((sum, c) => sum + c.currentPrice, 0) / filteredCommodities.length,
        totalVolatility: filteredCommodities.reduce((sum, c) => sum + (c.volatility || 0), 0),
        positiveChanges: filteredCommodities.filter(c => c.change > 0).length,
        negativeChanges: filteredCommodities.filter(c => c.change < 0).length
      }
    }
    
    return reportSummary
  }

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'summary': return 'Laporan Ringkasan Eksekutif'
      case 'price-analysis': return 'Analisis Harga & Volatilitas'
      case 'regional': return 'Distribusi Regional'
      case 'prediction': return 'Prediksi & Forecast'
      default: return 'Laporan Komoditas'
    }
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    setSuccessMessage('')
    try {
      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const data = generateReportData()
      setReportData(data)
      
      // Generate and download PDF
      await generatePDF(data)
      
      setSuccessMessage('Laporan PDF berhasil di-generate dan didownload!')
      setTimeout(() => setSuccessMessage(''), 5000)
      
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Gagal generate laporan. Silakan coba lagi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generatePDF = async (data: any) => {
    try {
      const pdf = new jsPDF()
      
      // Set Indonesian font and add header
      pdf.setFontSize(20)
      pdf.text(data.title, 20, 30)
      
      pdf.setFontSize(12)
      pdf.text(`Generated: ${new Date(data.generatedAt).toLocaleString('id-ID')}`, 20, 45)
      pdf.text(`Period: ${data.period} | Commodities: ${data.commoditiesCount} | Provinces: ${data.provincesCount}`, 20, 55)
      
      // Add summary section
      pdf.setFontSize(16)
      pdf.text('Ringkasan Eksekutif', 20, 75)
      
      pdf.setFontSize(12)
      pdf.text(`Rata-rata Harga: Rp ${Math.round(data.summary.avgPrice).toLocaleString('id-ID')}`, 20, 90)
      pdf.text(`Total Volatilitas: ${data.summary.totalVolatility.toFixed(1)}%`, 20, 100)
      pdf.text(`Komoditas Naik: ${data.summary.positiveChanges} | Komoditas Turun: ${data.summary.negativeChanges}`, 20, 110)
      
      // Add commodities table
      pdf.setFontSize(16)
      pdf.text('Detail Komoditas', 20, 130)
      
      // Table headers
      pdf.setFontSize(10)
      const headers = ['Nama', 'Harga (Rp)', 'Perubahan (%)', 'Volatilitas (%)', 'Kategori']
      const startY = 145
      let currentY = startY
      
      // Draw table headers
      headers.forEach((header, index) => {
        pdf.text(header, 20 + (index * 35), currentY)
      })
      
      currentY += 10
      
      // Draw table data
      data.commodities.slice(0, 15).forEach((commodity: any, index: number) => { // Limit to 15 for space
        pdf.text(commodity.name.substring(0, 12), 20, currentY)
        pdf.text(commodity.currentPrice.toLocaleString('id-ID'), 55, currentY)
        pdf.text(`${commodity.change > 0 ? '+' : ''}${commodity.change.toFixed(1)}%`, 90, currentY)
        pdf.text(`${(commodity.volatility || 0).toFixed(1)}%`, 125, currentY)
        pdf.text(commodity.category.substring(0, 10), 160, currentY)
        currentY += 8
        
        // Add new page if needed
        if (currentY > 270) {
          pdf.addPage()
          currentY = 30
        }
      })
      
      // Save the PDF
      pdf.save(`laporan-komoditas-${data.period}-${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback to HTML if PDF generation fails
      const htmlContent = createHTMLReport(data)
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-komoditas-${data.period}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const createHTMLReport = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
          .section { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p>Generated: ${new Date(data.generatedAt).toLocaleString('id-ID')}</p>
          <p>Period: ${data.period} | Commodities: ${data.commoditiesCount} | Provinces: ${data.provincesCount}</p>
        </div>
        
        <div class="section">
          <h2>Ringkasan Eksekutif</h2>
          <p>Rata-rata Harga: Rp ${Math.round(data.summary.avgPrice).toLocaleString('id-ID')}</p>
          <p>Total Volatilitas: ${data.summary.totalVolatility.toFixed(1)}%</p>
          <p>Komoditas Naik: ${data.summary.positiveChanges} | Komoditas Turun: ${data.summary.negativeChanges}</p>
        </div>

        <div class="section">
          <h2>Detail Komoditas</h2>
          <table>
            <tr>
              <th>Nama</th>
              <th>Harga Saat Ini</th>
              <th>Perubahan (%)</th>
              <th>Volatilitas</th>
              <th>Kategori</th>
            </tr>
            ${data.commodities.map((c: any) => `
              <tr>
                <td>${c.name}</td>
                <td>Rp ${c.currentPrice.toLocaleString('id-ID')}</td>
                <td>${c.change > 0 ? '+' : ''}${c.change.toFixed(2)}%</td>
                <td>${(c.volatility || 0).toFixed(1)}%</td>
                <td>${c.category}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
      </html>
    `
  }

  const handlePreview = () => {
    const data = generateReportData()
    setReportData(data)
    setShowPreview(true)
  }

  const handleDownloadCSV = async () => {
    if (!commoditiesData.length) return
    
    setIsDownloadingCSV(true)
    setSuccessMessage('')
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const filteredCommodities = commoditiesData.filter(c => 
        selectedCommodities.includes(c.id)
      )
      
      const csvContent = [
        ['Nama', 'Harga Saat Ini', 'Perubahan (%)', 'Volatilitas (%)', 'Kategori', 'Unit'].join(','),
        ...filteredCommodities.map(c => [
          `"${c.name}"`,
          c.currentPrice,
          c.change.toFixed(2),
          (c.volatility || 0).toFixed(1),
          `"${c.category}"`,
          `"${c.unit || 'kg'}"`
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `komoditas-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccessMessage('File CSV berhasil didownload!')
      setTimeout(() => setSuccessMessage(''), 5000)
      
    } catch (error) {
      console.error('Error downloading CSV:', error)
      alert('Gagal download CSV. Silakan coba lagi.')
    } finally {
      setIsDownloadingCSV(false)
    }
  }

  const handleDownloadExcel = async () => {
    if (!commoditiesData.length) return
    
    setIsDownloadingExcel(true)
    setSuccessMessage('')
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const filteredCommodities = commoditiesData.filter(c => 
        selectedCommodities.includes(c.id)
      )
      
      // Generate Excel-compatible CSV with enhanced formatting
      console.log('Generating Excel-compatible file...')
        
        // Enhanced CSV fallback with Excel-like structure
        const csvContent = [
          '# KOMODITAS WATCH - DATA EXPORT',
          '# Generated: ' + new Date().toLocaleString('id-ID'),
          '# Period: ' + selectedPeriod,
          '',
          '## RINGKASAN EKSEKUTIF',
          'Total Komoditas,' + filteredCommodities.length,
          'Rata-rata Harga (Rp),' + Math.round(filteredCommodities.reduce((sum, c) => sum + c.currentPrice, 0) / filteredCommodities.length),
          'Komoditas Naik,' + filteredCommodities.filter(c => c.change > 0).length,
          'Komoditas Turun,' + filteredCommodities.filter(c => c.change < 0).length,
          '',
          '## DATA KOMODITAS',
          'Nama Komoditas,Harga Saat Ini (Rp),Perubahan (%),Volatilitas (%),Kategori,Unit,Status',
          ...filteredCommodities.map(c => [
            `"${c.name}"`,
            c.currentPrice,
            c.change.toFixed(2),
            (c.volatility || 0).toFixed(1),
            `"${c.category}"`,
            `"${c.unit || 'kg'}"`,
            c.change > 0 ? 'Naik' : c.change < 0 ? 'Turun' : 'Stabil'
          ].join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `komoditas-data-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
      setSuccessMessage('File Excel (format CSV) berhasil didownload!')
      setTimeout(() => setSuccessMessage(''), 5000)
      
    } catch (error) {
      console.error('Error generating Excel file:', error)
      alert('Gagal generate Excel. Fallback ke CSV.')
      // Fallback to CSV if Excel generation fails
      await handleDownloadCSV()
    } finally {
      setIsDownloadingExcel(false)
    }
  }

  const reportTemplates = [
    {
      id: 'summary',
      title: 'Laporan Ringkasan Eksekutif',
      description: 'Overview komprehensif untuk manajemen tingkat atas',
      icon: FileText,
      category: 'Executive',
      frequency: 'Mingguan/Bulanan',
      lastGenerated: '2025-06-07 07:00'
    },
    {
      id: 'price-analysis',
      title: 'Analisis Harga & Volatilitas',
      description: 'Laporan mendalam tentang pergerakan harga komoditas',
      icon: TrendingUp,
      category: 'Market Analysis',
      frequency: 'Harian',
      lastGenerated: '2025-06-07 06:30'
    },
    {
      id: 'regional',
      title: 'Laporan Distribusi Regional',
      description: 'Analisis per wilayah dan supply chain',
      icon: BarChart3,
      category: 'Regional',
      frequency: 'Mingguan',
      lastGenerated: '2025-06-06 18:00'
    },
    {
      id: 'prediction',
      title: 'Laporan Prediksi & Forecast',
      description: 'Proyeksi harga dan rekomendasi strategis',
      icon: PieChart,
      category: 'Predictive',
      frequency: 'Bulanan',
      lastGenerated: '2025-06-05 15:30'
    }
  ]

  const recentReports = [
    {
      id: 1,
      title: 'Laporan Bulanan Mei 2025',
      type: 'Executive Summary',
      status: 'completed',
      generatedAt: '2025-06-01 09:00',
      downloadUrl: '#',
      size: '2.4 MB'
    },
    {
      id: 2,
      title: 'Analisis Volatilitas Cabai Q2 2025',
      type: 'Market Analysis',
      status: 'completed',
      generatedAt: '2025-05-28 14:30',
      downloadUrl: '#',
      size: '1.8 MB'
    },
    {
      id: 3,
      title: 'Distribusi Regional Jawa-Bali',
      type: 'Regional Report',
      status: 'processing',
      generatedAt: '2025-06-07 07:15',
      downloadUrl: '#',
      size: 'Processing...'
    }
  ]

  // Sample data for charts
  const monthlyTrendData = [
    { month: 'Jan', totalValue: 450000, transactions: 2340, volatility: 12.5 },
    { month: 'Feb', totalValue: 480000, transactions: 2580, volatility: 15.2 },
    { month: 'Mar', totalValue: 520000, transactions: 2820, volatility: 18.7 },
    { month: 'Apr', totalValue: 495000, transactions: 2650, volatility: 14.3 },
    { month: 'May', totalValue: 535000, transactions: 2950, volatility: 16.8 },
    { month: 'Jun', totalValue: 560000, transactions: 3100, volatility: 13.2 }
  ]

  const commodityPerformanceData = [
    { commodity: 'Cabai', growth: 15.2, volume: 2400, stability: 75 },
    { commodity: 'Beras', growth: 2.8, volume: 4200, stability: 92 },
    { commodity: 'Tomat', growth: -7.5, volume: 1800, stability: 68 },
    { commodity: 'Bawang', growth: 9.3, volume: 1600, stability: 71 },
    { commodity: 'Jagung', growth: 3.1, volume: 3200, stability: 88 },
    { commodity: 'Kedelai', growth: -2.4, volume: 2100, stability: 85 },
    { commodity: 'Gula', growth: 1.7, volume: 2800, stability: 94 },
    { commodity: 'Kopi', growth: 4.2, volume: 1400, stability: 79 }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'processing': return 'bg-blue-500'
      case 'scheduled': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Selesai'
      case 'processing': return 'Proses'
      case 'scheduled': return 'Terjadwal'
      case 'failed': return 'Gagal'
      default: return status
    }
  }



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Laporan & Analisis</h1>
            <p className="text-xl text-indigo-100">
              Generate Insights dan Business Intelligence dari Data Komoditas
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Multi-Format Export</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Advanced Analytics</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Automated Scheduling</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20">📊</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-600" />
              Filter Periode & Jenis Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Periode</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="quarterly">Kuartalan</SelectItem>
                      <SelectItem value="yearly">Tahunan</SelectItem>
                      <SelectItem value="custom">Kustom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Jenis Laporan</label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jenis Laporan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Laporan Ringkasan</SelectItem>
                      <SelectItem value="price-analysis">Analisis Harga</SelectItem>
                      <SelectItem value="regional">Distribusi Regional</SelectItem>
                      <SelectItem value="prediction">Prediksi & Forecast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPeriod === 'custom' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Rentang Tanggal Kustom</label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder="Pilih rentang tanggal"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-600" />
              Filter Lanjutan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Komoditas Terpilih ({selectedCommodities.length})</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {commodityOptions.map(commodity => (
                    <div key={commodity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={commodity.id}
                        checked={selectedCommodities.includes(commodity.id)}
                        onCheckedChange={() => handleCommodityToggle(commodity.id)}
                      />
                      <label htmlFor={commodity.id} className="text-xs">{commodity.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Provinsi Terpilih ({selectedProvinces.length})</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {provinceOptions.map(province => (
                    <div key={province.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={province.id}
                        checked={selectedProvinces.includes(province.id)}
                        onCheckedChange={() => handleProvinceToggle(province.id)}
                      />
                      <label htmlFor={province.id} className="text-xs">{province.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Button 
            className="flex items-center bg-green-600 hover:bg-green-700"
            onClick={handleGenerateReport}
            disabled={isGenerating || isDownloadingCSV || isDownloadingExcel}
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating PDF...' : 'Generate Laporan PDF'}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handlePreview}
            disabled={isGenerating || isDownloadingCSV || isDownloadingExcel}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleDownloadCSV}
            disabled={isGenerating || isDownloadingCSV || isDownloadingExcel}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloadingCSV ? 'Downloading...' : 'Download CSV'}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleDownloadExcel}
            disabled={isGenerating || isDownloadingCSV || isDownloadingExcel}
          >
            <File className="w-4 h-4 mr-2" />
            {isDownloadingExcel ? 'Generating...' : 'Download Excel'}
          </Button>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
              <span className="text-green-700 font-medium">{successMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTemplates.map((template) => {
          const Icon = template.icon
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Icon className="w-5 h-5 mr-2 text-indigo-600" />
                    {template.title}
                  </span>
                  <Badge variant="secondary">{template.category}</Badge>
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frekuensi:</span>
                    <span className="font-medium">{template.frequency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Terakhir dibuat:</span>
                    <span className="font-medium">{template.lastGenerated}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={handleGenerateReport}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handlePreview}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Analytics Dashboard */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Trend Nilai Transaksi Bulanan
                </CardTitle>
                <CardDescription>
                  Total nilai dan volume transaksi komoditas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: string) => [
                      name === 'totalValue' ? `Rp ${Number(value).toLocaleString('id-ID')}` : value,
                      name === 'totalValue' ? 'Total Nilai' : name === 'transactions' ? 'Transaksi' : 'Volatilitas (%)'
                    ]} />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke="#3B82F6"
                      fill="#93C5FD"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                  Volatilitas Harga
                </CardTitle>
                <CardDescription>
                  Tingkat volatilitas bulanan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Volatilitas']} />
                    <Bar dataKey="volatility" fill="#10B981" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-600" />
                Performance Komoditas
              </CardTitle>
              <CardDescription>
                Growth rate dan stabilitas harga per komoditas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commodityPerformanceData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="font-semibold text-gray-900">{item.commodity}</div>
                      <Badge variant={item.growth > 0 ? 'destructive' : 'secondary'}>
                        {item.growth > 0 ? '+' : ''}{item.growth}%
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div>
                        <span className="text-gray-500">Volume:</span>
                        <span className="font-medium ml-1">{item.volume} ton</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stabilitas:</span>
                        <span className="font-medium ml-1">{item.stability}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">📈 Key Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-800">Cabai menunjukkan volatilitas tinggi</div>
                    <div className="text-sm text-green-600">Kenaikan 15.2% dalam sebulan terakhir</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-800">Beras stabil dan prediktabel</div>
                    <div className="text-sm text-blue-600">Tingkat stabilitas 92% dengan growth minimal</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-800">Tomat mengalami koreksi harga</div>
                    <div className="text-sm text-orange-600">Penurunan 7.5% menuju level normal</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-700">🎯 Rekomendasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-800">Monitor ketat supply cabai</div>
                    <div className="text-sm text-purple-600">Antisipasi lonjakan lebih lanjut</div>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="font-semibold text-indigo-800">Optimasi distribusi beras</div>
                    <div className="text-sm text-indigo-600">Manfaatkan stabilitas untuk efisiensi</div>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <div className="font-semibold text-teal-800">Timing optimal untuk procurement</div>
                    <div className="text-sm text-teal-600">Tomat dan kedelai pada harga menarik</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-600" />
              Laporan Terbaru
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Riwayat laporan yang telah dibuat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(report.status)}`}></div>
                  <div>
                    <div className="font-semibold text-gray-900">{report.title}</div>
                    <div className="text-sm text-gray-600">{report.type} • {report.size}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                      {getStatusLabel(report.status)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">{report.generatedAt}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={report.status !== 'completed'}
                      onClick={handleDownloadCSV}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Download laporan dalam berbagai format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <File className="w-8 h-8 mb-2 text-red-600" />
              <span>PDF Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="w-8 h-8 mb-2 text-green-600" />
              <span>Excel Spreadsheet</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="w-8 h-8 mb-2 text-blue-600" />
              <span>CSV Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Laporan</DialogTitle>
            <DialogDescription>
              Preview laporan sebelum generate dan download
            </DialogDescription>
          </DialogHeader>
          
          {reportData && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold">{reportData.title}</h3>
                <p className="text-sm text-gray-600">
                  Generated: {new Date(reportData.generatedAt).toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-600">
                  Period: {reportData.period} | Commodities: {reportData.commoditiesCount} | Provinces: {reportData.provincesCount}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-600">Rata-rata Harga</p>
                  <p className="text-lg font-bold">Rp {Math.round(reportData.summary.avgPrice).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Komoditas Naik</p>
                  <p className="text-lg font-bold">{reportData.summary.positiveChanges}</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm text-red-600">Komoditas Turun</p>
                  <p className="text-lg font-bold">{reportData.summary.negativeChanges}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm text-yellow-600">Total Volatilitas</p>
                  <p className="text-lg font-bold">{reportData.summary.totalVolatility.toFixed(1)}%</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Detail Komoditas</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 border-b">Nama</th>
                        <th className="text-left p-2 border-b">Harga</th>
                        <th className="text-left p-2 border-b">Perubahan</th>
                        <th className="text-left p-2 border-b">Volatilitas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.commodities.map((c: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{c.name}</td>
                          <td className="p-2">Rp {c.currentPrice.toLocaleString('id-ID')}</td>
                          <td className={`p-2 ${c.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {c.change > 0 ? '+' : ''}{c.change.toFixed(2)}%
                          </td>
                          <td className="p-2">{(c.volatility || 0).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => { handleGenerateReport(); setShowPreview(false); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate PDF
                </Button>
                <Button variant="outline" onClick={() => { handleDownloadCSV(); setShowPreview(false); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Reports
