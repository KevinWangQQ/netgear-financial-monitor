'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  RadarChart as RechartsRadar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Zap,
  Target,
  Award,
  HelpCircle
} from 'lucide-react'
import { MetricTooltip, HelpIcon } from './MetricTooltip'

// 雷达图数据接口
export interface RadarDataPoint {
  metric: string
  value: number
  fullMark: number
  description: string
  category: 'profitability' | 'efficiency' | 'liquidity' | 'leverage' | 'growth' | 'market'
}

export interface RadarChartData {
  company: string
  data: RadarDataPoint[]
  color: string
}

interface FinancialRadarChartProps {
  data: RadarChartData[]
  title: string
  height?: number
  showComparison?: boolean
  selectedMetrics?: string[]
}

// 预定义的财务健康度指标
const FINANCIAL_HEALTH_METRICS = {
  profitability: {
    name: '盈利能力',
    icon: DollarSign,
    color: '#10b981',
    metrics: [
      { key: 'grossMargin', name: '毛利率', weight: 0.3, maxValue: 60 },
      { key: 'netMargin', name: '净利率', weight: 0.4, maxValue: 30 },
      { key: 'roa', name: 'ROA', weight: 0.3, maxValue: 15 }
    ]
  },
  efficiency: {
    name: '运营效率',
    icon: Zap,
    color: '#3b82f6',
    metrics: [
      { key: 'assetTurnover', name: '资产周转率', weight: 0.4, maxValue: 2.5 },
      { key: 'inventoryTurnover', name: '存货周转率', weight: 0.3, maxValue: 12 },
      { key: 'receivablesTurnover', name: '应收账款周转率', weight: 0.3, maxValue: 8 }
    ]
  },
  liquidity: {
    name: '流动性',
    icon: Shield,
    color: '#06b6d4',
    metrics: [
      { key: 'currentRatio', name: '流动比率', weight: 0.4, maxValue: 3 },
      { key: 'quickRatio', name: '速动比率', weight: 0.3, maxValue: 2 },
      { key: 'cashRatio', name: '现金比率', weight: 0.3, maxValue: 1 }
    ]
  },
  leverage: {
    name: '财务杠杆',
    icon: Target,
    color: '#f59e0b',
    metrics: [
      { key: 'debtToAssets', name: '资产负债率', weight: 0.4, maxValue: 60, inverse: true },
      { key: 'debtToEquity', name: '产权比率', weight: 0.3, maxValue: 100, inverse: true },
      { key: 'interestCoverage', name: '利息保障倍数', weight: 0.3, maxValue: 10 }
    ]
  },
  growth: {
    name: '成长能力',
    icon: TrendingUp,
    color: '#8b5cf6',
    metrics: [
      { key: 'revenueGrowth', name: '营收增长率', weight: 0.4, maxValue: 30 },
      { key: 'netIncomeGrowth', name: '净利润增长率', weight: 0.4, maxValue: 25 },
      { key: 'assetGrowth', name: '资产增长率', weight: 0.2, maxValue: 20 }
    ]
  },
  market: {
    name: '市场地位',
    icon: Award,
    color: '#ef4444',
    metrics: [
      { key: 'marketShare', name: '市场份额', weight: 0.4, maxValue: 50 },
      { key: 'brandValue', name: '品牌价值', weight: 0.3, maxValue: 100 },
      { key: 'competitivePosition', name: '竞争地位', weight: 0.3, maxValue: 100 }
    ]
  }
}

// 生成模拟数据
const generateMockRadarData = (): RadarChartData[] => {
  return [
    {
      company: 'NETGEAR',
      color: '#3b82f6',
      data: [
        { metric: '盈利能力', value: 68, fullMark: 100, description: '毛利率28.5%，净利率8.2%', category: 'profitability' },
        { metric: '运营效率', value: 72, fullMark: 100, description: '资产周转率1.2，存货周转率6.5', category: 'efficiency' },
        { metric: '流动性', value: 85, fullMark: 100, description: '流动比率2.1，现金充足', category: 'liquidity' },
        { metric: '财务杠杆', value: 78, fullMark: 100, description: '负债率35%，杠杆适中', category: 'leverage' },
        { metric: '成长能力', value: 61, fullMark: 100, description: '营收增长8.5%，利润增长12%', category: 'growth' },
        { metric: '市场地位', value: 58, fullMark: 100, description: '市场份额8.5%，品牌认知度中等', category: 'market' }
      ]
    },
    {
      company: 'Cisco',
      color: '#10b981',
      data: [
        { metric: '盈利能力', value: 89, fullMark: 100, description: '毛利率65%，净利率22%', category: 'profitability' },
        { metric: '运营效率', value: 82, fullMark: 100, description: '资产周转率0.8，但利润率极高', category: 'efficiency' },
        { metric: '流动性', value: 91, fullMark: 100, description: '现金流充沛，财务稳健', category: 'liquidity' },
        { metric: '财务杠杆', value: 85, fullMark: 100, description: '负债结构优化，风险控制良好', category: 'leverage' },
        { metric: '成长能力', value: 76, fullMark: 100, description: '稳定增长，转型成功', category: 'growth' },
        { metric: '市场地位', value: 95, fullMark: 100, description: '市场份额45%，行业领导者', category: 'market' }
      ]
    }
  ]
}

