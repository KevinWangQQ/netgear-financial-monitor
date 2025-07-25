'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}

export function KPICard({ 
  title, 
  value, 
  change, 
  unit = '', 
  trend = 'neutral',
  description 
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1e9) {
        return `${(val / 1e9).toFixed(1)}B`
      } else if (val >= 1e6) {
        return `${(val / 1e6).toFixed(1)}M`
      } else if (val >= 1e3) {
        return `${(val / 1e3).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500'
      case 'down':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {getTrendIcon()}
      </div>
      
      <div className="flex items-end space-x-2 mb-1">
        <span className="text-2xl font-bold text-gray-900">
          {formatValue(value)}{unit}
        </span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}