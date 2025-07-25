'use client'

import { useEffect, useState } from 'react'
import { RevenueChart, RevenuePieChart } from './RevenueChart'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type FinancialData = Database['public']['Tables']['financial_data']['Row']

interface RevenueData {
  period: string
  revenue: number
  grossProfit: number
  netIncome: number
}

export function RevenueAnalysis() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)

      // 获取Netgear公司ID
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('symbol', 'NTGR')
        .single()

      if (companyError || !company) {
        throw new Error('无法找到Netgear公司数据')
      }

      // 获取最近8个季度的财务数据
      const { data: financialData, error: financialError } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', company.id)
        .order('period', { ascending: false })
        .limit(8)

      if (financialError) {
        throw new Error('获取财务数据失败')
      }

      if (!financialData || financialData.length === 0) {
        // 如果没有数据，显示模拟数据
        const mockData = generateMockData()
        setRevenueData(mockData)
        setError('当前显示的是模拟数据，请运行数据爬虫获取真实数据')
        return
      }

      // 转换数据格式并排序（最新的在右边）
      const processedData = financialData
        .reverse()
        .map(item => ({
          period: item.period,
          revenue: item.revenue || 0,
          grossProfit: item.gross_profit || 0,
          netIncome: item.net_income || 0
        }))

      setRevenueData(processedData)

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
      // 显示模拟数据作为fallback
      const mockData = generateMockData()
      setRevenueData(mockData)
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): RevenueData[] => {
    return [
      { period: 'Q1-2023', revenue: 1150000000, grossProfit: 320000000, netIncome: 92000000 },
      { period: 'Q2-2023', revenue: 1220000000, grossProfit: 345000000, netIncome: 98000000 },
      { period: 'Q3-2023', revenue: 1180000000, grossProfit: 330000000, netIncome: 95000000 },
      { period: 'Q4-2023', revenue: 1280000000, grossProfit: 365000000, netIncome: 115000000 },
      { period: 'Q1-2024', revenue: 1200000000, grossProfit: 342000000, netIncome: 96000000 },
      { period: 'Q2-2024', revenue: 1290000000, grossProfit: 368000000, netIncome: 105000000 },
      { period: 'Q3-2024', revenue: 1250000000, grossProfit: 355000000, netIncome: 102000000 },
      { period: 'Q4-2024', revenue: 1340000000, grossProfit: 385000000, netIncome: 118000000 }
    ]
  }

  // 产品线营收占比数据（模拟）
  const productRevenueData = [
    { name: '消费级路由器', value: 680000000, color: '#3b82f6' },
    { name: '企业级设备', value: 420000000, color: '#10b981' },
    { name: '交换机', value: 150000000, color: '#f59e0b' },
    { name: '配件及其他', value: 90000000, color: '#8b5cf6' }
  ]

  // 地区营收分布数据（模拟）
  const regionRevenueData = [
    { name: '北美', value: 750000000, color: '#3b82f6' },
    { name: '欧洲', value: 380000000, color: '#10b981' },
    { name: '亚太', value: 210000000, color: '#f59e0b' }
  ]

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

      {/* 营收趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={revenueData}
          type="line"
          title="营收趋势分析"
          height={350}
        />
        
        <RevenueChart
          data={revenueData}
          type="bar"
          title="季度营收对比"
          height={350}
        />
      </div>

      {/* 利润分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={revenueData}
          type="area"
          title="利润分析趋势"
          height={350}
        />
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">关键财务指标</h3>
          <div className="space-y-4">
            {revenueData.length > 0 && (
              <>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">最新季度营收</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${(revenueData[revenueData.length - 1].revenue / 1e9).toFixed(2)}B
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">毛利率</span>
                  <span className="text-lg font-bold text-green-600">
                    {((revenueData[revenueData.length - 1].grossProfit / revenueData[revenueData.length - 1].revenue) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">净利率</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {((revenueData[revenueData.length - 1].netIncome / revenueData[revenueData.length - 1].revenue) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">年化营收增长</span>
                  <span className="text-lg font-bold text-purple-600">
                    {revenueData.length >= 4 ? 
                      (((revenueData[revenueData.length - 1].revenue / revenueData[revenueData.length - 5].revenue) - 1) * 100).toFixed(1) : 
                      '0.0'
                    }%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 产品线和地区分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenuePieChart
          data={productRevenueData}
          title="产品线营收占比"
          height={300}
        />
        
        <RevenuePieChart
          data={regionRevenueData}
          title="地区营收分布"
          height={300}
        />
      </div>
    </div>
  )
}