import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  TrendingUp, 
  Map, 
  Database, 
  FileText, 
  Menu,
  X,
  Bell,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/components/ThemeProvider'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: BarChart3, description: 'Monitoring Real-time' },
    { name: 'Prediksi & Anomali', href: '/predictions', icon: TrendingUp, description: 'Forecasting & Alerts' },
    { name: 'Distribusi', href: '/distribution', icon: Map, description: 'Pemetaan Geografis' },
    { name: 'Input Data', href: '/input', icon: Database, description: 'Entry Data Stakeholder' },
    { name: 'Laporan', href: '/reports', icon: FileText, description: 'Analisis & Laporan' },
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />
      case 'dark': return <Moon className="w-4 h-4" />
      case 'bloomberg': return <Monitor className="w-4 h-4" />
      default: return <Sun className="w-4 h-4" />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Header Logo */}
        <div className="flex items-center justify-between px-6 py-6 bg-gradient-to-r from-emerald-600 to-blue-600">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🌾</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">Komoditas Watch</h1>
              <p className="text-sm text-emerald-100">Indonesia</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/20 p-2 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-6 h-6 mr-4 ${isActive(item.href) ? 'text-white' : 'text-gray-400'}`} />
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className={`text-sm ${isActive(item.href) ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Alert Summary */}
        <div className="mx-4 mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Alert Aktif</h3>
            <Badge variant="destructive" className="bg-orange-500">6</Badge>
          </div>
          <p className="text-sm text-gray-600">2 high, 2 medium, 2 low priority</p>
          <Button size="sm" className="w-full mt-3 bg-orange-500 hover:bg-orange-600">
            Lihat Semua
          </Button>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-700">Admin Dashboard</p>
                <p className="text-sm text-gray-500">📡 Monitoring Panel</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button 
                size="sm" 
                variant="ghost" 
                className="p-2"
                onClick={toggleTheme}
                title={`Current theme: ${theme}`}
              >
                {getThemeIcon()}
              </Button>
              <Button size="sm" variant="ghost" className="p-2">
                <Settings size={16} />
              </Button>
              <Button size="sm" variant="ghost" className="p-2">
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            <div className="ml-4 lg:ml-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {navigationItems.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">
                Terakhir diupdate: {new Date().toLocaleString('id-ID', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell size={20} />
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1">
                3
              </Badge>
            </Button>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">System Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout
