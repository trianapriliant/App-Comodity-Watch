import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTheme } from './ThemeProvider'
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  Check,
  Laptop,
  Sunset,
  Star
} from 'lucide-react'

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themes = [
    {
      id: 'light',
      name: 'Light Mode',
      description: 'Mode terang untuk penggunaan sehari-hari',
      icon: Sun,
      preview: 'bg-white border-gray-200',
      accent: 'bg-blue-500'
    },
    {
      id: 'dark',
      name: 'Dark Mode', 
      description: 'Mode gelap untuk penggunaan malam hari',
      icon: Moon,
      preview: 'bg-gray-900 border-gray-700',
      accent: 'bg-blue-400'
    },
    {
      id: 'bloomberg',
      name: 'Bloomberg Mode',
      description: 'Mode professional untuk trading dan analisis',
      icon: Star,
      preview: 'bg-gray-950 border-orange-400',
      accent: 'bg-orange-500'
    }
  ] as const

  const getCurrentTheme = () => {
    return themes.find(t => t.id === theme) || themes[0]
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as 'light' | 'dark' | 'bloomberg')
    setIsOpen(false)
    
    // Add smooth transition effect
    document.documentElement.style.transition = 'all 0.3s ease-in-out'
    setTimeout(() => {
      document.documentElement.style.transition = ''
    }, 300)
  }

  const currentTheme = getCurrentTheme()
  const CurrentIcon = currentTheme.icon

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <CurrentIcon className="w-4 h-4 mr-2" />
          Theme
          <Badge 
            variant="outline" 
            className="ml-2 text-xs capitalize"
          >
            {theme}
          </Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            Pilih Theme
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Sesuaikan tampilan dashboard dengan preferensi Anda
          </p>
        </div>

        <div className="p-2 space-y-1">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon
            const isActive = theme === themeOption.id
            
            return (
              <button
                key={themeOption.id}
                onClick={() => handleThemeChange(themeOption.id)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Theme Preview */}
                  <div className={`w-12 h-8 rounded border-2 ${themeOption.preview} flex-shrink-0 relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-3 h-2 ${themeOption.accent}`} />
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-400 opacity-50" />
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{themeOption.name}</span>
                      </div>
                      {isActive && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {themeOption.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Theme Features */}
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <Monitor className="w-3 h-3" />
              <span>Mendukung sistem theme otomatis</span>
            </div>
            <div className="flex items-center gap-2">
              <Laptop className="w-3 h-3" />
              <span>Tersimpan di perangkat lokal</span>
            </div>
            <div className="flex items-center gap-2">
              <Sunset className="w-3 h-3" />
              <span>Optimized untuk berbagai kondisi cahaya</span>
            </div>
          </div>
        </div>

        {/* Quick Theme Shortcuts */}
        <div className="p-3 border-t">
          <div className="text-xs text-gray-500 mb-2">Shortcut:</div>
          <div className="flex gap-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon
              const isActive = theme === themeOption.id
              
              return (
                <button
                  key={themeOption.id}
                  onClick={() => handleThemeChange(themeOption.id)}
                  className={`flex-1 p-2 rounded border text-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isActive 
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300' 
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Icon className="w-3 h-3 mx-auto mb-1" />
                  <div className="text-xs font-medium capitalize">{themeOption.id}</div>
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ThemeToggle
