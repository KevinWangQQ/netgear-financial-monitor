'use client'

import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { motion } from 'framer-motion'
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Info,
  Maximize2,
  Download,
  AlertTriangle
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { MetricTooltip } from '@/components/MetricTooltip'

interface ProfitabilityData {
  period: string
  grossProfitMargin: number
  netProfitMargin: number
  operatingMargin?: number
  roa: number
  events?: {
    title: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }[]
}

interface ProfitabilityAnalysisProps {
  data: ProfitabilityData[]
  title: string
  height?: number
  showControls?: boolean
  onFullscreen?: () => void
  onExport?: () => void
}

export function ProfitabilityAnalysis({
  data,
  title,
  height = 400,
  showControls = true,
  onFullscreen,
  onExport
}: ProfitabilityAnalysisProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(['grossProfitMargin', 'netProfitMargin', 'operatingMargin'])
  )

  // 指标配置
  const metrics = [
    { 
      key: 'grossProfitMargin', 
      name: '毛利率', 
      color: '#10b981', 
      unit: '%',
      threshold: { good: 25, excellent: 40 }
    },
    { 
      key: 'netProfitMargin', 
      name: '净利率', 
      color: '#3b82f6', 
      unit: '%',
      threshold: { good: 5, excellent: 15 }
    },
    { 
      key: 'operatingMargin', 
      name: '经营利润率', 
      color: '#8b5cf6', 
      unit: '%',
      threshold: { good: 10, excellent: 20 }
    },
    { 
      key: 'roa', 
      name: 'ROA', 
      color: '#f59e0b', 
      unit: '%',
      threshold: { good: 3, excellent: 10 }
    }
  ]

  // 切换指标显示
  const toggleMetric = (metricKey: string) => {
    const newSelected = new Set(selectedMetrics)
    if (newSelected.has(metricKey)) {
      newSelected.delete(metricKey)
    } else {
      newSelected.add(metricKey)
    }
    setSelectedMetrics(newSelected)
  }

  // 识别转折点
  const turningPoints = useMemo(() => {
    return data.map((item, index) => {
      if (index === 0) return null
      
      const prev = data[index - 1]
      const points: any[] = []
      
      // 检查每个指标的显著变化
      metrics.forEach(metric => {
        if (!selectedMetrics.has(metric.key)) return
        
        const currentValue = item[metric.key as keyof ProfitabilityData] as number
        const prevValue = prev[metric.key as keyof ProfitabilityData] as number
        const change = currentValue - prevValue
        
        // 如果变化超过2个百分点，标记为转折点
        if (Math.abs(change) > 2) {
          points.push({
            period: item.period,
            metric: metric.name,
            change,
            events: item.events || []
          })
        }
      })
      
      return points.length > 0 ? { period: item.period, points } : null
    }).filter(Boolean)
  }, [data, selectedMetrics, metrics])

  // 图表配置
  const chartOption = useMemo((): EChartsOption => {
    const periods = data.map(d => d.period)
    
    // 构建系列数据
    const series: any[] = []
    const yAxisMax = Math.max(...data.flatMap(d => 
      metrics.map(m => d[m.key as keyof ProfitabilityData] as number)
    )) + 5

    // 添加背景区域（正负区间）
    series.push({
      name: '优秀区间',
      type: 'line',
      data: Array(periods.length).fill(40), // 假设40%以上为优秀
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16, 185, 129, 0.1)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
          ]
        }
      },
      lineStyle: { opacity: 0 },
      symbol: 'none',
      silent: true
    })

    series.push({
      name: '良好区间',
      type: 'line',
      data: Array(periods.length).fill(15), // 15-40%为良好
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.1)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
          ]
        }
      },
      lineStyle: { opacity: 0 },
      symbol: 'none',
      silent: true
    })

    series.push({
      name: '需要改善',
      type: 'line',
      data: Array(periods.length).fill(0),
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(239, 68, 68, 0.1)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
          ]
        }
      },
      lineStyle: { opacity: 0 },
      symbol: 'none',
      silent: true
    })

    // 添加实际数据系列
    metrics.forEach(metric => {
      if (!selectedMetrics.has(metric.key)) return
      
      const values = data.map(d => d[metric.key as keyof ProfitabilityData] as number)
      
      series.push({
        name: metric.name,
        type: 'line',
        data: values,
        lineStyle: {
          color: metric.color,
          width: 3
        },
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: metric.color,
          borderColor: '#fff',
          borderWidth: 2
        },
        emphasis: {
          symbol: 'circle',
          symbolSize: 12
        },
        tooltip: {
          valueFormatter: (value: number) => `${value.toFixed(1)}${metric.unit}`
        }
      })
    })

    // 添加转折点标记
    turningPoints.forEach((tp, index) => {
      if (!tp) return
      
      tp.points.forEach((point: any) => {
        const dataIndex = data.findIndex(d => d.period === point.period)
        if (dataIndex === -1) return
        
        const metric = metrics.find(m => m.name === point.metric)
        if (!metric) return
        
        const value = data[dataIndex][metric.key as keyof ProfitabilityData] as number
        
        series.push({
          name: '转折点',
          type: 'scatter',
          data: [{
            value: [dataIndex, value],
            symbol: 'pin',
            symbolSize: 25,
            itemStyle: {
              color: point.change > 0 ? '#10b981' : '#ef4444',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'top',
              formatter: `${point.change > 0 ? '+' : ''}${point.change.toFixed(1)}%`,
              fontSize: 10,
              color: point.change > 0 ? '#10b981' : '#ef4444',
              fontWeight: 'bold'
            }
          }],
          tooltip: {
            formatter: () => {
              let tooltip = `<strong>${point.period}</strong><br/>`
              tooltip += `${point.metric}变化: ${point.change > 0 ? '+' : ''}${point.change.toFixed(1)}%<br/>`
              if (point.events.length > 0) {
                tooltip += '<br/>相关事件:<br/>'
                point.events.forEach((event: any) => {
                  tooltip += `• ${event.title}<br/>`
                })
              }
              return tooltip
            }
          }
        })
      })
    })

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
        },
        formatter: (params: any) => {
          const dataIndex = params[0]?.dataIndex
          if (dataIndex === undefined) return ''
          
          const item = data[dataIndex]
          let tooltip = `<strong>${item.period}</strong><br/>`
          
          params.forEach((param: any) => {
            if (param.seriesName && !['优秀区间', '良好区间', '需要改善', '转折点'].includes(param.seriesName)) {
              tooltip += `${param.seriesName}: ${param.value.toFixed(1)}%<br/>`
            }
          })
          
          if (item.events && item.events.length > 0) {
            tooltip += '<br/>关键事件:<br/>'
            item.events.forEach(event => {
              tooltip += `• ${event.title}<br/>`
            })
          }
          
          return tooltip
        }
      },
      legend: {
        data: metrics.filter(m => selectedMetrics.has(m.key)).map(m => m.name),
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
        axisLabel: {
          fontSize: 11,
          color: '#6b7280'
        }
      },
      yAxis: {
        type: 'value',
        name: '百分比 (%)',
        nameTextStyle: {
          fontSize: 11,
          color: '#6b7280'
        },
        axisLabel: {
          formatter: '{value}%',
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
  }, [data, selectedMetrics, turningPoints, metrics])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* 头部控制区 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <MetricTooltip metricId="profitability">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </MetricTooltip>
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
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
        )}
      </div>

      {/* 指标选择区 */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">显示指标:</span>
            <div className="flex space-x-3">
              {metrics.map(metric => (
                <button
                  key={metric.key}
                  onClick={() => toggleMetric(metric.key)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedMetrics.has(metric.key)
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span>{metric.name}</span>
                  <MetricTooltip metricId={metric.key}>
                    <Info className="w-3 h-3 text-gray-400" />
                  </MetricTooltip>
                </button>
              ))}
            </div>
          </div>

          {/* 转折点提示 */}
          {turningPoints.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{turningPoints.length}个关键转折点</span>
            </div>
          )}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="p-6">
        {selectedMetrics.size > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ height: `${height}px` }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p>请选择要显示的盈利指标</p>
            </div>
          </div>
        )}
      </div>

      {/* 分析摘要 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.filter(m => selectedMetrics.has(m.key)).map(metric => {
            const latestValue = data[data.length - 1]?.[metric.key as keyof ProfitabilityData] as number
            const previousValue = data[data.length - 2]?.[metric.key as keyof ProfitabilityData] as number
            const change = previousValue ? latestValue - previousValue : 0
            
            // 判断健康度
            const healthStatus = latestValue >= metric.threshold.excellent ? 'excellent' : 
                               latestValue >= metric.threshold.good ? 'good' : 'poor'
            
            const healthColors = {
              excellent: 'text-green-600 bg-green-100',
              good: 'text-blue-600 bg-blue-100', 
              poor: 'text-red-600 bg-red-100'
            }
            
            // 计算相对于行业基准的表现
            const industryBenchmark = metric.threshold.good
            const vsIndustry = latestValue - industryBenchmark
            
            return (
              <div key={metric.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="font-medium text-gray-700">{metric.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthColors[healthStatus]}`}>
                    {healthStatus === 'excellent' ? '优秀' : 
                     healthStatus === 'good' ? '良好' : '需改善'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-900">
                      {latestValue.toFixed(1)}{metric.unit}
                    </span>
                    <div className={`flex items-center space-x-1 ${
                      change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    vs 行业: {vsIndustry >= 0 ? '+' : ''}{vsIndustry.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 整体健康度评分 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">整体盈利健康度</span>
            <div className="flex items-center space-x-2">
              {(() => {
                const selectedMetricsData = metrics.filter(m => selectedMetrics.has(m.key))
                const healthScores = selectedMetricsData.map(metric => {
                  const value = data[data.length - 1]?.[metric.key as keyof ProfitabilityData] as number
                  if (value >= metric.threshold.excellent) return 3
                  if (value >= metric.threshold.good) return 2
                  return 1
                })
                const avgScore = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
                const overallHealth = avgScore >= 2.5 ? 'excellent' : avgScore >= 1.5 ? 'good' : 'poor'
                const healthIcons = { excellent: '🟢', good: '🟡', poor: '🔴' }
                
                return (
                  <>
                    <span className="text-lg">{healthIcons[overallHealth]}</span>
                    <span className="text-sm font-medium">
                      {overallHealth === 'excellent' ? '优秀' : 
                       overallHealth === 'good' ? '良好' : '需改善'}
                    </span>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}