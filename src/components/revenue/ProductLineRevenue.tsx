'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  Info,
  Maximize2,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  Filter
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { MetricTooltip } from '@/components/MetricTooltip'
import { DataSourceIndicator, DATA_SOURCE_CONFIGS } from '@/components/DataSourceIndicator'

// 动态导入 ReactECharts 避免 SSR 问题
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg"></div>
})

interface ProductData {
  name: string
  revenue: number
  profitMargin?: number
  growth?: number
  children?: ProductData[]
}

interface ProductLineRevenueProps {
  data: ProductData[]
  title: string
  height?: number
  showControls?: boolean
  years?: number[]
  selectedYear?: number
  onYearChange?: (year: number) => void
  onFullscreen?: () => void
  onExport?: () => void
}

type ViewMode = 'pie' | 'bar' | 'sunburst' | 'treemap'

export function ProductLineRevenue({
  data,
  title,
  height = 400,
  showControls = true,
  years = [2023, 2024, 2025],
  selectedYear = 2025,
  onYearChange,
  onFullscreen,
  onExport
}: ProductLineRevenueProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('sunburst')
  const [showDetails, setShowDetails] = useState(true) // 默认展开详细数据
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // 颜色生成函数 - 移到前面避免初始化顺序问题
  const getCategoryColor = (category: string) => {
    const colors = {
      '消费级产品': '#3b82f6',
      '企业级产品': '#10b981', 
      '软件服务': '#f59e0b'
    }
    return colors[category as keyof typeof colors] || '#6b7280'
  }

  const getProductColor = (product: string) => {
    const hash = product.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']
    return colors[hash % colors.length]
  }

  // 计算总收入
  const totalRevenue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.revenue, 0)
  }, [data])

  // 准备图表数据
  const chartData = useMemo(() => {
    if (viewMode === 'sunburst') {
      // 旭日图数据 - 支持层级结构
      return data.map(category => ({
        name: category.name,
        value: category.revenue,
        children: category.children?.map(subcategory => ({
          name: subcategory.name,
          value: subcategory.revenue,
          growth: subcategory.growth || 0,
          profitMargin: subcategory.profitMargin || 0,
          itemStyle: {
            color: getProductColor(subcategory.name)
          }
        })) || [],
        itemStyle: {
          color: getCategoryColor(category.name)
        }
      }))
    } else if (viewMode === 'treemap') {
      // 矩形树图数据
      return data.map(category => ({
        name: category.name,
        value: category.revenue,
        children: category.children?.map(subcategory => ({
          name: subcategory.name,
          value: subcategory.revenue,
          label: {
            show: true,
            formatter: (params: any) => {
              const valueInM = (params.value / 1e6).toFixed(1)
              const percentage = ((params.value / totalRevenue) * 100).toFixed(1)
              return `${params.name}\n$${valueInM}M\n${percentage}%`
            }
          }
        })) || []
      }))
    } else {
      // 饼图和柱状图数据
      const flatData = data.flatMap(category => 
        category.children && category.children.length > 0 
          ? category.children.map(subcategory => ({
              name: subcategory.name,
              value: Math.round(subcategory.revenue / 1e6), // 转换为百万
              category: category.name,
              growth: subcategory.growth || 0,
              profitMargin: subcategory.profitMargin || 0,
              percentage: (subcategory.revenue / totalRevenue * 100)
            }))
          : [{
              name: category.name,
              value: Math.round(category.revenue / 1e6),
              category: '主要分类',
              growth: category.growth || 0,
              profitMargin: category.profitMargin || 0,
              percentage: (category.revenue / totalRevenue * 100)
            }]
      )
      return selectedCategory ? 
        flatData.filter(item => item.category === selectedCategory) : 
        flatData
    }
  }, [data, viewMode, selectedCategory, totalRevenue])

  // 图表配置
  const chartOption = useMemo((): EChartsOption => {
    const baseConfig = {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151'
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut' as const,
      // 禁用所有交互功能
      toolbox: {
        show: false
      },
      dataZoom: [],
      brush: {
        toolbox: []
      }
    }

    switch (viewMode) {
      case 'pie':
        return {
          ...baseConfig,
          xAxis: undefined,
          yAxis: undefined,
          grid: undefined,
          tooltip: {
            ...baseConfig.tooltip,
            formatter: (params: any) => {
              const data = params.data
              return `
                <strong>${params.name}</strong><br/>
                收入: $${data.value}M<br/>
                占比: ${data.percentage.toFixed(1)}%<br/>
                增长: ${data.growth >= 0 ? '+' : ''}${data.growth.toFixed(1)}%<br/>
                利润率: ${data.profitMargin.toFixed(1)}%
              `
            }
          },
          series: [{
            name: '产品线收入',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '55%'],
            data: chartData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{b}\n{d}%',
              fontSize: 11
            },
            labelLine: {
              show: true
            }
          }],
          legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle',
            textStyle: {
              fontSize: 11
            }
          }
        }

      case 'bar':
        return {
          ...baseConfig,
          tooltip: {
            ...baseConfig.tooltip,
            formatter: (params: any) => {
              const data = params.data
              return `
                <strong>${params.name}</strong><br/>
                收入: $${data.value}M<br/>
                增长: ${data.growth >= 0 ? '+' : ''}${data.growth.toFixed(1)}%<br/>
                利润率: ${data.profitMargin.toFixed(1)}%
              `
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '8%',
            top: '5%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: chartData.map((item: any) => item.name),
            axisLabel: {
              interval: 0,
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: '收入 (百万美元)',
            nameTextStyle: {
              fontSize: 11
            },
            axisLabel: {
              formatter: '${value}M',
              fontSize: 10
            }
          },
          series: [{
            name: '收入',
            type: 'bar',
            data: chartData.map((item: any) => ({
              value: item.value,
              name: item.name,
              ...item,
              itemStyle: {
                color: getProductColor(item.name)
              }
            })),
            emphasis: {
              focus: 'series'
            },
            label: {
              show: true,
              position: 'top',
              formatter: '${c}M',
              fontSize: 10
            }
          }]
        }

      case 'sunburst':
        return {
          ...baseConfig,
          xAxis: undefined,
          yAxis: undefined,
          grid: undefined,
          tooltip: {
            ...baseConfig.tooltip,
            formatter: (params: any) => {
              return `
                <strong>${params.name}</strong><br/>
                收入: $${(params.value / 1e6).toFixed(1)}M<br/>
                占比: ${((params.value / totalRevenue) * 100).toFixed(1)}%
                ${params.data.growth !== undefined ? `<br/>增长: ${params.data.growth >= 0 ? '+' : ''}${params.data.growth.toFixed(1)}%` : ''}
                ${params.data.profitMargin !== undefined ? `<br/>利润率: ${params.data.profitMargin.toFixed(1)}%` : ''}
              `
            }
          },
          series: [{
            name: '产品层级',
            type: 'sunburst',
            data: chartData,
            radius: [0, '90%'],
            center: ['50%', '55%'],
            emphasis: {
              focus: 'ancestor'
            },
            levels: [{
              // 外层
              radius: ['60%', '90%'],
              itemStyle: {
                borderWidth: 2,
                borderColor: '#fff'
              },
              label: {
                show: true,
                rotate: 'tangential',
                fontSize: 11
              }
            }, {
              // 内层
              radius: ['0%', '60%'],
              itemStyle: {
                borderWidth: 2,
                borderColor: '#fff'
              },
              label: {
                show: true,
                fontSize: 12,
                fontWeight: 'bold'
              }
            }]
          }]
        }

      case 'treemap':
        return {
          ...baseConfig,
          xAxis: undefined,
          yAxis: undefined,
          grid: undefined,
          tooltip: {
            ...baseConfig.tooltip,
            formatter: (params: any) => {
              return `
                <strong>${params.name}</strong><br/>
                收入: $${(params.value / 1e6).toFixed(1)}M<br/>
                占比: ${((params.value / totalRevenue) * 100).toFixed(1)}%
              `
            }
          },
          series: [{
            name: '产品矩形图',
            type: 'treemap',
            data: chartData,
            visibleMin: 300,
            label: {
              show: true,
              formatter: (params: any) => {
                const valueInM = (params.value / 1e6).toFixed(1)
                return `${params.name}\n$${valueInM}M`
              }
            },
            upperLabel: {
              show: true,
              height: 30
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 20,
                shadowColor: 'rgba(0,0,0,0.8)'
              }
            }
          }]
        }

      default:
        return baseConfig
    }
  }, [viewMode, chartData, totalRevenue])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* 头部控制区 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Package className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="mt-2">
              <DataSourceIndicator 
                {...(selectedYear >= 2025 
                  ? DATA_SOURCE_CONFIGS.FUTURE_PREDICTED 
                  : DATA_SOURCE_CONFIGS.PRODUCT_LINE_ESTIMATED)}
                showAlert={false}
                size="small"
              />
            </div>
          </div>
          <MetricTooltip metricId="productRevenue">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </MetricTooltip>
        </div>

        {showControls && (
          <div className="flex items-center space-x-3">
            {/* 年份选择 */}
            {years && years.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">年份:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => onYearChange?.(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 视图模式切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { mode: 'sunburst' as const, icon: '🌞', label: '旭日图' },
                { mode: 'pie' as const, icon: '🥧', label: '饼图' },
                { mode: 'treemap' as const, icon: '🗂️', label: '矩形图' },
                { mode: 'bar' as const, icon: '📊', label: '柱状图' }
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={label}
                >
                  {icon}
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

      {/* 分类过滤器 */}
      {viewMode !== 'sunburst' && viewMode !== 'treemap' && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">分类筛选:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                全部
              </button>
              {data.map(category => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    selectedCategory === category.name
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="p-6">
        {data && data.length > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ height: `${height}px` }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={true}
          />
        ) : (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">暂无产品线数据</p>
              <p className="text-sm mt-2">选定年份没有真实的财务数据</p>
            </div>
          </div>
        )}
      </div>

      {/* 详细数据表格 */}
      {data && data.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            <span>{showDetails ? '隐藏' : '显示'}详细数据</span>
          </button>

          {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">收入</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">占比</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">增长率</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">利润率</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.flatMap(category => 
                    category.children?.map(product => (
                      <tr key={`${category.name}-${product.name}`}>
                        <td className="px-4 py-2 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-gray-500 text-xs">{category.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          ${(product.revenue / 1e6).toFixed(1)}M
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {((product.revenue / totalRevenue) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className={`flex items-center space-x-1 ${
                            (product.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(product.growth || 0) >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{(product.growth || 0) >= 0 ? '+' : ''}{(product.growth || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {(product.profitMargin || 0).toFixed(1)}%
                        </td>
                      </tr>
                    )) || []
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}