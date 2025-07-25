'use client'

import { useEffect, useState } from 'react'
import { MultiViewChart } from './MultiViewChart'
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">竞争分析</h1>
        <div className="text-sm text-gray-600">
          最新数据: {competitorData[0]?.period || 'N/A'}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      )}

      {/* 核心指标对比 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MultiViewChart
          data={prepareRevenueComparisonData()}
          views={['bar', 'pie', 'table']}
          defaultView="bar"
          title="营收规模对比"
          height={350}
        />
        
        <MultiViewChart
          data={prepareProfitabilityData()}
          views={['bar', 'line', 'table']}
          defaultView="bar"
          title="盈利能力对比"
          height={350}
        />
      </div>

      {/* 竞争力分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MultiViewChart
          data={prepareCompetitiveRatingData()}
          views={['bar', 'line', 'table']}
          defaultView="bar"
          title="综合竞争力评级"
          height={350}
        />
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">NETGEAR 竞争地位分析</h3>
          <div className="space-y-4">
            {/* 竞争地位概览 */}
            <div className="grid grid-cols-2 gap-4">
              {competitorData.find(c => c.company === 'NETGEAR') && (
                <>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      #{competitorData.findIndex(c => c.company === 'NETGEAR') + 1}
                    </div>
                    <div className="text-sm text-gray-600">市场排名</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {competitorData.find(c => c.company === 'NETGEAR')?.competitiveRating.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">竞争力评分</div>
                  </div>
                </>
              )}
            </div>

            {/* 优势分析 */}
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">🔥 核心优势</h4>
                <div className="space-y-1 text-sm text-green-800">
                  <p>• 消费级路由器市场领先地位</p>
                  <p>• 品牌知名度高，产品线完整</p>
                  <p>• 技术创新能力强</p>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ 改进空间</h4>
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>• 毛利率相比Cisco仍有差距</p>
                  <p>• 企业级市场渗透率较低</p>
                  <p>• 需要优化运营效率</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📈 发展建议</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>• 提升产品定价策略</p>
                  <p>• 加强B2B市场拓展</p>
                  <p>• 投资5G/Wi-Fi 7等新技术</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细对比表格 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">竞争对手详细对比</h3>
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
      </div>
    </div>
  )
}