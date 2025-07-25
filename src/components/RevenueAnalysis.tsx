'use client'

import { useEffect, useState } from 'react'
import { MultiViewChart } from './MultiViewChart'
import { GeographicChart } from './GeographicChart'
import { RevenueTrendChart } from './revenue/RevenueTrendChart'
import { ProfitabilityAnalysis } from './revenue/ProfitabilityAnalysis'
import { ProductLineRevenue } from './revenue/ProductLineRevenue'
import { financialService, ProcessedFinancialData, YearlyFinancialData, GeographicData } from '@/lib/financial-service'
import { EnhancedFinancialData } from '@/types/financial'

export function RevenueAnalysis() {
  const [quarterlyData, setQuarterlyData] = useState<ProcessedFinancialData[]>([])
  const [yearlyData, setYearlyData] = useState<YearlyFinancialData[]>([])
  const [geographicData, setGeographicData] = useState<GeographicData[]>([])
  const [enhancedData, setEnhancedData] = useState<EnhancedFinancialData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'quarterly' | 'yearly'>('yearly')
  const [selectedProductYear, setSelectedProductYear] = useState(2025)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取财务数据
      let rawData: ProcessedFinancialData[]
      try {
        const data = await financialService.getRawFinancialData('NTGR', 20)
        rawData = financialService.processFinancialData(data)
      } catch (apiError) {
        console.warn('无法获取真实数据，使用模拟数据:', apiError)
        rawData = financialService.generateMockData()
      }

      // 获取增强财务数据
      const enhanced = financialService.generateEnhancedMockData()
      setEnhancedData(enhanced)

      if (rawData.length === 0) {
        throw new Error('无数据可用')
      }

      // 设置季度数据（最近12个季度）
      setQuarterlyData(rawData.slice(0, 12))

      // 按年度分组数据
      const yearly = financialService.groupByYear(rawData)
      setYearlyData(yearly)

      // 获取地理分布数据（基于最新季度营收）
      const latestRevenue = rawData[0]?.revenue || 0
      const geographic = financialService.getGeographicData(latestRevenue)
      setGeographicData(geographic)

      setError(null)

    } catch (err) {
      console.error('获取营收数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      
      // 使用模拟数据作为fallback
      const mockData = financialService.generateMockData()
      setQuarterlyData(mockData.slice(0, 12))
      
      const mockYearly = financialService.groupByYear(mockData)
      setYearlyData(mockYearly)
      
      const mockGeographic = financialService.getGeographicData(mockData[0]?.revenue || 1000000000)
      setGeographicData(mockGeographic)
      
    } finally {
      setLoading(false)
    }
  }

  // 准备图表数据
  const prepareQuarterlyChartData = () => {
    return quarterlyData.slice(0, 8).reverse().map(item => ({
      name: item.period,
      营收: Math.round(item.revenue / 1e6), // 转为百万美元
      毛利润: Math.round(item.grossProfit / 1e6),
      净利润: Math.round(item.netIncome / 1e6)
    }))
  }

  const prepareYearlyChartData = () => {
    return yearlyData.slice(0, 3).reverse().map(item => ({
      name: `${item.year}年`,
      营收: Math.round(item.totalRevenue / 1e6),
      毛利润: Math.round(item.totalGrossProfit / 1e6),
      净利润: Math.round(item.totalNetIncome / 1e6)
    }))
  }

  const prepareProfitabilityData = () => {
    if (viewMode === 'yearly') {
      return yearlyData.slice(0, 3).reverse().map(item => ({
        name: `${item.year}年`,
        毛利率: item.avgGrossProfitMargin,
        净利率: item.avgNetProfitMargin,
        资产回报率: 0 // 年度数据暂时不计算ROA
      }))
    } else {
      return quarterlyData.slice(0, 8).reverse().map(item => ({
        name: item.period,
        毛利率: item.grossProfitMargin,
        净利率: item.netProfitMargin,
        资产回报率: item.roa
      }))
    }
  }

  // 准备RevenueTrendChart数据
  const prepareRevenueTrendData = () => {
    return enhancedData.slice(0, 8).reverse().map(item => ({
      period: item.period,
      revenue: item.revenue,
      grossProfit: item.grossProfit,
      netIncome: item.netIncome,
      revenueGrowth: 0, // 暂时设为0，可以后续计算
      events: item.milestoneEvents.map(event => ({
        title: event.title,
        description: event.description,
        impact: event.impact
      }))
    }))
  }

  // 准备ProfitabilityAnalysis数据
  const prepareProfitabilityTrendData = () => {
    return enhancedData.slice(0, 8).reverse().map(item => ({
      period: item.period,
      grossProfitMargin: item.grossProfitMargin,
      netProfitMargin: item.netProfitMargin,
      operatingMargin: item.grossProfitMargin - 5, // 模拟经营利润率
      roa: item.roa,
      events: item.milestoneEvents.map(event => ({
        title: event.title,
        description: event.description,
        impact: event.impact
      }))
    }))
  }

  // 准备产品线数据
  const prepareProductLineData = () => {
    const productData = financialService.generateProductLineData(selectedProductYear)
    return productData.level1
  }

  // 产品线营收占比数据（模拟，保留作为备用）
  const productRevenueData = [
    { name: '消费级路由器', value: 680 },
    { name: '企业级设备', value: 420 },
    { name: '交换机', value: 150 },
    { name: '配件及其他', value: 90 }
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

      {/* 视图模式切换 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">营收分析</h1>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'yearly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            年度视图
          </button>
          <button
            onClick={() => setViewMode('quarterly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'quarterly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            季度视图
          </button>
        </div>
      </div>

      {/* 营收趋势分析 - 使用增强组件 */}
      <div className="space-y-6">
        <RevenueTrendChart
          data={prepareRevenueTrendData()}
          title="营收趋势分析"
          height={400}
          showControls={true}
        />
        
        <ProfitabilityAnalysis
          data={prepareProfitabilityTrendData()}
          title="盈利能力分析"
          height={400}
          showControls={true}
        />
      </div>

      {/* 关键财务指标总览 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {viewMode === 'yearly' ? '年度' : '季度'}关键指标
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(viewMode === 'yearly' ? yearlyData[0] : quarterlyData[0]) && (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">
                  {viewMode === 'yearly' ? '年度营收' : '季度营收'}
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${viewMode === 'yearly' 
                    ? (yearlyData[0].totalRevenue / 1e9).toFixed(2) + 'B'
                    : (quarterlyData[0].revenue / 1e6).toFixed(0) + 'M'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {viewMode === 'yearly' 
                    ? `同比增长 ${yearlyData[0].yearOverYearGrowth.toFixed(1)}%`
                    : `环比增长 ${quarterlyData[1] ? (((quarterlyData[0].revenue - quarterlyData[1].revenue) / quarterlyData[1].revenue) * 100).toFixed(1) : '0.0'}%`
                  }
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">平均毛利率</div>
                <div className="text-2xl font-bold text-green-600">
                  {viewMode === 'yearly' 
                    ? yearlyData[0].avgGrossProfitMargin.toFixed(1)
                    : quarterlyData[0].grossProfitMargin.toFixed(1)
                  }%
                </div>
                <div className="text-sm text-gray-600">毛利润占营收比例</div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">平均净利率</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {viewMode === 'yearly' 
                    ? yearlyData[0].avgNetProfitMargin.toFixed(1)
                    : quarterlyData[0].netProfitMargin.toFixed(1)
                  }%
                </div>
                <div className="text-sm text-gray-600">净利润占营收比例</div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">资产回报率</div>
                <div className="text-2xl font-bold text-purple-600">
                  {quarterlyData[0].roa.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">ROA</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 产品线和地区分析 */}
      <div className="space-y-6">
        <ProductLineRevenue
          data={prepareProductLineData()}
          title="产品线营收分析"
          height={450}
          years={[2023, 2024, 2025]}
          selectedYear={selectedProductYear}
          onYearChange={setSelectedProductYear}
          showControls={true}
        />
        
        <GeographicChart
          data={geographicData}
          title="地区营收分布"
          height={300}
        />
      </div>
    </div>
  )
}