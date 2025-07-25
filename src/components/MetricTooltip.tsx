'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, TrendingUp, Calculator, Info, ExternalLink } from 'lucide-react'

// 指标定义接口
export interface MetricDefinition {
  id: string
  name: string
  shortName: string
  description: string
  formula?: string
  goodRange?: {
    min?: number
    max?: number
    unit: string
    interpretation: string
  }
  calculation?: string
  importance: 'high' | 'medium' | 'low'
  category: 'profitability' | 'efficiency' | 'liquidity' | 'leverage' | 'growth' | 'market'
  examples?: Array<{
    company: string
    value: number
    interpretation: string
  }>
  relatedMetrics?: string[]
  tips?: string[]
}

// 预定义的指标字典
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  revenue: {
    id: 'revenue',
    name: '营业收入',
    shortName: '营收',
    description: '公司在特定期间内通过销售商品或提供服务获得的总收入，是衡量公司业务规模的基础指标。',
    formula: '营收 = 销售收入 + 服务收入 + 其他营业收入',
    calculation: '通常按季度或年度统计，不包括非营业收入',
    importance: 'high',
    category: 'growth',
    goodRange: {
      unit: '增长率',
      interpretation: '正增长表示业务扩张，负增长需要关注原因'
    },
    examples: [
      { company: 'NETGEAR', value: 300, interpretation: '稳健的硬件销售收入' },
      { company: 'Cisco', value: 13500, interpretation: '网络设备行业领导者' }
    ],
    relatedMetrics: ['grossProfit', 'netIncome', 'marketShare'],
    tips: [
      '关注收入增长的可持续性',
      '分析收入来源的多样性',
      '对比行业平均增长率'
    ]
  },
  
  grossProfitMargin: {
    id: 'grossProfitMargin',
    name: '毛利率',
    shortName: '毛利率',
    description: '毛利率反映公司产品或服务的盈利能力，扣除直接成本后的利润占收入的比例。',
    formula: '毛利率 = (营收 - 销售成本) ÷ 营收 × 100%',
    calculation: '毛利润除以营业收入，以百分比表示',
    importance: 'high',
    category: 'profitability',
    goodRange: {
      min: 25,
      max: 60,
      unit: '%',
      interpretation: '25%以上为良好，40%以上为优秀'
    },
    examples: [
      { company: 'NETGEAR', value: 28.5, interpretation: '硬件产品毛利率适中' },
      { company: 'Apple', value: 45.2, interpretation: '高端产品定价优势明显' }
    ],
    relatedMetrics: ['netProfitMargin', 'operatingMargin'],
    tips: [
      '毛利率下降可能表示成本上升或竞争加剧',
      '技术公司通常比制造业毛利率更高',
      '关注季度间的波动趋势'
    ]
  },

  netProfitMargin: {
    id: 'netProfitMargin',
    name: '净利率',
    shortName: '净利率',
    description: '净利率是最终盈利能力的衡量指标，反映公司扣除所有成本和税费后的实际盈利水平。',
    formula: '净利率 = 净利润 ÷ 营收 × 100%',
    calculation: '净利润除以营业收入，考虑所有运营成本、财务成本和税费',
    importance: 'high',
    category: 'profitability',
    goodRange: {
      min: 5,
      max: 25,
      unit: '%',
      interpretation: '5%以上为盈利，10%以上为良好，15%以上为优秀'
    },
    examples: [
      { company: 'NETGEAR', value: 8.2, interpretation: '基本盈利水平' },
      { company: 'Microsoft', value: 31.2, interpretation: '软件业务高利润率' }
    ],
    relatedMetrics: ['grossProfitMargin', 'roe', 'roa'],
    tips: [
      '净利率波动反映经营效率变化',
      '对比同行业公司的净利率水平',
      '关注季节性因素对净利率的影响'
    ]
  },

  roa: {
    id: 'roa',
    name: '资产收益率',
    shortName: 'ROA',
    description: 'ROA衡量公司利用资产创造利润的效率，是评估管理层资产运用能力的重要指标。',
    formula: 'ROA = 净利润 ÷ 平均总资产 × 100%',
    calculation: '净利润除以平均总资产，通常使用期初期末资产平均值',
    importance: 'high',
    category: 'efficiency',
    goodRange: {
      min: 3,
      max: 15,
      unit: '%',
      interpretation: '3%以上为合格，5%以上为良好，10%以上为优秀'
    },
    examples: [
      { company: 'NETGEAR', value: 4.2, interpretation: '资产利用效率中等' },
      { company: 'Google', value: 12.8, interpretation: '资产轻、利润率高的优质企业' }
    ],
    relatedMetrics: ['roe', 'assetTurnover', 'netProfitMargin'],
    tips: [
      'ROA下降可能表示资产效率降低',
      '资产密集型行业ROA通常较低',
      '对比历史数据分析趋势变化'
    ]
  },

  roe: {
    id: 'roe',
    name: '净资产收益率',
    shortName: 'ROE',
    description: 'ROE衡量股东投资的回报率，是巴菲特等价值投资者最重视的财务指标之一。',
    formula: 'ROE = 净利润 ÷ 平均股东权益 × 100%',
    calculation: '净利润除以平均股东权益，反映股东投资的收益水平',
    importance: 'high',
    category: 'profitability',
    goodRange: {
      min: 10,
      max: 25,
      unit: '%',
      interpretation: '10%以上为合格，15%以上为良好，20%以上为优秀'
    },
    examples: [
      { company: 'NETGEAR', value: 7.1, interpretation: 'ROE偏低，需要改善盈利能力' },
      { company: 'Apple', value: 95.2, interpretation: '卓越的股东回报率' }
    ],
    relatedMetrics: ['roa', 'debtToEquity', 'netProfitMargin'],
    tips: [
      'ROE = ROA × 权益乘数，可以拆解分析',
      '过高的ROE可能来自高杠杆，需要谨慎',
      '持续稳定的ROE比波动的高ROE更可贵'
    ]
  },

  debtToAssets: {
    id: 'debtToAssets',
    name: '资产负债率',
    shortName: '负债率',
    description: '资产负债率反映公司的财务杠杆和偿债风险，是评估财务安全性的重要指标。',
    formula: '资产负债率 = 总负债 ÷ 总资产 × 100%',
    calculation: '总负债除以总资产，包括流动负债和长期负债',
    importance: 'high',
    category: 'leverage',
    goodRange: {
      min: 20,
      max: 60,
      unit: '%',
      interpretation: '40%以下较安全，60%以上需要关注风险'
    },
    examples: [
      { company: 'NETGEAR', value: 35.2, interpretation: '财务杠杆适中，风险可控' },
      { company: 'Tesla', value: 24.1, interpretation: '负债率较低，财务稳健' }
    ],
    relatedMetrics: ['currentRatio', 'interestCoverage', 'roe'],
    tips: [
      '不同行业的合理负债率区间不同',
      '关注负债结构和偿还期限',
      '负债率过低可能表示缺乏增长动力'
    ]
  },

  marketShare: {
    id: 'marketShare',
    name: '市场份额',
    shortName: '市占率',
    description: '市场份额反映公司在特定市场中的竞争地位和影响力，是衡量市场地位的关键指标。',
    formula: '市场份额 = 公司销售额 ÷ 市场总销售额 × 100%',
    calculation: '公司在特定市场的销售额占整个市场的比例',
    importance: 'medium',
    category: 'market',
    goodRange: {
      min: 5,
      max: 50,
      unit: '%',
      interpretation: '5%以上有一定影响力，20%以上为市场领导者'
    },
    examples: [
      { company: 'NETGEAR', value: 8.5, interpretation: '网络设备市场中等玩家' },
      { company: 'Cisco', value: 45.2, interpretation: '网络设备市场绝对领导者' }
    ],
    relatedMetrics: ['revenue', 'brandValue', 'competitivePosition'],
    tips: [
      '市场份额的变化趋势比绝对数值更重要',
      '关注细分市场的份额表现',
      '份额增长可能来自市场扩张或竞争优势'
    ]
  },

  productRevenue: {
    id: 'productRevenue',
    name: '产品线营收分析',
    shortName: '产品营收',
    description: '产品线营收分析帮助了解不同产品对总收入的贡献，识别高增长和高利润的产品线，指导资源配置和战略决策。',
    formula: '产品营收占比 = 单一产品线收入 ÷ 总收入 × 100%',
    calculation: '分析各产品线的收入构成、增长率和盈利能力',
    importance: 'high',
    category: 'growth',
    goodRange: {
      unit: '多样性指数',
      interpretation: '避免过度依赖单一产品线，建议最大占比不超过60%'
    },
    examples: [
      { company: 'NETGEAR', value: 65, interpretation: '消费级产品占主导，需要平衡发展' },
      { company: 'Apple', value: 50, interpretation: 'iPhone占比合理，其他产品线均衡' }
    ],
    relatedMetrics: ['revenue', 'profitMargin', 'marketShare'],
    tips: [
      '关注高增长产品线的资源倾斜',
      '监控核心产品线的市场饱和度',
      '平衡短期利润和长期增长潜力',
      '关注新兴产品线的培育和投资'
    ]
  },

  profitability: {
    id: 'profitability',
    name: '盈利能力综合分析',
    shortName: '盈利分析',
    description: '通过多个盈利指标的综合分析，评估公司的盈利质量、趋势变化和行业竞争力，识别盈利能力的关键驱动因素。',
    formula: '综合评分 = (毛利率×30% + 净利率×40% + ROA×30%)',
    calculation: '多维度盈利指标的加权评分和趋势分析',
    importance: 'high',
    category: 'profitability',
    goodRange: {
      min: 60,
      max: 90,
      unit: '综合得分',
      interpretation: '60分以上为合格，75分以上为优秀，85分以上为卓越'
    },
    examples: [
      { company: 'NETGEAR', value: 72, interpretation: '盈利能力良好，有提升空间' },
      { company: 'Microsoft', value: 89, interpretation: '盈利能力卓越，行业标杆' }
    ],
    relatedMetrics: ['grossProfitMargin', 'netProfitMargin', 'roa', 'roe'],
    tips: [
      '关注盈利指标的一致性和可持续性',
      '分析盈利波动的根本原因',
      '对比行业基准识别改进空间',
      '关注转折点对应的关键事件'
    ]
  }
}

