'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Tag, Alert, Tooltip, Divider, Progress } from 'antd'
import { 
  TrophyOutlined, 
  RiseOutlined, 
  InfoCircleOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RocketOutlined
} from '@ant-design/icons'
import { MultiViewChart } from './MultiViewChart'
import { SWOTAnalysis } from './SWOTAnalysis'
import { financialService, CompetitorData } from '@/lib/financial-service'

interface ExtendedCompetitorData extends CompetitorData {
  trend: 'up' | 'down' | 'neutral'
  competitiveRating: number
}

export function CompetitionAnalysis() {
  const [competitorData, setCompetitorData] = useState<ExtendedCompetitorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompetitorData()
  }, [])

  const fetchCompetitorData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取竞争对手数据
      let competitors: CompetitorData[]
      try {
        competitors = await financialService.getCompetitorData(['NTGR', 'CSCO', 'HPE'])
      } catch (apiError) {
        console.warn('无法获取真实数据，使用模拟数据:', apiError)
        competitors = generateMockCompetitorData()
      }

      if (competitors.length === 0) {
        throw new Error('无竞争对手数据可用')
      }

      // 扩展数据，添加趋势和竞争力评级
      const extendedData: ExtendedCompetitorData[] = competitors.map(competitor => ({
        ...competitor,
        trend: calculateTrend(competitor),
        competitiveRating: calculateCompetitiveRating(competitor)
      }))

      setCompetitorData(extendedData)
      setError(null)

    } catch (err) {
      console.error('获取竞争对手数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      
      // 使用模拟数据作为fallback
      const mockData = generateMockCompetitorData()
      const extendedMockData: ExtendedCompetitorData[] = mockData.map(competitor => ({
        ...competitor,
        trend: calculateTrend(competitor),
        competitiveRating: calculateCompetitiveRating(competitor)
      }))
      
      setCompetitorData(extendedMockData)
    } finally {
      setLoading(false)
    }
  }

  // 计算趋势方向
  const calculateTrend = (competitor: CompetitorData): 'up' | 'down' | 'neutral' => {
    // 基于综合指标判断趋势
    const score = competitor.grossProfitMargin + competitor.netProfitMargin + competitor.roe
    if (score > 50) return 'up'
    if (score < 30) return 'down'
    return 'neutral'
  }

  // 计算竞争力评级 (0-100)
  const calculateCompetitiveRating = (competitor: CompetitorData): number => {
    const metrics = [
      competitor.grossProfitMargin / 100 * 25, // 毛利率权重25%
      competitor.netProfitMargin / 100 * 25,   // 净利率权重25%
      competitor.marketShare / 100 * 30,       // 市场份额权重30%
      competitor.roe / 100 * 20                // ROE权重20%
    ]
    return Math.min(100, metrics.reduce((sum, metric) => sum + metric, 0))
  }

  const generateMockCompetitorData = (): CompetitorData[] => {
    return [
      {
        company: 'NETGEAR',
        symbol: 'NTGR',
        revenue: 1340000000,
        grossProfitMargin: 28.5,
        netProfitMargin: 8.8,
        marketShare: 8.5,
        roe: 12.3,
        roa: 7.4,
        year: 2024,
        period: 'Q4-2024'
      },
      {
        company: 'Cisco',
        symbol: 'CSCO',
        revenue: 13800000000,
        grossProfitMargin: 64.2,
        netProfitMargin: 21.5,
        marketShare: 45.2,
        roe: 18.7,
        roa: 11.2,
        year: 2024,
        period: 'Q4-2024'
      },
      {
        company: 'HP Enterprise',
        symbol: 'HPE',
        revenue: 3200000000,
        grossProfitMargin: 32.1,
        netProfitMargin: 6.8,
        marketShare: 12.8,
        roe: 15.2,
        roa: 5.9,
        year: 2024,
        period: 'Q4-2024'
      }
    ]
  }

  // 准备图表数据
  const prepareRevenueComparisonData = () => {
    return competitorData.map(competitor => ({
      name: competitor.company,
      营收: Math.round(competitor.revenue / 1e6), // 转为百万美元
      市场份额: competitor.marketShare
    })).sort((a, b) => b.营收 - a.营收)
  }

  const prepareProfitabilityData = () => {
    return competitorData.map(competitor => ({
      name: competitor.company,
      毛利率: competitor.grossProfitMargin,
      净利率: competitor.netProfitMargin,
      资产回报率: competitor.roa
    }))
  }

  const prepareCompetitiveRatingData = () => {
    return competitorData.map(competitor => ({
      name: competitor.company,
      竞争力评级: competitor.competitiveRating,
      市场份额: competitor.marketShare,
      ROE: competitor.roe
    })).sort((a, b) => b.竞争力评级 - a.竞争力评级)
  }

  const prepareBubbleChartData = () => {
    return competitorData.map(competitor => ({
      x: competitor.grossProfitMargin,
      y: competitor.netProfitMargin,
      z: competitor.revenue / 1e6,
      name: competitor.company
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyOutlined />
            <h1 className="text-2xl font-bold text-gray-900 m-0">竞争分析</h1>
          </div>
          <Tag color="blue">
            最新数据: {competitorData[0]?.period || 'N/A'}
          </Tag>
        </div>
      </Card>

      {error && (
        <Alert
          message="数据加载警告" 
          description={error}
          type="warning"
          showIcon
          closable
        />
      )}

      {/* 营收规模对比 - 独占一行 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined />
            营收规模对比分析
          </div>
        }
      >
        <Alert
          message="指标说明"
          description="营收规模对比展示各公司的市场体量差异。营收越高，通常代表市场份额越大、业务规模越庞大。此图表有助于了解Netgear在行业中的相对地位。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <MultiViewChart
          data={prepareRevenueComparisonData()}
          views={['bar', 'pie', 'table']}
          defaultView="bar"
          title=""
          height={350}
        />
      </Card>

      {/* 盈利能力对比 - 独占一行 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <RiseOutlined />
            盈利能力对比分析
          </div>
        }
      >
        <Alert
          message="指标说明"
          description="盈利能力对比包含毛利率、净利率和资产回报率等关键指标。毛利率反映产品定价能力，净利率体现整体运营效率，ROA显示资产使用效率。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <MultiViewChart
          data={prepareProfitabilityData()}
          views={['bar', 'line', 'table']}
          defaultView="bar"
          title=""
          height={350}
        />
      </Card>

      {/* 综合竞争力评级 - 独占一行 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ThunderboltOutlined />
            综合竞争力评级分析
          </div>
        }
      >
        <Alert
          message="指标说明"
          description="综合竞争力评级基于毛利率(25%)、净利率(25%)、市场份额(30%)、ROE(20%)的加权计算。评级越高表示公司在财务表现和市场地位方面综合实力越强。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <MultiViewChart
          data={prepareCompetitiveRatingData()}
          views={['bar', 'line', 'table']}
          defaultView="bar"
          title=""
          height={350}
        />
      </Card>

      {/* NETGEAR 竞争地位分析 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined />
            NETGEAR 竞争地位分析
          </div>
        }
      >
        <div className="space-y-4">
          {/* 竞争地位概览 */}
          <Row gutter={[16, 16]}>
            {competitorData.find(c => c.company === 'NETGEAR') && (
              <>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" style={{ backgroundColor: '#f0f8ff', textAlign: 'center' }}>
                    <Statistic
                      title="市场排名"
                      value={`#${competitorData.findIndex(c => c.company === 'NETGEAR') + 1}`}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" style={{ backgroundColor: '#f6ffed', textAlign: 'center' }}>
                    <Statistic
                      title="竞争力评分"
                      value={competitorData.find(c => c.company === 'NETGEAR')?.competitiveRating.toFixed(0)}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </>
            )}
          </Row>

          {/* 优势分析 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <h4 className="font-medium text-green-900 m-0">核心优势</h4>
                </div>
                <div className="space-y-2 text-sm text-green-800">
                  <p>• 消费级路由器市场领先地位</p>
                  <p>• 品牌知名度高，产品线完整</p>
                  <p>• 技术创新能力强</p>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <h4 className="font-medium text-yellow-900 m-0">改进空间</h4>
                </div>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>• 毛利率相比Cisco仍有差距</p>
                  <p>• 企业级市场渗透率较低</p>
                  <p>• 需要优化运营效率</p>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
                <div className="flex items-center gap-2 mb-3">
                  <RocketOutlined style={{ color: '#1890ff' }} />
                  <h4 className="font-medium text-blue-900 m-0">发展建议</h4>
                </div>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• 提升产品定价策略</p>
                  <p>• 加强B2B市场拓展</p>
                  <p>• 投资5G/Wi-Fi 7等新技术</p>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 详细对比表格 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <InfoCircleOutlined />
            竞争对手详细对比
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">营收 (百万美元)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">毛利率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">净利率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">市场份额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">竞争力评级</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">趋势</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitorData.map((competitor, index) => (
                <tr key={competitor.symbol} className={competitor.company === 'NETGEAR' ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{competitor.company}</div>
                      {competitor.company === 'NETGEAR' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          目标公司
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(competitor.revenue / 1e6).toFixed(0)}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.grossProfitMargin.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.netProfitMargin.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.marketShare.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.roe.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{competitor.competitiveRating.toFixed(0)}</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${competitor.competitiveRating}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      competitor.trend === 'up' ? 'bg-green-100 text-green-800' :
                      competitor.trend === 'down' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {competitor.trend === 'up' ? '↗️ 上升' : 
                       competitor.trend === 'down' ? '↘️ 下降' : '→ 平稳'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SWOT 战略分析 */}
      <SWOTAnalysis 
        data={{
          strengths: [
            {
              id: 's1',
              text: '消费级路由器市场领先地位，品牌知名度高',
              impact: 'high',
              category: '市场地位'
            },
            {
              id: 's2', 
              text: '产品线完整，技术创新能力强，拥有多项核心专利',
              impact: 'high',
              category: '技术优势'
            },
            {
              id: 's3',
              text: '分销渠道广泛，与主要零售商关系良好',
              impact: 'medium',
              category: '渠道优势'
            },
            {
              id: 's4',
              text: '在Wi-Fi 6/6E技术方面有先发优势',
              impact: 'medium',
              category: '技术领先'
            }
          ],
          weaknesses: [
            {
              id: 'w1',
              text: '毛利率相比Cisco等竞争对手仍有较大差距',
              impact: 'high',
              category: '盈利能力'
            },
            {
              id: 'w2',
              text: '企业级市场渗透率较低，B2B业务发展不足',
              impact: 'high',
              category: '市场布局'
            },
            {
              id: 'w3',
              text: '运营效率需要进一步优化，成本控制有待加强',
              impact: 'medium',
              category: '运营管理'
            },
            {
              id: 'w4',
              text: '对单一市场依赖较重，业务多元化程度不够',
              impact: 'medium',
              category: '风险管控'
            }
          ],
          opportunities: [
            {
              id: 'o1',
              text: '5G和Wi-Fi 7技术发展带来的升级换代机会',
              impact: 'high',
              category: '技术机遇'
            },
            {
              id: 'o2',
              text: '远程办公和居家娱乐推动网络设备需求增长',
              impact: 'high',
              category: '市场需求'
            },
            {
              id: 'o3',
              text: '智能家居和IoT设备快速普及',
              impact: 'medium',
              category: '新兴市场'
            },
            {
              id: 'o4',
              text: '企业数字化转型为B2B市场拓展提供机会',
              impact: 'medium',
              category: '企业市场'
            }
          ],
          threats: [
            {
              id: 't1',
              text: '华为、小米等中国厂商价格竞争激烈',
              impact: 'high',
              category: '竞争威胁'
            },
            {
              id: 't2',
              text: '芯片供应链不稳定，成本上涨压力',
              impact: 'high',
              category: '供应链风险'
            },
            {
              id: 't3',
              text: '地缘政治紧张影响国际市场拓展',
              impact: 'medium',
              category: '政策风险'
            },
            {
              id: 't4',
              text: '消费者对价格敏感度提升，高端产品销售面临挑战',
              impact: 'medium',
              category: '市场风险'
            }
          ]
        }}
        companyName="Netgear"
        title="SWOT 战略分析"
      />
    </div>
  )
}