export function FinancialRadarChart({
  data = generateMockRadarData(),
  title = "财务健康度雷达图",
  height = 400,
  showComparison = true,
  selectedMetrics
}: FinancialRadarChartProps) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  // 转换数据格式以适配recharts雷达图
  const radarChartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // 获取所有指标名称
    const metrics = data[0].data.map(item => item.metric)
    
    // 为每个指标创建数据点，包含所有公司的值
    return metrics.map(metric => {
      const point: any = { metric }
      data.forEach(company => {
        const metricData = company.data.find(d => d.metric === metric)
        point[company.company] = metricData?.value || 0
      })
      return point
    })
  }, [data])

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!selectedMetrics || selectedMetrics.length === 0) {
      return data
    }
    
    return data.map(company => ({
      ...company,
      data: company.data.filter(point => selectedMetrics.includes(point.metric))
    }))
  }, [data, selectedMetrics])

  // 计算综合得分
  const calculateOverallScore = (companyData: RadarDataPoint[]) => {
    const total = companyData.reduce((sum, point) => sum + point.value, 0)
    return Math.round(total / companyData.length)
  }

  // 获取最强和最弱的指标
  const getStrengthsAndWeaknesses = (companyData: RadarDataPoint[]) => {
    const sorted = [...companyData].sort((a, b) => b.value - a.value)
    return {
      strengths: sorted.slice(0, 2),
      weaknesses: sorted.slice(-2)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* 标题和控制 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <MetricTooltip metricId="radarChart">
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </MetricTooltip>
        </div>
        
        {showComparison && (
          <div className="flex space-x-2">
            {data.map((company) => (
              <button
                key={company.company}
                onClick={() => setSelectedCompany(
                  selectedCompany === company.company ? null : company.company
                )}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                  selectedCompany === company.company
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                style={{
                  borderColor: selectedCompany === company.company ? company.color : undefined
                }}
              >
                {company.company}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 雷达图 */}
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={height}>
            <RechartsRadar data={radarChartData}>
              <PolarGrid 
                stroke="#e5e7eb" 
                strokeWidth={1}
              />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                className="text-sm"
              />
              <PolarRadiusAxis 
                domain={[0, 100]} 
                angle={90} 
                tickFormatter={(value) => `${value}`}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              
              {data.map((company, index) => (
                <Radar
                  key={company.company}
                  name={company.company}
                  dataKey={company.company}
                  stroke={company.color}
                  fill={company.color}
                  fillOpacity={selectedCompany === company.company ? 0.3 : 0.1}
                  strokeWidth={selectedCompany === company.company ? 3 : 2}
                  dot={{
                    fill: company.color,
                    stroke: company.color,
                    strokeWidth: 1,
                    r: selectedCompany === company.company ? 5 : 3
                  }}
                />
              ))}
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 mb-2">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm">{entry.name}</span>
                            </div>
                            <span className="font-medium text-sm">{entry.value}/100</span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
            </RechartsRadar>
          </ResponsiveContainer>
        </div>

        {/* 侧边栏统计 */}
        <div className="space-y-4">
          {/* 综合得分 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              综合评分
            </h4>
            
            <div className="space-y-2">
              {data.map((company) => {
                const score = calculateOverallScore(company.data)
                return (
                  <div key={company.company} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: company.color }}
                      />
                      <span className="text-sm font-medium">{company.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${score}%`,
                            backgroundColor: company.color
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold min-w-8">{score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 优势与劣势分析 */}
          {data.map((company) => {
            const analysis = getStrengthsAndWeaknesses(company.data)
            return (
              <motion.div
                key={company.company}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: company.color }}
                  />
                  {company.company} 分析
                </h4>
                
                {/* 优势 */}
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    核心优势
                  </h5>
                  <div className="space-y-1">
                    {analysis.strengths.map((strength) => (
                      <div key={strength.metric} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {strength.metric}: {strength.value}/100
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 改进空间 */}
                <div>
                  <h5 className="text-xs font-medium text-orange-700 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    改进空间
                  </h5>
                  <div className="space-y-1">
                    {analysis.weaknesses.map((weakness) => (
                      <div key={weakness.metric} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {weakness.metric}: {weakness.value}/100
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
          
          {/* 指标说明 */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium mb-2">评分标准</h5>
            <ul className="space-y-1">
              <li>• 80-100: 优秀</li>
              <li>• 60-79: 良好</li>
              <li>• 40-59: 一般</li>
              <li>• 20-39: 较差</li>
              <li>• 0-19: 需要改善</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 简化版雷达图，用于仪表盘概览
export function SimpleRadarChart({ 
  companyData, 
  size = 200, 
  showLabels = false 
}: { 
  companyData: RadarDataPoint[]
  size?: number
  showLabels?: boolean 
}) {
  return (
    <ResponsiveContainer width={size} height={size}>
      <RechartsRadar data={companyData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={showLabels ? { fontSize: 10, fill: '#6b7280' } : false}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} />
        <Radar
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}