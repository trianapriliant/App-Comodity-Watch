import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'bloomberg'

interface ThemeProviderContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('komoditas-theme') as Theme
    if (savedTheme && ['light', 'dark', 'bloomberg'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Save theme to localStorage and apply to document
    localStorage.setItem('komoditas-theme', theme)
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'bloomberg')
    
    // Add current theme class
    document.documentElement.classList.add(theme)
    
    // Apply theme-specific body styles
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0D1117'
      document.body.style.color = '#F0F6FC'
    } else if (theme === 'bloomberg') {
      document.body.style.backgroundColor = '#161B22'
      document.body.style.color = '#F0F6FC'
    } else {
      document.body.style.backgroundColor = '#FFFFFF'
      document.body.style.color = '#111827'
    }
  }, [theme])

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'bloomberg']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const value = {
    theme,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

// Theme-aware component wrapper
export const withTheme = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const { theme } = useTheme()
    return <Component {...props} data-theme={theme} />
  }
}

// Theme configuration object
export const themeConfig = {
  light: {
    background: 'bg-gray-50',
    surface: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    accent: 'bg-blue-600',
  },
  dark: {
    background: 'bg-gray-900',
    surface: 'bg-gray-800',
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    accent: 'bg-blue-500',
  },
  bloomberg: {
    background: 'bg-bloomberg-dark',
    surface: 'bg-bloomberg-darkSecondary',
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    border: 'border-bloomberg-darkAccent',
    accent: 'bg-bloomberg-orange',
  },
}

// Helper hook to get theme-aware classes
export const useThemeClasses = () => {
  const { theme } = useTheme()
  return themeConfig[theme]
}
