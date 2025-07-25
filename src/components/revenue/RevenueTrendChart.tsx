'use client'

import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  BarChart3, 
  Eye, 
  EyeOff,
  Maximize2,
  Download,
  Info
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { MetricTooltip } from '@/components/MetricTooltip'

interface RevenueTrendData {
  period: string
  revenue: number
  grossProfit: number
  netIncome: number
  revenueGrowth?: number
  events?: {
    title: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }[]
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[]
  title: string
  height?: number
  showControls?: boolean
  onFullscreen?: () => void
  onExport?: () => void
}

// 数据系列配置
const DATA_SERIES = [
  { key: 'revenue', name: '营收', color: '#3b82f6', visible: true },
  { key: 'grossProfit', name: '毛利润', color: '#10b981', visible: true },
  { key: 'netIncome', name: '净利润', color: '#f59e0b', visible: true }
] as const

export function RevenueTrendChart({
  data,
  title,
  height = 400,
  showControls = true,
  onFullscreen,
  onExport
}: RevenueTrendChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(DATA_SERIES.map(s => s.key))
  )
  const [chartType, setChartType] = useState<'combo' | 'line' | 'bar'>('combo')

  // 切换数据系列显示/隐藏
  const toggleSeries = (seriesKey: string) => {
    const newVisible = new Set(visibleSeries)
    if (newVisible.has(seriesKey)) {
      newVisible.delete(seriesKey)
    } else {
      newVisible.add(seriesKey)
    }
    setVisibleSeries(newVisible)
  }

  // 准备图表配置
  const chartOption = useMemo((): EChartsOption => {
    const periods = data.map(d => d.period)
    
    // 构建数据系列
    const series: any[] = []
    
    DATA_SERIES.forEach(seriesConfig => {
      if (!visibleSeries.has(seriesConfig.key)) return
      
      const values = data.map(d => d[seriesConfig.key as keyof RevenueTrendData] as number)
      
      if (chartType === 'combo') {
        // 组合图：营收用柱状图，利润用折线图
        if (seriesConfig.key === 'revenue') {
          series.push({
            name: seriesConfig.name,
            type: 'bar',
            data: values.map(v => Math.round(v / 1e6)), // 转换为百万
            itemStyle: {
              color: seriesConfig.color,
              borderRadius: [4, 4, 0, 0]
            },
            tooltip: {
              valueFormatter: (value: number) => `$${value}M`
            }
          })
        } else {
          series.push({
            name: seriesConfig.name,
            type: 'line',
            data: values.map(v => Math.round(v / 1e6)),
            lineStyle: {
              color: seriesConfig.color,
              width: 3
            },
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: seriesConfig.color
            },
            tooltip: {
              valueFormatter: (value: number) => `$${value}M`
            }
          })
        }
      } else {
        // 统一图表类型
        series.push({
          name: seriesConfig.name,
          type: chartType,
          data: values.map(v => Math.round(v / 1e6)),
          ...(chartType === 'bar' ? {
            itemStyle: {
              color: seriesConfig.color,
              borderRadius: [4, 4, 0, 0]
            }
          } : {
            lineStyle: {
              color: seriesConfig.color,
              width: 3
            },
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: seriesConfig.color
            }
          }),
          tooltip: {
            valueFormatter: (value: number) => `$${value}M`
          }
        })
      }
    })

    // 添加转折点标记
    const turningPoints = data
      .map((item, index) => {
        if (index === 0) return null
        const prevRevenue = data[index - 1].revenue
        const currentRevenue = item.revenue
        const growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100
        
        // 识别显著变化点（增长率变化超过10%）
        if (Math.abs(growth) > 15) {
          return {
            name: '转折点',
            type: 'scatter',
            data: [{
              value: [index, Math.round(currentRevenue / 1e6)],
              symbol: 'pin',
              symbolSize: 20,
              itemStyle: {
                color: growth > 0 ? '#10b981' : '#ef4444'
              },
              label: {
                show: true,
                position: 'top',
                formatter: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`,
                fontSize: 10,
                color: growth > 0 ? '#10b981' : '#ef4444'
              }
            }],
            tooltip: {
              formatter: () => {
                const events = item.events || []
                let tooltip = `<strong>${item.period}</strong><br/>`
                tooltip += `营收变化: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%<br/>`
                if (events.length > 0) {
                  tooltip += '<br/>相关事件:<br/>'
                  events.forEach(event => {
                    tooltip += `• ${event.title}<br/>`
                  })
                }
                return tooltip
              }
            }
          }
        }
        return null
      })
      .filter(Boolean)

    if (turningPoints.length > 0) {
      series.push(...turningPoints)
    }

    return {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151'
        }
      },
      legend: {
        data: DATA_SERIES.filter(s => visibleSeries.has(s.key)).map(s => s.name),
        top: 10,
        right: 20,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: periods,
        axisPointer: {
          type: 'shadow'
        },
        axisLabel: {
          fontSize: 11,
          color: '#6b7280'
        }
      },
      yAxis: {
        type: 'value',
        name: '金额 (百万美元)',
        nameTextStyle: {
          fontSize: 11,
          color: '#6b7280'
        },
        axisLabel: {
          formatter: '${value}M',
          fontSize: 11,
          color: '#6b7280'
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
            type: 'dashed'
          }
        }
      },
      series,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }
  }, [data, visibleSeries, chartType])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* 头部控制区 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <MetricTooltip metricId="revenue">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </MetricTooltip>
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            {/* 图表类型切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { type: 'combo' as const, icon: BarChart3, label: '组合图' },
                { type: 'line' as const, icon: TrendingUp, label: '折线图' },
                { type: 'bar' as const, icon: BarChart3, label: '柱状图' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* 功能按钮 */}
            <div className="flex space-x-1">
              {onFullscreen && (
                <button
                  onClick={onFullscreen}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="全屏查看"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="导出数据"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 数据系列控制 */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">显示数据:</span>
          <div className="flex space-x-3">
            {DATA_SERIES.map(series => (
              <button
                key={series.key}
                onClick={() => toggleSeries(series.key)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  visibleSeries.has(series.key)
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {visibleSeries.has(series.key) ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span>{series.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="p-6">
        {visibleSeries.size > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ height: `${height}px` }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <EyeOff className="w-8 h-8 mx-auto mb-2" />
              <p>请选择要显示的数据系列</p>
            </div>
          </div>
        )}
      </div>

      {/* 数据摘要 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {DATA_SERIES.filter(s => visibleSeries.has(s.key)).map(series => {
            const latestValue = data[data.length - 1]?.[series.key as keyof RevenueTrendData] as number
            const previousValue = data[data.length - 2]?.[series.key as keyof RevenueTrendData] as number
            const growth = previousValue ? ((latestValue - previousValue) / previousValue * 100) : 0
            
            return (
              <div key={series.key} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="font-medium text-gray-700">{series.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${(latestValue / 1e6).toFixed(1)}M
                  </div>
                  <div className={`flex items-center text-xs ${
                    growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}