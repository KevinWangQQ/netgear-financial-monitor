'use client'

import { Card, Statistic, Tooltip } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, QuestionCircleOutlined } from '@ant-design/icons'
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
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />
      case 'down':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <MinusOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  const getTrendIconByChange = () => {
    if (changeType === 'increase') {
      return <ArrowUpOutlined style={{ color: '#52c41a' }} />
    } else if (changeType === 'decrease') {
      return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
    }
    return <MinusOutlined style={{ color: '#d9d9d9' }} />
  }

  const getStatisticValueStyle = () => {
    if (changeType === 'increase') {
      return { color: '#52c41a' }
    } else if (changeType === 'decrease') {
      return { color: '#ff4d4f' }
    }
    return { color: '#262626' }
  }

  return (
    <Card
      size="small"
      className="hover:shadow-md transition-shadow"
      style={{ height: '100%' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          {metricId && (
            <Tooltip title="点击查看指标说明">
              <QuestionCircleOutlined className="text-gray-400 hover:text-gray-600" />
            </Tooltip>
          )}
        </div>
        {change !== undefined ? getTrendIconByChange() : getTrendIcon()}
      </div>
      
      <Statistic
        value={formatValue(value)}
        suffix={unit}
        valueStyle={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          ...getStatisticValueStyle()
        }}
      />
      
      {change !== undefined && (
        <div className="mt-2">
          <Statistic
            value={Math.abs(change)}
            precision={1}
            prefix={change >= 0 ? '+' : '-'}
            suffix="%"
            valueStyle={{ 
              fontSize: '14px',
              color: change >= 0 ? '#52c41a' : '#ff4d4f'
            }}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3">
        {description && (
          <p className="text-xs text-gray-500 flex-1">{description}</p>
        )}
        {period && (
          <span className="text-xs text-gray-400 ml-2">{period}</span>
        )}
      </div>
    </Card>
  )
}