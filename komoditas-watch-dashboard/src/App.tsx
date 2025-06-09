import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/ThemeProvider'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import EnhancedDashboard from '@/pages/EnhancedDashboard'
import Predictions from '@/pages/Predictions'
import Distribution from '@/pages/Distribution'
import DataInput from '@/pages/DataInput'
import Reports from '@/pages/Reports'

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
          <Layout>
            <Routes>
              <Route path="/" element={<EnhancedDashboard />} />
              <Route path="/dashboard" element={<EnhancedDashboard />} />
              <Route path="/dashboard-legacy" element={<Dashboard />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/input" element={<DataInput />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </Layout>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
