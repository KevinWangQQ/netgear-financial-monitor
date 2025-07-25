'use client'

import { useEffect, useState } from 'react'
import { CompetitionChart, CompetitionTable } from './CompetitionChart'
import { supabase } from '@/lib/supabase'

interface CompetitorData {
  company: string
  revenue: number
  grossProfitMargin: number
  netProfitMargin: number
  marketShare: number
  roe: number
  roa: number
}

export function CompetitionAnalysis() {
  const [competitorData, setCompetitorData] = useState<CompetitorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompetitorData()
  }, [])

  const fetchCompetitorData = async () => {
    try {
      setLoading(true)

      // 获取所有公司数据
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .in('symbol', ['NTGR', 'CSCO', 'HPE'])

      if (companiesError) {
        throw new Error('获取公司数据失败')
      }

      if (!companies || companies.length === 0) {
        // 如果没有数据，显示模拟数据
        const mockData = generateMockCompetitorData()
        setCompetitorData(mockData)
        setError('当前显示的是模拟数据，请运行数据爬虫获取真实数据')
        return
      }

      // 获取每个公司的最新财务数据
      const competitorDataPromises = companies.map(async (company) => {
        const { data: financialData, error: financialError } = await supabase
          .from('financial_data')
          .select('*')
          .eq('company_id', company.id)
          .order('period', { ascending: false })
          .limit(1)

        if (financialError || !financialData || financialData.length === 0) {
          return null
        }

        const latest = financialData[0]
        const revenue = latest.revenue || 0
        const grossProfit = latest.gross_profit || 0
        const netIncome = latest.net_income || 0

        return {
          company: company.symbol === 'NTGR' ? 'NETGEAR' : 
                   company.symbol === 'CSCO' ? 'Cisco' : 
                   'HP Enterprise',
          revenue,
          grossProfitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          netProfitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
          marketShare: getMarketShare(company.symbol, revenue),
          roe: calculateROE(netIncome, latest.total_assets || 0),
          roa: calculateROA(netIncome, latest.total_assets || 0)
        }
      })

      const results = await Promise.all(competitorDataPromises)
      const validResults = results.filter(Boolean) as CompetitorData[]

      if (validResults.length === 0) {
        // 如果没有有效数据，显示模拟数据
        const mockData = generateMockCompetitorData()
        setCompetitorData(mockData)
        setError('当前显示的是模拟数据，请运行数据爬虫获取真实数据')
        return
      }

      setCompetitorData(validResults)

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取竞争对手数据失败')
      // 显示模拟数据作为fallback
      const mockData = generateMockCompetitorData()
      setCompetitorData(mockData)
    } finally {
      setLoading(false)
    }
  }

  const getMarketShare = (symbol: string, revenue: number): number => {
    // 模拟市场份额计算
    const marketShares: { [key: string]: number } = {
      'NTGR': 8.5,
      'CSCO': 45.2,
      'HPE': 12.8
    }
    return marketShares[symbol] || 0
  }

  const calculateROE = (netIncome: number, totalAssets: number): number => {
    // 简化的ROE计算，实际需要股东权益数据
    if (totalAssets <= 0) return 0
    return (netIncome / (totalAssets * 0.6)) * 100 // 假设权益占资产60%
  }

  const calculateROA = (netIncome: number, totalAssets: number): number => {
    if (totalAssets <= 0) return 0
    return (netIncome / totalAssets) * 100
  }

  const generateMockCompetitorData = (): CompetitorData[] => {
    return [
      {
        company: 'NETGEAR',
        revenue: 1340000000, // $1.34B
        grossProfitMargin: 28.5,
        netProfitMargin: 8.8,
        marketShare: 8.5,
        roe: 12.3,
        roa: 7.4
      },
      {
        company: 'Cisco',
        revenue: 13800000000, // $13.8B (网络设备部分)
        grossProfitMargin: 64.2,
        netProfitMargin: 21.5,
        marketShare: 45.2,
        roe: 18.7,
        roa: 11.2
      },
      {
        company: 'HP Enterprise',
        revenue: 3200000000, // $3.2B (网络相关)
        grossProfitMargin: 32.1,
        netProfitMargin: 6.8,
        marketShare: 12.8,
        roe: 15.2,
        roa: 5.9
      },
      {
        company: 'Ubiquiti',
        revenue: 688000000, // $688M
        grossProfitMargin: 45.3,
        netProfitMargin: 19.2,
        marketShare: 4.1,
        roe: 22.8,
        roa: 15.3
      }
    ]
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
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      )}

      {/* 核心指标对比 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitionChart
          data={competitorData}
          type="bar"
          title="营收对比分析"
          height={350}
        />
        
        <CompetitionChart
          data={competitorData}
          type="radar"
          title="综合竞争力雷达图"
          height={350}
        />
      </div>

      {/* 趋势对比和详细表格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitionChart
          data={competitorData}
          type="line"
          title="营收趋势对比"
          height={350}
        />
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">竞争优势分析</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">NETGEAR 竞争地位</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• 在网络设备市场排名第4位</p>
                <p>• 消费级路由器细分市场领先</p>
                <p>• 毛利率相对较低，需要优化成本结构</p>
                <p>• ROE表现中等，有提升空间</p>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">主要优势</h4>
              <div className="space-y-2 text-sm text-green-800">
                <p>• 品牌知名度高，产品线丰富</p>
                <p>• 创新能力强，技术更新快</p>
                <p>• 渠道覆盖广泛，销售网络完善</p>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">改进建议</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• 提高产品毛利率，优化定价策略</p>
                <p>• 加强企业级市场拓展</p>
                <p>• 改善运营效率，降低管理费用</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细对比表格 */}
      <CompetitionTable
        data={competitorData}
        title="竞争对手详细对比"
      />
    </div>
  )
}