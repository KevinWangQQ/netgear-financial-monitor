'use client'

import { useEffect, useState } from 'react'
import { Card, Alert, Row, Col } from 'antd'
import { BarChartOutlined, DollarOutlined, RiseOutlined, CalendarOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'

// 导入现有组件
import { KPICard } from './KPICard'
import { RevenueTrendChart } from './revenue/RevenueTrendChart'
import { ProfitabilityAnalysis } from './revenue/ProfitabilityAnalysis'
import { ProductLineRevenue } from './revenue/ProductLineRevenue'
import { GeographicChart } from './GeographicChart'
import { MilestoneEventsChart } from './MilestoneEventsChart'

// 导入数据服务
import { financialService, ProcessedFinancialData, YearlyFinancialData, GeographicData } from '@/lib/financial-service'
import { EnhancedFinancialData } from '@/types/financial'

interface KPIData {
  currentQuarter: {
    revenue: number
    grossProfitMargin: number
    netProfitMargin: number
    roa: number
    roe: number
    period: string
  }
  currentYear: {
    totalRevenue: number
    yearOverYearGrowth: number
    avgGrossProfitMargin: number
    avgNetProfitMargin: number
    year: number
  }
  quarterOverQuarter: {
    revenueGrowth: number
    profitabilityChange: number
  }
  detailedGrowth: {
    revenue: { yoy: number; qoq: number }
    grossProfitMargin: { yoy: number; qoq: number }
    netProfitMargin: { yoy: number; qoq: number }
    roa: { yoy: number; qoq: number }
    roe: { yoy: number; qoq: number }
  }
  yearlyGrowth: {
    revenue: { yoy: number; qoq: number }
    grossProfitMargin: { yoy: number; qoq: number }
    netProfitMargin: { yoy: number; qoq: number }
  }
}

export function FinancialDataModule() {
  const [geographicData, setGeographicData] = useState<GeographicData[]>([])
  const [enhancedData, setEnhancedData] = useState<EnhancedFinancialData[]>([])
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProductYear, setSelectedProductYear] = useState(2025)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
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

      // 按年度分组数据
      const yearly = financialService.groupByYear(rawData)

      // 获取地理分布数据（基于最新季度营收）
      const latestRevenue = rawData[0]?.revenue || 0
      const geographic = financialService.getGeographicData(latestRevenue)
      setGeographicData(geographic)

      // 计算KPI数据
      const currentYear = yearly[0] // 最新年份
      const latestQuarter = rawData[0] // 最新季度
      const previousQuarter = rawData[1] // 上一季度

      // 使用新的精确增长率计算方法
      const revenueGrowth = financialService.calculateGrowthMetrics(rawData)
      const grossProfitMarginChanges = financialService.calculateMetricChanges(rawData, 'grossProfitMargin')
      const netProfitMarginChanges = financialService.calculateMetricChanges(rawData, 'netProfitMargin')
      const roaChanges = financialService.calculateMetricChanges(rawData, 'roa')
      const roeChanges = financialService.calculateMetricChanges(rawData, 'roe')

      // 计算年度数据的同比增长
      const previousYear = yearly[1] // 上一年度数据
      const yearlyRevenueGrowth = previousYear && previousYear.totalRevenue > 0
        ? ((currentYear.totalRevenue - previousYear.totalRevenue) / previousYear.totalRevenue) * 100
        : currentYear.yearOverYearGrowth

      const yearlyGrossProfitMarginGrowth = previousYear
        ? currentYear.avgGrossProfitMargin - previousYear.avgGrossProfitMargin
        : 0

      const yearlyNetProfitMarginGrowth = previousYear
        ? currentYear.avgNetProfitMargin - previousYear.avgNetProfitMargin
        : 0

      const kpiResult: KPIData = {
        currentQuarter: {
          revenue: latestQuarter.revenue,
          grossProfitMargin: latestQuarter.grossProfitMargin,
          netProfitMargin: latestQuarter.netProfitMargin,
          roa: latestQuarter.roa,
          roe: latestQuarter.roe,
          period: latestQuarter.period
        },
        currentYear: {
          totalRevenue: currentYear.totalRevenue,
          yearOverYearGrowth: currentYear.yearOverYearGrowth,
          avgGrossProfitMargin: currentYear.avgGrossProfitMargin,
          avgNetProfitMargin: currentYear.avgNetProfitMargin,
          year: currentYear.year
        },
        quarterOverQuarter: {
          revenueGrowth: revenueGrowth.qoq,
          profitabilityChange: netProfitMarginChanges.qoq
        },
        // 新增详细的增长数据
        detailedGrowth: {
          revenue: revenueGrowth,
          grossProfitMargin: grossProfitMarginChanges,
          netProfitMargin: netProfitMarginChanges,
          roa: roaChanges,
          roe: roeChanges
        },
        // 年度对比数据
        yearlyGrowth: {
          revenue: { yoy: yearlyRevenueGrowth, qoq: 0 }, // 年度数据没有环比
          grossProfitMargin: { yoy: yearlyGrossProfitMarginGrowth, qoq: 0 },
          netProfitMargin: { yoy: yearlyNetProfitMarginGrowth, qoq: 0 }
        }
      }

      setKpiData(kpiResult)
      setError(null)

    } catch (err) {
      console.error('获取财务数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      
      // 使用模拟数据作为fallback
      const mockData = financialService.generateMockData()
      const mockYearly = financialService.groupByYear(mockData)
      const mockGeographic = financialService.getGeographicData(mockData[0]?.revenue || 1000000000)
      setGeographicData(mockGeographic)

      // 设置mock KPI数据
      const mockCurrentYear = mockYearly[0]
      const mockLatestQuarter = mockData[0]
      
      setKpiData({
        currentQuarter: {
          revenue: mockLatestQuarter.revenue,
          grossProfitMargin: mockLatestQuarter.grossProfitMargin,
          netProfitMargin: mockLatestQuarter.netProfitMargin,
          roa: mockLatestQuarter.roa,
          roe: mockLatestQuarter.roe,
          period: mockLatestQuarter.period
        },
        currentYear: {
          totalRevenue: mockCurrentYear.totalRevenue,
          yearOverYearGrowth: mockCurrentYear.yearOverYearGrowth,
          avgGrossProfitMargin: mockCurrentYear.avgGrossProfitMargin,
          avgNetProfitMargin: mockCurrentYear.avgNetProfitMargin,
          year: mockCurrentYear.year
        },
        quarterOverQuarter: {
          revenueGrowth: 3.2,
          profitabilityChange: 0.8
        },
        detailedGrowth: {
          revenue: { yoy: 8.5, qoq: 3.2 },
          grossProfitMargin: { yoy: 2.1, qoq: 0.5 },
          netProfitMargin: { yoy: 1.8, qoq: 0.8 },
          roa: { yoy: 0.9, qoq: 0.3 },
          roe: { yoy: 1.2, qoq: 0.4 }
        },
        yearlyGrowth: {
          revenue: { yoy: 8.5, qoq: 0 },
          grossProfitMargin: { yoy: 2.1, qoq: 0 },
          netProfitMargin: { yoy: 1.8, qoq: 0 }
        }
      })
      
    } finally {
      setLoading(false)
    }
  }

  // 准备图表数据
  const prepareRevenueTrendData = () => {
    return enhancedData.slice(0, 8).reverse().map(item => ({
      period: item.period,
      revenue: item.revenue,
      grossProfit: item.grossProfit,
      netIncome: item.netIncome,
      revenueGrowth: 0, // 可以后续计算
      events: item.milestoneEvents.map(event => ({
        title: event.title,
        description: event.description,
        impact: event.impact
      }))
    }))
  }

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

  const prepareProductLineData = () => {
    const productData = financialService.generateProductLineData(selectedProductYear)
    return productData.level1.map(item => ({
      name: item.name,
      revenue: item.revenue,
      profitMargin: item.children.reduce((sum, child) => sum + child.profitMargin, 0) / item.children.length,
      growth: item.children.reduce((sum, child) => sum + child.growth, 0) / item.children.length,
      children: item.children
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <Row gutter={[16, 16]}>
          {[...Array(4)].map((_, index) => (
            <Col key={index} xs={24} lg={12}>
              <Card loading style={{ height: '300px' }} />
            </Col>
          ))}
        </Row>
      </div>
    )
  }

  if (!kpiData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">无法加载财务数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <Alert
          message="数据加载警告"
          description={error}
          type="warning"
          showIcon
          closable
        />
      )}

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChartOutlined className="text-2xl text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">财务数据</h1>
        </div>
        <div className="text-sm text-gray-500 flex items-center space-x-2">
          <CalendarOutlined />
          <span>数据更新至 {kpiData.currentQuarter.period}</span>
        </div>
      </div>
      
      {/* 年度表现总览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <DollarOutlined className="text-green-600" />
            <span>年度表现总览</span>
          </h2>
          <span className="text-sm text-gray-500">{kpiData.currentYear.year}年度数据</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="年度营收"
            value={kpiData.currentYear.totalRevenue}
            unit=""
            yearOverYear={kpiData.yearlyGrowth.revenue.yoy}
            trend={kpiData.yearlyGrowth.revenue.yoy > 0 ? 'up' : kpiData.yearlyGrowth.revenue.yoy < 0 ? 'down' : 'neutral'}
            description="年度表现"
            period={`${kpiData.currentYear.year}年`}
          />
          
          <KPICard
            title="平均毛利率"
            value={kpiData.currentYear.avgGrossProfitMargin.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.yearlyGrowth.grossProfitMargin.yoy}
            trend={kpiData.currentYear.avgGrossProfitMargin > 25 ? 'up' : 'down'}
            description="盈利能力"
            period={`${kpiData.currentYear.year}年`}
          />
          
          <KPICard
            title="平均净利率"
            value={kpiData.currentYear.avgNetProfitMargin.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.yearlyGrowth.netProfitMargin.yoy}
            trend={kpiData.currentYear.avgNetProfitMargin > 8 ? 'up' : 'down'}
            description="盈利水平"
            period={`${kpiData.currentYear.year}年`}
          />
          
          <KPICard
            title="增长势头"
            value={kpiData.currentYear.yearOverYearGrowth.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.yearlyGrowth.revenue.yoy}
            trend={kpiData.currentYear.yearOverYearGrowth > 0 ? 'up' : kpiData.currentYear.yearOverYearGrowth < 0 ? 'down' : 'neutral'}
            description="同比增长"
            period={`${kpiData.currentYear.year}年`}
          />
        </div>
      </motion.div>

      {/* 最新季度总览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <RiseOutlined className="text-blue-600" />
            <span>最新季度总览</span>
          </h2>
          <span className="text-sm text-gray-500">{kpiData.currentQuarter.period}季度数据</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="季度营收"
            value={kpiData.currentQuarter.revenue}
            unit=""
            yearOverYear={kpiData.detailedGrowth.revenue.yoy}
            quarterOverQuarter={kpiData.detailedGrowth.revenue.qoq}
            trend={kpiData.detailedGrowth.revenue.qoq > 0 ? 'up' : kpiData.detailedGrowth.revenue.qoq < 0 ? 'down' : 'neutral'}
            description="收入规模"
            period={kpiData.currentQuarter.period}
          />
          
          <KPICard
            title="毛利率"
            value={kpiData.currentQuarter.grossProfitMargin.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.detailedGrowth.grossProfitMargin.yoy}
            quarterOverQuarter={kpiData.detailedGrowth.grossProfitMargin.qoq}
            trend={kpiData.currentQuarter.grossProfitMargin > 25 ? 'up' : 'down'}
            description="盈利能力"
            period={kpiData.currentQuarter.period}
          />
          
          <KPICard
            title="净利率"
            value={kpiData.currentQuarter.netProfitMargin.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.detailedGrowth.netProfitMargin.yoy}
            quarterOverQuarter={kpiData.detailedGrowth.netProfitMargin.qoq}
            trend={kpiData.currentQuarter.netProfitMargin > 8 ? 'up' : 'down'}
            description="净利水平"
            period={kpiData.currentQuarter.period}
          />
          
          <KPICard
            title="资产回报率"  
            value={kpiData.currentQuarter.roa.toFixed(1)}
            unit="%"
            yearOverYear={kpiData.detailedGrowth.roa.yoy}
            quarterOverQuarter={kpiData.detailedGrowth.roa.qoq}
            trend={kpiData.currentQuarter.roa > 5 ? 'up' : 'down'}
            description="ROA表现"
            period={kpiData.currentQuarter.period}
          />
        </div>
      </motion.div>

      {/* 营收趋势分析 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
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
      </motion.div>

      {/* 产品线营收分析 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ProductLineRevenue
          data={prepareProductLineData()}
          title="产品线营收分析"
          height={450}
          years={[2023, 2024, 2025]}
          selectedYear={selectedProductYear}
          onYearChange={setSelectedProductYear}
          showControls={true}
        />
      </motion.div>

      {/* 重要事件时间轴 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <MilestoneEventsChart
          events={enhancedData.length > 0 ? enhancedData
            .slice(0, 12) // 最近12个季度（3年）
            .flatMap(item => item.milestoneEvents)
            .map(event => ({
              ...event,
              type: event.type === 'milestone' ? 'financial_milestone' : 
                    event.type === 'product' ? 'product_launch' : 
                    event.type === 'market' ? 'market_expansion' : 
                    'strategic_partnership' as const
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 按时间排序
          : []}
          title="重要事件时间轴（最近三年）"
          height={300}
          isHorizontal={true}
        />
      </motion.div>
      
      {/* 地区营收分布 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GeographicChart
          data={geographicData}
          title="地区营收分布"
          height={300}
        />
      </motion.div>
    </div>
  )
}