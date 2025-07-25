/**
 * 财务数据服务层
 * 统一处理财务数据获取、计算和转换逻辑
 */

import { supabase } from './supabase'
import { Database } from './supabase'

type FinancialData = Database['public']['Tables']['financial_data']['Row']
type Company = Database['public']['Tables']['companies']['Row']

// 财务数据接口定义
export interface ProcessedFinancialData {
  period: string
  year: number
  quarter: number
  revenue: number
  grossProfit: number
  netIncome: number
  totalAssets: number
  operatingExpenses: number
  cashAndEquivalents: number
  totalDebt: number
  
  // 计算指标
  grossProfitMargin: number
  netProfitMargin: number
  roa: number
  roe: number
  debtToAssets: number
  cashRatio: number
}

export interface YearlyFinancialData {
  year: number
  totalRevenue: number
  totalGrossProfit: number
  totalNetIncome: number
  avgGrossProfitMargin: number
  avgNetProfitMargin: number
  yearOverYearGrowth: number
  quarters: ProcessedFinancialData[]
}

export interface CompetitorData {
  company: string
  symbol: string
  revenue: number
  grossProfitMargin: number
  netProfitMargin: number
  marketShare: number
  roe: number
  roa: number
  year: number
  period: string
}

// 地理数据接口
export interface GeographicData {
  region: string
  country?: string
  revenue: number
  percentage: number
  growth: number
  coordinates?: [number, number] // 经纬度
}

class FinancialService {
  
  /**
   * 获取公司的原始财务数据
   */
  async getRawFinancialData(symbol: string, limit: number = 20): Promise<FinancialData[]> {
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('symbol', symbol.toUpperCase())

    if (companyError || !companies || companies.length === 0) {
      throw new Error(`无法找到公司数据: ${symbol}`)
    }

    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .select('*')
      .eq('company_id', companies[0].id)
      .order('period', { ascending: false })
      .limit(limit)

    if (financialError) {
      throw new Error(`获取财务数据失败: ${financialError.message}`)
    }

    return financialData || []
  }

  /**
   * 处理财务数据，添加计算指标
   */
  processFinancialData(rawData: FinancialData[]): ProcessedFinancialData[] {
    return rawData.map(item => {
      const revenue = item.revenue || 0
      const grossProfit = item.gross_profit || 0
      const netIncome = item.net_income || 0
      const totalAssets = item.total_assets || 0
      const totalDebt = item.total_debt || 0
      const cashAndEquivalents = item.cash_and_equivalents || 0

      // 解析期间信息
      const [quarter, year] = item.period.split('-')
      const quarterNum = parseInt(quarter.replace('Q', ''))
      const yearNum = parseInt(year)

      return {
        period: item.period,
        year: yearNum,
        quarter: quarterNum,
        revenue,
        grossProfit,
        netIncome,
        totalAssets,
        operatingExpenses: item.operating_expenses || 0,
        cashAndEquivalents,
        totalDebt,
        
        // 计算财务比率
        grossProfitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netProfitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
        roa: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
        roe: totalAssets > 0 ? (netIncome / (totalAssets * 0.6)) * 100 : 0, // 简化计算
        debtToAssets: totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0,
        cashRatio: totalDebt > 0 ? (cashAndEquivalents / totalDebt) * 100 : 0
      }
    })
  }

  /**
   * 按年度分组财务数据
   */
  groupByYear(data: ProcessedFinancialData[]): YearlyFinancialData[] {
    const yearMap = new Map<number, ProcessedFinancialData[]>()
    
    // 按年度分组
    data.forEach(item => {
      if (!yearMap.has(item.year)) {
        yearMap.set(item.year, [])
      }
      yearMap.get(item.year)!.push(item)
    })

    // 计算年度汇总数据
    const yearlyData: YearlyFinancialData[] = []
    
    for (const [year, quarters] of yearMap.entries()) {
      const totalRevenue = quarters.reduce((sum, q) => sum + q.revenue, 0)
      const totalGrossProfit = quarters.reduce((sum, q) => sum + q.grossProfit, 0)
      const totalNetIncome = quarters.reduce((sum, q) => sum + q.netIncome, 0)
      
      const avgGrossProfitMargin = quarters.length > 0 
        ? quarters.reduce((sum, q) => sum + q.grossProfitMargin, 0) / quarters.length 
        : 0
        
      const avgNetProfitMargin = quarters.length > 0
        ? quarters.reduce((sum, q) => sum + q.netProfitMargin, 0) / quarters.length
        : 0

      yearlyData.push({
        year,
        totalRevenue,
        totalGrossProfit,
        totalNetIncome,
        avgGrossProfitMargin,
        avgNetProfitMargin,
        yearOverYearGrowth: 0, // 将在下面计算
        quarters: quarters.sort((a, b) => a.quarter - b.quarter)
      })
    }

    // 计算同比增长
    yearlyData.sort((a, b) => a.year - b.year)
    for (let i = 1; i < yearlyData.length; i++) {
      const current = yearlyData[i]
      const previous = yearlyData[i - 1]
      
      if (previous.totalRevenue > 0) {
        current.yearOverYearGrowth = ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
      }
    }

    return yearlyData.sort((a, b) => b.year - a.year) // 最新年份在前
  }