// 工具提示组件属性
interface MetricTooltipProps {
  metricId: string
  children: React.ReactNode
  className?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  customDefinition?: Partial<MetricDefinition>
}

export function MetricTooltip({ 
  metricId, 
  children, 
  className = '', 
  placement = 'top',
  customDefinition 
}: MetricTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const metric = {
    ...METRIC_DEFINITIONS[metricId],
    ...customDefinition
  }

  if (!metric) {
    return <div className={className}>{children}</div>
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      profitability: 'text-green-600 bg-green-100',
      efficiency: 'text-blue-600 bg-blue-100',
      liquidity: 'text-cyan-600 bg-cyan-100',
      leverage: 'text-orange-600 bg-orange-100',
      growth: 'text-purple-600 bg-purple-100',
      market: 'text-red-600 bg-red-100'
    }
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        setIsVisible(false)
        setShowDetails(false)
      }}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${
              placement === 'top' ? 'bottom-full mb-2' :
              placement === 'bottom' ? 'top-full mt-2' :
              placement === 'left' ? 'right-full mr-2 top-0' :
              'left-full ml-2 top-0'
            }`}
          >
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
              {/* 基础信息 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {metric.name}
                    <span className="text-xs">{getImportanceIcon(metric.importance)}</span>
                  </h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(metric.category)}`}>
                    {metric.category}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDetails(!showDetails)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {metric.description}
              </p>

              {/* 公式 */}
              {metric.formula && (
                <div className="mb-3 p-2 bg-gray-50 rounded border-l-2 border-blue-400">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <Calculator className="w-3 h-3" />
                    计算公式
                  </div>
                  <code className="text-xs text-gray-800 font-mono">
                    {metric.formula}
                  </code>
                </div>
              )}

              {/* 良好范围 */}
              {metric.goodRange && (
                <div className="mb-3 p-2 bg-green-50 rounded border-l-2 border-green-400">
                  <div className="flex items-center gap-1 text-xs font-medium text-green-700 mb-1">
                    <TrendingUp className="w-3 h-3" />
                    参考范围
                  </div>
                  <div className="text-xs text-green-800">
                    {metric.goodRange.min && `${metric.goodRange.min}${metric.goodRange.unit} - `}
                    {metric.goodRange.max && `${metric.goodRange.max}${metric.goodRange.unit}`}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {metric.goodRange.interpretation}
                  </div>
                </div>
              )}

              {/* 详细信息 */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* 示例 */}
                    {metric.examples && metric.examples.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-2">行业示例</h5>
                        <div className="space-y-1">
                          {metric.examples.map((example, index) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="font-medium">{example.company}: {example.value}</div>
                              <div className="text-gray-600">{example.interpretation}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 相关指标 */}
                    {metric.relatedMetrics && metric.relatedMetrics.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-2">相关指标</h5>
                        <div className="flex flex-wrap gap-1">
                          {metric.relatedMetrics.map((relatedId) => {
                            const related = METRIC_DEFINITIONS[relatedId]
                            return related ? (
                              <span key={relatedId} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {related.shortName}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}

                    {/* 分析要点 */}
                    {metric.tips && metric.tips.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-2">分析要点</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {metric.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-gray-400 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 查看更多 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDetails(!showDetails)
                }}
                className="w-full mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
              >
                {showDetails ? '收起详情' : '查看详情'}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 简单的帮助图标组件，用于快速添加工具提示
interface HelpIconProps {
  metricId: string
  className?: string
}

export function HelpIcon({ metricId, className = 'w-4 h-4 text-gray-400 hover:text-gray-600' }: HelpIconProps) {
  return (
    <MetricTooltip metricId={metricId}>
      <HelpCircle className={className} />
    </MetricTooltip>
  )
}