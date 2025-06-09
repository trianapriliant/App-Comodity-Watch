import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Filter, 
  Search, 
  X,
  RotateCcw,
  Calendar as CalendarIcon,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Eye,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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

interface FilterPanelProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  commodities?: Array<{ category: string; name: string; currentPrice: number; change: number }>
  provinces?: string[]
  className?: string
}

const DEFAULT_FILTERS: FilterOptions = {
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
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  commodities = [],
  provinces = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters)

  const categories = ['Sayuran', 'Biji-bijian', 'Kebutuhan Pokok', 'Perkebunan']
  const defaultProvinces = [
    'Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Sumatera Utara',
    'Sumatera Barat', 'Bali', 'Kalimantan Timur', 'Sulawesi Selatan'
  ]
  const provinceList = provinces.length > 0 ? provinces : defaultProvinces

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.searchTerm) count++
    if (filters.categories.length > 0) count++
    if (filters.provinces.length > 0) count++
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) count++
    if (filters.changeRange[0] > -50 || filters.changeRange[1] < 50) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.volatilityRange[0] > 0 || filters.volatilityRange[1] < 100) count++
    if (filters.showOnlyAlerts) count++
    if (filters.showOnlyFavorites) count++
    return count
  }

  const handleTempFilterChange = (key: keyof FilterOptions, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
    setIsOpen(false)
  }

  const resetFilters = () => {
    const resetFilters = { ...DEFAULT_FILTERS }
    setTempFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  const handleCategoryToggle = (category: string) => {
    const newCategories = tempFilters.categories.includes(category)
      ? tempFilters.categories.filter(c => c !== category)
      : [...tempFilters.categories, category]
    handleTempFilterChange('categories', newCategories)
  }

  const handleProvinceToggle = (province: string) => {
    const newProvinces = tempFilters.provinces.includes(province)
      ? tempFilters.provinces.filter(p => p !== province)
      : [...tempFilters.provinces, province]
    handleTempFilterChange('provinces', newProvinces)
  }

  const formatPriceRange = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`border-gray-200 hover:bg-gray-50 relative ${className}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
          {getActiveFiltersCount() > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-blue-500 text-white text-xs"
            >
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filter & Pencarian Lanjutan
              <Badge variant="outline" className="font-mono">
                {getActiveFiltersCount()} aktif
              </Badge>
            </span>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </DialogTitle>
          <DialogDescription>
            Gunakan filter untuk menyaring data komoditas sesuai kebutuhan analisis
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="w-4 h-4" />
                Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Cari berdasarkan nama komoditas..."
                value={tempFilters.searchTerm}
                onChange={(e) => handleTempFilterChange('searchTerm', e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Kategori Komoditas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={tempFilters.categories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label 
                      htmlFor={`category-${category}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provinces */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Provinsi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                {provinceList.map(province => (
                  <div key={province} className="flex items-center space-x-2">
                    <Checkbox
                      id={`province-${province}`}
                      checked={tempFilters.provinces.includes(province)}
                      onCheckedChange={() => handleProvinceToggle(province)}
                    />
                    <Label 
                      htmlFor={`province-${province}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {province}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Rentang Harga (Rp)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Slider
                  value={tempFilters.priceRange}
                  onValueChange={(value) => handleTempFilterChange('priceRange', value as [number, number])}
                  max={100000}
                  min={0}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Rp {formatPriceRange(tempFilters.priceRange[0])}</span>
                  <span>Rp {formatPriceRange(tempFilters.priceRange[1])}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Perubahan Harga (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Slider
                  value={tempFilters.changeRange}
                  onValueChange={(value) => handleTempFilterChange('changeRange', value as [number, number])}
                  max={50}
                  min={-50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{tempFilters.changeRange[0]}%</span>
                  <span>{tempFilters.changeRange[1]}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Rentang Tanggal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Dari Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.from ? (
                          format(tempFilters.dateRange.from, "PPP", { locale: id })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.from}
                        onSelect={(date) => 
                          handleTempFilterChange('dateRange', { 
                            ...tempFilters.dateRange, 
                            from: date 
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Sampai Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.to ? (
                          format(tempFilters.dateRange.to, "PPP", { locale: id })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.to}
                        onSelect={(date) => 
                          handleTempFilterChange('dateRange', { 
                            ...tempFilters.dateRange, 
                            to: date 
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sorting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Pengurutan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Urutkan Berdasarkan</Label>
                  <Select 
                    value={tempFilters.sortBy} 
                    onValueChange={(value) => handleTempFilterChange('sortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nama</SelectItem>
                      <SelectItem value="price">Harga</SelectItem>
                      <SelectItem value="change">Perubahan</SelectItem>
                      <SelectItem value="category">Kategori</SelectItem>
                      <SelectItem value="volatility">Volatilitas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">Urutan</Label>
                  <Select 
                    value={tempFilters.sortOrder} 
                    onValueChange={(value) => handleTempFilterChange('sortOrder', value as 'asc' | 'desc')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Naik (A-Z, 0-9)</SelectItem>
                      <SelectItem value="desc">Turun (Z-A, 9-0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Filter Cepat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOnlyAlerts"
                    checked={tempFilters.showOnlyAlerts}
                    onCheckedChange={(checked) => 
                      handleTempFilterChange('showOnlyAlerts', checked)
                    }
                  />
                  <Label htmlFor="showOnlyAlerts" className="text-sm font-medium cursor-pointer">
                    Hanya tampilkan komoditas dengan alert
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOnlyFavorites"
                    checked={tempFilters.showOnlyFavorites}
                    onCheckedChange={(checked) => 
                      handleTempFilterChange('showOnlyFavorites', checked)
                    }
                  />
                  <Label htmlFor="showOnlyFavorites" className="text-sm font-medium cursor-pointer">
                    Hanya tampilkan favorit
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t pt-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
              Terapkan Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FilterPanel