  /**
   * 获取同期季度对比数据
   */
  getQuarterlyComparison(data: ProcessedFinancialData[]): Map<number, ProcessedFinancialData[]> {
    const quarterMap = new Map<number, ProcessedFinancialData[]>()
    
    data.forEach(item => {
      if (!quarterMap.has(item.quarter)) {
        quarterMap.set(item.quarter, [])
      }
      quarterMap.get(item.quarter)!.push(item)
    })

    // 按年份排序每个季度的数据
    quarterMap.forEach((quarters, quarter) => {
      quarters.sort((a, b) => b.year - a.year)
    })

    return quarterMap
  }

  /**
   * 获取多个竞争对手的数据
   */
  async getCompetitorData(symbols: string[]): Promise<CompetitorData[]> {
    const competitors: CompetitorData[] = []
    
    for (const symbol of symbols) {
      try {
        const rawData = await this.getRawFinancialData(symbol, 4)
        if (rawData.length > 0) {
          const processedData = this.processFinancialData(rawData)
          const latest = processedData[0]
          
          competitors.push({
            company: this.getCompanyDisplayName(symbol),
            symbol: symbol.toUpperCase(),
            revenue: latest.revenue,
            grossProfitMargin: latest.grossProfitMargin,
            netProfitMargin: latest.netProfitMargin,
            marketShare: this.getMarketShare(symbol), // 需要实现
            roe: latest.roe,
            roa: latest.roa,
            year: latest.year,
            period: latest.period
          })
        }
      } catch (error) {
        console.warn(`无法获取 ${symbol} 的数据:`, error)
      }
    }
    
    return competitors
  }

  /**
   * 获取地理分布数据（模拟数据，后续可替换为真实数据源）
   */
  getGeographicData(revenue: number): GeographicData[] {
    // 基于营收规模的地理分布模拟
    const baseDistribution = [
      { region: '北美', country: 'US', percentage: 0.55, coordinates: [-95.7129, 37.0902] as [number, number] },
      { region: '欧洲', country: 'DE', percentage: 0.28, coordinates: [10.4515, 51.1657] as [number, number] },
      { region: '亚太', country: 'JP', percentage: 0.17, coordinates: [138.2529, 36.2048] as [number, number] }
    ]
    
    return baseDistribution.map(item => ({
      region: item.region,
      country: item.country,
      revenue: Math.round(revenue * item.percentage),
      percentage: item.percentage * 100,
      growth: Math.random() * 20 - 5, // 模拟增长率 -5% 到 15%
      coordinates: item.coordinates
    }))
  }

  /**
   * 工具方法：获取公司显示名称
   */
  private getCompanyDisplayName(symbol: string): string {
    const names: { [key: string]: string } = {
      'NTGR': 'NETGEAR',
      'CSCO': 'Cisco',
      'HPE': 'HP Enterprise',
      'ASUS': 'ASUS'
    }
    return names[symbol.toUpperCase()] || symbol.toUpperCase()
  }

  /**
   * 工具方法：获取市场份额（模拟数据）
   */
  private getMarketShare(symbol: string): number {
    const marketShares: { [key: string]: number } = {
      'NTGR': 8.5,
      'CSCO': 45.2,
      'HPE': 12.8,
      'ASUS': 6.3
    }
    return marketShares[symbol.toUpperCase()] || 0
  }

  /**
   * 生成模拟数据（开发阶段使用）
   */
  generateMockData(): ProcessedFinancialData[] {
    const mockData: ProcessedFinancialData[] = []
    const baseRevenue = 300000000 // 3亿基础营收
    
    // 生成最近8个季度的数据
    for (let year = 2023; year <= 2025; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (year === 2025 && quarter > 1) break // 只到2025年Q1
        
        const revenue = baseRevenue + Math.random() * 100000000 + (year - 2023) * 50000000
        const grossProfit = revenue * (0.25 + Math.random() * 0.1)
        const netIncome = revenue * (0.08 + Math.random() * 0.05)
        const totalAssets = revenue * 3
        
        mockData.push({
          period: `Q${quarter}-${year}`,
          year,
          quarter,
          revenue,
          grossProfit,
          netIncome,
          totalAssets,
          operatingExpenses: revenue * 0.15,
          cashAndEquivalents: totalAssets * 0.1,
          totalDebt: totalAssets * 0.2,
          grossProfitMargin: (grossProfit / revenue) * 100,
          netProfitMargin: (netIncome / revenue) * 100,
          roa: (netIncome / totalAssets) * 100,
          roe: (netIncome / (totalAssets * 0.6)) * 100,
          debtToAssets: 20,
          cashRatio: 50
        })
      }
    }
    
    return mockData.reverse() // 最新的在前
  }
}

// 导出单例
export const financialService = new FinancialService()