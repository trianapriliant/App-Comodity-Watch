/**
 * Enhanced Color Coding System for Komoditas Watch Dashboard
 * Provides consistent color mapping based on data values and context
 */

export interface ColorMapping {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

export type StatusLevel = 'danger' | 'warning' | 'success' | 'info' | 'critical';

/**
 * Get color coding based on percentage change
 * @param change - Percentage change value
 * @param threshold - Custom threshold object
 * @returns StatusLevel
 */
export const getChangeStatus = (
  change: number, 
  threshold = { danger: 10, warning: 5 }
): StatusLevel => {
  const absChange = Math.abs(change);
  
  if (absChange >= threshold.danger) return 'danger';
  if (absChange >= threshold.warning) return 'warning';
  return 'success';
};

/**
 * Get color mapping for status level
 * @param status - Status level
 * @returns ColorMapping object
 */
export const getStatusColors = (status: StatusLevel): ColorMapping => {
  const colorMaps: Record<StatusLevel, ColorMapping> = {
    danger: {
      bg: 'bg-status-danger-light',
      text: 'text-status-danger-dark',
      border: 'border-status-danger',
      accent: 'bg-status-danger',
    },
    warning: {
      bg: 'bg-status-warning-light',
      text: 'text-status-warning-dark',
      border: 'border-status-warning',
      accent: 'bg-status-warning',
    },
    success: {
      bg: 'bg-status-success-light',
      text: 'text-status-success-dark',
      border: 'border-status-success',
      accent: 'bg-status-success',
    },
    info: {
      bg: 'bg-status-info-light',
      text: 'text-status-info-dark',
      border: 'border-status-info',
      accent: 'bg-status-info',
    },
    critical: {
      bg: 'bg-status-critical-light',
      text: 'text-status-critical-dark',
      border: 'border-status-critical',
      accent: 'bg-status-critical',
    },
  };

  return colorMaps[status];
};

/**
 * Get trend color for price changes
 * @param change - Price change percentage
 * @returns Trend color class
 */
export const getTrendColor = (change: number): string => {
  if (change > 0) return 'text-status-danger';
  if (change < 0) return 'text-status-success';
  return 'text-gray-500';
};

/**
 * Get chart color based on index
 * @param index - Chart series index
 * @returns Chart color
 */
export const getChartColor = (index: number): string => {
  const colors = [
    '#2563EB', // Blue
    '#059669', // Green
    '#DC2626', // Red
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EF4444', // Light Red
    '#10B981', // Emerald
    '#F97316', // Orange
  ];
  
  return colors[index % colors.length];
};

/**
 * Get gradient colors for heatmaps
 * @param value - Normalized value (0-1)
 * @param type - Type of gradient ('price', 'stock', 'volatility')
 * @returns HSL color string
 */
export const getHeatmapColor = (
  value: number, 
  type: 'price' | 'stock' | 'volatility' = 'price'
): string => {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  
  switch (type) {
    case 'price':
      // Green (low) to Red (high) for prices
      const priceHue = 120 - (clampedValue * 120); // 120 = green, 0 = red
      return `hsl(${priceHue}, 70%, 50%)`;
      
    case 'stock':
      // Red (low) to Green (high) for stock levels
      const stockHue = clampedValue * 120; // 0 = red, 120 = green
      return `hsl(${stockHue}, 70%, 50%)`;
      
    case 'volatility':
      // Blue (low) to Red (high) for volatility
      const volatilityHue = 240 - (clampedValue * 240); // 240 = blue, 0 = red
      return `hsl(${volatilityHue}, 70%, 50%)`;
      
    default:
      return `hsl(${clampedValue * 240}, 70%, 50%)`;
  }
};

/**
 * Get professional Bloomberg-style colors
 * @param variant - Color variant
 * @returns Color value
 */
export const getBloombergColor = (variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'): string => {
  const bloombergColors = {
    primary: '#0066CC',
    secondary: '#161B22',
    accent: '#FF6B35',
    success: '#00D26A',
    warning: '#FFD23F',
    danger: '#FF4757',
  };
  
  return bloombergColors[variant];
};

/**
 * Get accessibility-compliant color combinations
 * @param background - Background color preference
 * @returns Accessible color combination
 */
export const getAccessibleColors = (background: 'light' | 'dark' = 'light') => {
  if (background === 'dark') {
    return {
      primary: '#60A5FA',
      secondary: '#A3A3A3',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
    };
  }
  
  return {
    primary: '#1D4ED8',
    secondary: '#6B7280',
    success: '#047857',
    warning: '#D97706',
    danger: '#DC2626',
    text: '#111827',
    textSecondary: '#6B7280',
  };
};

/**
 * Calculate opacity based on data confidence/reliability
 * @param confidence - Confidence value (0-100)
 * @returns Opacity value (0-1)
 */
export const getDataOpacity = (confidence: number): number => {
  // Convert confidence (0-100) to opacity (0.3-1.0)
  return Math.max(0.3, Math.min(1.0, confidence / 100));
};

/**
 * Get semantic colors for commodity categories
 * @param category - Commodity category
 * @returns Category color
 */
export const getCommodityColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    'Sayuran': '#059669', // Green
    'Biji-bijian': '#F59E0B', // Yellow
    'Kebutuhan Pokok': '#2563EB', // Blue
    'Perkebunan': '#8B5F47', // Brown
    'Bumbu': '#DC2626', // Red
    'Protein': '#8B5CF6', // Purple
  };
  
  return categoryColors[category] || '#6B7280'; // Gray fallback
};
