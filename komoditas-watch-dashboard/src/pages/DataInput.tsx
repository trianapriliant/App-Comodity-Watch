import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Database,
  Upload,
  CheckCircle,
  AlertCircle,
  Users,
  Truck,
  Wheat,
  FileText,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react'

const DataInput: React.FC = () => {
  const [userRole, setUserRole] = useState('petani')
  const [formData, setFormData] = useState({
    commodity: '',
    province: '',
    location: '',
    price: '',
    quantity: '',
    quality: '',
    date: '',
    notes: ''
  })
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      user: 'Petani Ahmad - Jawa Barat',
      commodity: 'Cabai Merah',
      price: 'Rp 43.000',
      quantity: '500 kg',
      status: 'approved',
      timestamp: '2025-06-07 06:30'
    },
    {
      id: 2,
      user: 'Distributor Maju - DKI Jakarta',
      commodity: 'Beras Premium',
      price: 'Rp 14.800',
      quantity: '2 ton',
      status: 'pending',
      timestamp: '2025-06-07 05:15'
    },
    {
      id: 3,
      user: 'Pedagang Sari - Jawa Tengah',
      commodity: 'Tomat',
      price: 'Rp 8.400',
      quantity: '200 kg',
      status: 'reviewed',
      timestamp: '2025-06-07 04:45'
    }
  ])

  const roleOptions = [
    { value: 'petani', label: 'Petani', icon: Wheat, description: 'Produsen komoditas pertanian' },
    { value: 'distributor', label: 'Distributor', icon: Truck, description: 'Penyalur dan logistik' },
    { value: 'pedagang', label: 'Pedagang', icon: Users, description: 'Retailer dan pasar tradisional' },
    { value: 'regulator', label: 'Regulator', icon: FileText, description: 'Instansi pemerintah' }
  ]

  const commodityOptions = [
    'Cabai Merah', 'Tomat', 'Beras Premium', 'Bawang Merah', 
    'Jagung Pipilan', 'Kedelai Lokal', 'Gula Pasir', 'Kopi Biji'
  ]

  const provinceOptions = [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten',
    'Sumatera Utara', 'Sumatera Barat', 'Sumatera Selatan', 'Lampung',
    'Kalimantan Barat', 'Kalimantan Timur', 'Sulawesi Selatan', 'Bali'
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    const newSubmission = {
      id: submissions.length + 1,
      user: `${getRoleLabel(userRole)} - ${formData.province}`,
      commodity: formData.commodity,
      price: `Rp ${Number(formData.price).toLocaleString('id-ID')}`,
      quantity: `${formData.quantity} kg`,
      status: 'pending' as const,
      timestamp: new Date().toLocaleString('id-ID')
    }
    setSubmissions(prev => [newSubmission, ...prev])
    setFormData({
      commodity: '',
      province: '',
      location: '',
      price: '',
      quantity: '',
      quality: '',
      date: '',
      notes: ''
    })
  }

  const getRoleLabel = (role: string) => {
    return roleOptions.find(r => r.value === role)?.label || role
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'reviewed': return 'bg-blue-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui'
      case 'pending': return 'Menunggu'
      case 'reviewed': return 'Direview'
      case 'rejected': return 'Ditolak'
      default: return status
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Input Data Stakeholder</h1>
            <p className="text-xl text-purple-100">
              Portal Kontribusi Data Real-time dari Seluruh Rantai Pasok
            </p>
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Multi-Role Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Real-time Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Automated Verification</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-8xl opacity-20">📊</div>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            Pilih Peran Anda
          </CardTitle>
          <CardDescription>
            Setiap peran memiliki form input yang disesuaikan dengan kebutuhan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleOptions.map((role) => {
              const Icon = role.icon
              return (
                <div
                  key={role.value}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    userRole === role.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setUserRole(role.value)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className={`w-6 h-6 ${userRole === role.value ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="font-semibold">{role.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-indigo-600" />
                Form Input Data - {getRoleLabel(userRole)}
              </CardTitle>
              <CardDescription>
                Masukkan data komoditas sesuai dengan peran Anda sebagai {getRoleLabel(userRole).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commodity" className="flex items-center">
                      <Wheat className="w-4 h-4 mr-2" />
                      Komoditas *
                    </Label>
                    <Select 
                      value={formData.commodity} 
                      onValueChange={(value) => handleInputChange('commodity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih komoditas" />
                      </SelectTrigger>
                      <SelectContent>
                        {commodityOptions.map(commodity => (
                          <SelectItem key={commodity} value={commodity}>
                            {commodity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province" className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Provinsi *
                    </Label>
                    <Select 
                      value={formData.province} 
                      onValueChange={(value) => handleInputChange('province', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih provinsi" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinceOptions.map(province => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Lokasi Spesifik (Kota/Kabupaten/Pasar)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Contoh: Pasar Induk Caringin, Bandung"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Harga per Kg (Rp) *
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="Contoh: 42500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Kuantitas (Kg) *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      placeholder="Contoh: 500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quality">Kualitas</Label>
                    <Select 
                      value={formData.quality} 
                      onValueChange={(value) => handleInputChange('quality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kualitas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="super">Super</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="reguler">Reguler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Tanggal Transaksi/Observasi *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan Tambahan</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Kondisi pasar, cuaca, atau informasi relevan lainnya..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Data
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFormData({
                    commodity: '',
                    province: '',
                    location: '',
                    price: '',
                    quantity: '',
                    quality: '',
                    date: '',
                    notes: ''
                  })}>
                    Reset Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Guidelines and Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <CheckCircle className="w-5 h-5 mr-2" />
                Panduan Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">✅ Data yang Valid:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Harga aktual transaksi terbaru</li>
                  <li>• Lokasi spesifik dan akurat</li>
                  <li>• Kuantitas sesuai unit standar</li>
                  <li>• Waktu pencatatan maksimal H-1</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">❌ Hindari:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Data estimasi atau perkiraan</li>
                  <li>• Informasi yang sudah lama</li>
                  <li>• Lokasi yang tidak spesifik</li>
                  <li>• Harga yang tidak wajar</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <AlertCircle className="w-5 h-5 mr-2" />
                Status Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <div className="font-semibold text-sm">Menunggu</div>
                    <div className="text-xs text-gray-500">Data sedang antrian review</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="font-semibold text-sm">Direview</div>
                    <div className="text-xs text-gray-500">Sedang diverifikasi tim</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-semibold text-sm">Disetujui</div>
                    <div className="text-xs text-gray-500">Data telah diintegrasikan</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">Statistik Kontribusi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Data hari ini:</span>
                  <span className="font-semibold">247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Disetujui:</span>
                  <span className="font-semibold text-green-600">198</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Menunggu:</span>
                  <span className="font-semibold text-yellow-600">35</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Akurasi rata-rata:</span>
                  <span className="font-semibold text-blue-600">94.2%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Submission Terbaru
            </span>
            <Button size="sm" variant="outline">
              Lihat Semua
            </Button>
          </CardTitle>
          <CardDescription>
            Data terbaru yang disubmit oleh stakeholder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(submission.status)}`}></div>
                  <div>
                    <div className="font-semibold text-gray-900">{submission.user}</div>
                    <div className="text-sm text-gray-600">
                      {submission.commodity} • {submission.price} • {submission.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={submission.status === 'approved' ? 'default' : 'secondary'}>
                    {getStatusLabel(submission.status)}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">{submission.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DataInput
