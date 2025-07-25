'use client'

import { useEffect, useState } from 'react'
import { KPICard } from './KPICard'
import { financialService, ProcessedFinancialData, YearlyFinancialData } from '@/lib/financial-service'

interface KPIData {
  currentQuarter: {
    revenue: number
    grossProfitMargin: number
    netProfitMargin: number
    roa: number
    roe: number
  }
  currentYear: {
    totalRevenue: number
    yearOverYearGrowth: number
    avgGrossProfitMargin: number
    avgNetProfitMargin: number
  }
  quarterOverQuarter: {
    revenueGrowth: number
    profitabilityChange: number
  }
}

export function DashboardOverview() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchKPIData()
  }, [])

  const fetchKPIData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取财务数据
      let rawData: ProcessedFinancialData[]
      try {
        const data = await financialService.getRawFinancialData('NTGR', 12)
        rawData = financialService.processFinancialData(data)
      } catch (apiError) {
        console.warn('无法获取真实数据，使用模拟数据:', apiError)
        rawData = financialService.generateMockData()
      }

      if (rawData.length === 0) {
        throw new Error('无数据可用')
      }

      // 按年度分组
      const yearlyData = financialService.groupByYear(rawData)
      const currentYear = yearlyData[0] // 最新年份
      const previousYear = yearlyData[1] // 上一年

      // 获取最新季度数据
      const latestQuarter = rawData[0]
      const previousQuarter = rawData[1]

      // 计算季度环比增长
      const quarterlyRevenueGrowth = previousQuarter && previousQuarter.revenue > 0
        ? ((latestQuarter.revenue - previousQuarter.revenue) / previousQuarter.revenue) * 100
        : 0

      const profitabilityChange = previousQuarter
        ? latestQuarter.netProfitMargin - previousQuarter.netProfitMargin
        : 0

      const kpiResult: KPIData = {
        currentQuarter: {
          revenue: latestQuarter.revenue,
          grossProfitMargin: latestQuarter.grossProfitMargin,
          netProfitMargin: latestQuarter.netProfitMargin,
          roa: latestQuarter.roa,
          roe: latestQuarter.roe
        },
        currentYear: {
          totalRevenue: currentYear.totalRevenue,
          yearOverYearGrowth: currentYear.yearOverYearGrowth,
          avgGrossProfitMargin: currentYear.avgGrossProfitMargin,
          avgNetProfitMargin: currentYear.avgNetProfitMargin
        },
        quarterOverQuarter: {
          revenueGrowth: quarterlyRevenueGrowth,
          profitabilityChange: profitabilityChange
        }
      }

      setKpiData(kpiResult)
      setError(null)

    } catch (err) {
      console.error('获取KPI数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
      
      // 使用模拟数据作为fallback
      const mockData = financialService.generateMockData()
      const yearlyData = financialService.groupByYear(mockData)
      const currentYear = yearlyData[0]
      const latestQuarter = mockData[0]
      
      setKpiData({
        currentQuarter: {
          revenue: latestQuarter.revenue,
          grossProfitMargin: latestQuarter.grossProfitMargin,
          netProfitMargin: latestQuarter.netProfitMargin,
          roa: latestQuarter.roa,
          roe: latestQuarter.roe
        },
        currentYear: {
          totalRevenue: currentYear.totalRevenue,
          yearOverYearGrowth: currentYear.yearOverYearGrowth,
          avgGrossProfitMargin: currentYear.avgGrossProfitMargin,
          avgNetProfitMargin: currentYear.avgNetProfitMargin
        },
        quarterOverQuarter: {
          revenueGrowth: 3.2,
          profitabilityChange: 0.8
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!kpiData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">无法加载KPI数据</p>
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
      
      {/* 年度表现总览 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">年度表现总览</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="年度营收"
            value={kpiData.currentYear.totalRevenue}
            unit=""
            change={kpiData.currentYear.yearOverYearGrowth}
            trend={kpiData.currentYear.yearOverYearGrowth > 0 ? 'up' : kpiData.currentYear.yearOverYearGrowth < 0 ? 'down' : 'neutral'}
            description="同比增长"
          />
          
          <KPICard
            title="平均毛利率"
            value={kpiData.currentYear.avgGrossProfitMargin.toFixed(1)}
            unit="%"
            trend={kpiData.currentYear.avgGrossProfitMargin > 25 ? 'up' : 'down'}
            description="年度平均水平"
          />
          
          <KPICard
            title="平均净利率"
            value={kpiData.currentYear.avgNetProfitMargin.toFixed(1)}
            unit="%"
            trend={kpiData.currentYear.avgNetProfitMargin > 8 ? 'up' : 'down'}
            description="年度平均水平"
          />
          
          <KPICard
            title="增长势头"
            value={kpiData.currentYear.yearOverYearGrowth.toFixed(1)}
            unit="%"
            trend={kpiData.currentYear.yearOverYearGrowth > 0 ? 'up' : kpiData.currentYear.yearOverYearGrowth < 0 ? 'down' : 'neutral'}
            description="年度同比增长"
          />
        </div>
      </div>
    </div>
  )
}