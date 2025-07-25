'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { MetricTooltip, HelpIcon } from './MetricTooltip'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  description?: string
  period?: string
  metricId?: string
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  unit = '', 
  trend = 'neutral',
  description,
  period,
  metricId
}: KPICardProps) {
  // 格式化数值显示
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1e9) {
        return `${(val / 1e9).toFixed(1)}B`
      } else if (val >= 1e6) {
        return `${(val / 1e6).toFixed(1)}M`
      } else if (val >= 1e3) {
        return `${(val / 1e3).toFixed(1)}K`
      }
      // 使用自定义格式化避免本地化差异
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
    if (changeType === 'increase') {
      return 'text-green-500'
    } else if (changeType === 'decrease') {
      return 'text-red-500'
    }
    return 'text-gray-400'
  }

  const getTrendIconByChange = () => {
    if (changeType === 'increase') {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (changeType === 'decrease') {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {metricId && <HelpIcon metricId={metricId} />}
        </div>
        {change !== undefined ? getTrendIconByChange() : getTrendIcon()}
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
      
      <div className="flex items-center justify-between">
        {description && (
          <p className="text-xs text-gray-500 flex-1">{description}</p>
        )}
        {period && (
          <span className="text-xs text-gray-400 ml-2">{period}</span>
        )}
      </div>
    </div>
  )
}