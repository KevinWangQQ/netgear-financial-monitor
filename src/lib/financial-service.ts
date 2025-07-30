/**
 * 财务数据服务层
 * 统一处理财务数据获取、计算和转换逻辑
 */

import { supabase } from './supabase'
import { Database } from './supabase'
import { databaseService } from './database-service'
import { sortByQuarter, parseQuarter, formatQuarterDisplay } from './date-utils'
import { 
  EnhancedFinancialData, 
  SoftwareMetrics, 
  OperationalMetrics, 
  FinancialEvent,
  ProductLineRevenue,
  ProductHierarchy,
  EnhancedGeographicData,
  DataTurningPoint,
  CashFlowAnalysis,
  BalanceSheetAnalysis
} from '@/types/financial'

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
  marketSize?: number // 市场规模
}

class FinancialService {
  
  /**
   * 从数据库获取产品线营收数据
   */
  async getProductLineRevenueFromDB(symbol: string, year?: number): Promise<ProductHierarchy | null> {
    try {
      const data = await databaseService.getProductLineRevenue(symbol, year)
      
      if (!data || data.length === 0) {
        console.warn(`没有找到${symbol}的产品线数据`)
        return null
      }

      // 按层级分组数据
      const level1Categories = data.filter(item => item.category_level === 1)
      const level2Products = data.filter(item => item.category_level === 2)

      return {
        level1: level1Categories.map(category => ({
          name: category.category_name,
          revenue: category.revenue,
          children: level2Products
            .filter(product => product.category_name.includes(category.category_name.substring(0, 2))) // 简单匹配
            .map(product => ({
              name: product.category_name,
              revenue: product.revenue,
              profitMargin: product.gross_margin || 25,
              growth: product.yoy_growth || 0
            }))
        }))
      }
    } catch (error) {
      console.error('从数据库获取产品线数据失败:', error)
      return null
    }
  }

  /**
   * 从数据库获取地理分布数据
   */
  async getGeographicDataFromDB(symbol: string, year?: number): Promise<GeographicData[]> {
    try {
      const data = await databaseService.getGeographicRevenue(symbol, year)
      
      if (!data || data.length === 0) {
        console.warn(`没有找到${symbol}的地理分布数据`)
        return []
      }

      return data.map(item => ({
        region: item.region,
        country: item.country || undefined,
        revenue: item.revenue,
        percentage: item.revenue_percentage || 0,
        growth: item.yoy_growth || 0,
        coordinates: item.latitude && item.longitude 
          ? [item.longitude, item.latitude] as [number, number]
          : undefined,
        marketSize: item.market_size || undefined
      }))
    } catch (error) {
      console.error('从数据库获取地理分布数据失败:', error)
      return []
    }
  }

  /**
   * 从数据库获取里程碑事件数据
   */
  async getMilestoneEventsFromDB(symbol: string, startDate?: string, endDate?: string): Promise<FinancialEvent[]> {
    try {
      const data = await databaseService.getMilestoneEvents(symbol, startDate, endDate)
      
      if (!data || data.length === 0) {
        console.warn(`没有找到${symbol}的里程碑事件数据`)
        return []
      }

      return data.map(event => ({
        id: event.id,
        date: event.event_date,
        type: event.event_type,
        title: event.title,
        description: event.description || '',
        impact: event.impact_type as 'positive' | 'negative' | 'neutral',
        impactLevel: event.impact_level,
        relatedMetrics: event.related_metrics || []
      }))
    } catch (error) {
      console.error('从数据库获取里程碑事件失败:', error)
      return []
    }
  }

  /**
   * 检查数据库连接状态
   */
  async checkDatabaseAvailability(): Promise<boolean> {
    return await databaseService.checkDatabaseConnection()
  }

  /**
   * 获取公司的原始财务数据
   * 数据获取优先级：Alpha Vantage API > Supabase数据库 > 报错
   */
  async getRawFinancialData(symbol: string, limit: number = 20): Promise<FinancialData[]> {
    console.log(`📊 开始获取${symbol}的真实财务数据...`)
    
    // 1. 优先尝试Alpha Vantage API
    try {
      console.log('🔄 尝试从Alpha Vantage API获取数据...')
      const api = new AlphaVantageAPI()
      const data = await api.getQuarterlyEarnings(symbol)
      if (data && data.length > 0) {
        console.log(`✅ Alpha Vantage成功：获取到${data.length}条真实财务数据`)
        return data.slice(0, limit)
      }
    } catch (error) {
      console.warn('⚠️  Alpha Vantage API获取失败:', error)
    }
    
    // 2. 回退到Supabase数据库
    try {
      console.log('🔄 回退到Supabase数据库...')
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

      if (financialData && financialData.length > 0) {
        console.log(`✅ 数据库成功：获取到${financialData.length}条记录`)
        return financialData
      }
    } catch (dbError) {
      console.warn('⚠️  数据库获取失败:', dbError)
    }
    
    throw new Error(`❌ 无法从任何数据源获取${symbol}的真实财务数据。请检查：
    1. Alpha Vantage API Key是否有效
    2. Supabase数据库连接是否正常
    3. 股票代码${symbol}是否正确`)
  }

  /**
   * 处理财务数据，添加计算指标
   */
  processFinancialData(rawData: FinancialData[]): ProcessedFinancialData[] {
    const processed = rawData.map(item => {
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

    // 按时间顺序排序（最新的在前）
    return sortByQuarter(processed, false)
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

    // 计算同期对比增长（避免不完整年度数据的问题）
    yearlyData.sort((a, b) => a.year - b.year)
    for (let i = 1; i < yearlyData.length; i++) {
      const current = yearlyData[i]
      const previous = yearlyData[i - 1]
      
      // 获取当前年度已有的季度数
      const currentQuarters = current.quarters.length
      
      // 如果当前年度不足4个季度，使用同期季度对比
      if (currentQuarters < 4) {
        // 获取去年同期的季度数据
        const previousSamePeriod = previous.quarters.slice(0, currentQuarters)
        const previousSamePeriodRevenue = previousSamePeriod.reduce((sum, q) => sum + q.revenue, 0)
        
        if (previousSamePeriodRevenue > 0) {
          current.yearOverYearGrowth = ((current.totalRevenue - previousSamePeriodRevenue) / previousSamePeriodRevenue) * 100
        }
      } else {
        // 完整年度数据，使用全年对比
        if (previous.totalRevenue > 0) {
          current.yearOverYearGrowth = ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
        }
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

    // 按时间排序每个季度的数据（最新的在前）
    quarterMap.forEach((quarters, quarter) => {
      quarters.sort((a, b) => b.year - a.year)
    })

    return quarterMap
  }

  /**
   * 计算精确的同比和环比增长率
   */
  calculateGrowthMetrics(data: ProcessedFinancialData[]) {
    if (data.length < 2) return { yoy: 0, qoq: 0 }
    
    const latest = data[0] // 最新季度
    const previousQuarter = data[1] // 上一季度
    
    // 查找去年同期数据
    const sameQuarterLastYear = data.find(
      item => item.quarter === latest.quarter && item.year === latest.year - 1
    )
    
    // 计算环比增长率 (Quarter over Quarter)
    const qoq = previousQuarter && previousQuarter.revenue > 0
      ? ((latest.revenue - previousQuarter.revenue) / previousQuarter.revenue) * 100
      : 0
    
    // 计算同比增长率 (Year over Year)  
    const yoy = sameQuarterLastYear && sameQuarterLastYear.revenue > 0
      ? ((latest.revenue - sameQuarterLastYear.revenue) / sameQuarterLastYear.revenue) * 100
      : 0
    
    return { yoy, qoq }
  }

  /**
   * 计算指标的同比和环比变化
   */
  calculateMetricChanges(data: ProcessedFinancialData[], metric: keyof ProcessedFinancialData) {
    if (data.length < 2) return { yoy: 0, qoq: 0 }
    
    const latest = data[0]
    const previousQuarter = data[1]
    
    const sameQuarterLastYear = data.find(
      item => item.quarter === latest.quarter && item.year === latest.year - 1
    )
    
    const currentValue = latest[metric] as number
    const previousQuarterValue = previousQuarter[metric] as number
    const sameQuarterLastYearValue = sameQuarterLastYear?.[metric] as number
    
    const qoq = previousQuarterValue !== 0 && previousQuarterValue !== undefined
      ? ((currentValue - previousQuarterValue) / Math.abs(previousQuarterValue)) * 100
      : 0
    
    const yoy = sameQuarterLastYearValue !== 0 && sameQuarterLastYearValue !== undefined
      ? ((currentValue - sameQuarterLastYearValue) / Math.abs(sameQuarterLastYearValue)) * 100
      : 0
    
    return { yoy, qoq }
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
   * 获取地理分布数据（结合真实市场数据的模拟）
   */
  getGeographicData(revenue: number): GeographicData[] {
    // 基于网络设备行业真实市场分布的估算
    const baseDistribution = [
      { 
        region: '北美', 
        country: 'US', 
        percentage: 0.55,
        coordinates: [-95.7129, 37.0902] as [number, number],
        marketSize: 12500000000, // 12.5B美元
        growth: 3.2
      },
      { 
        region: '欧洲', 
        country: 'DE', 
        percentage: 0.28,
        coordinates: [10.4515, 51.1657] as [number, number],
        marketSize: 8200000000, // 8.2B美元
        growth: 2.8
      },
      { 
        region: '亚太', 
        country: 'JP', 
        percentage: 0.17,
        coordinates: [138.2529, 36.2048] as [number, number],
        marketSize: 5800000000, // 5.8B美元
        growth: 5.1
      }
    ]
    
    // 确保revenue不为0或undefined
    const safeRevenue = revenue || 300000000 // 默认3亿美元
    
    return baseDistribution.map(item => ({
      region: item.region,
      country: item.country,
      revenue: Math.round(safeRevenue * item.percentage),
      percentage: Math.round(item.percentage * 100 * 10) / 10, // 保留1位小数
      growth: item.growth + (Math.random() - 0.5) * 2, // 在基础增长率上增加小幅波动
      coordinates: item.coordinates,
      marketSize: item.marketSize // 添加市场规模数据
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
   * 生成软件业务指标
   */
  private generateSoftwareMetrics(revenue: number, quarter: number, year: number): SoftwareMetrics {
    // 假设软件收入占总收入的30-50%
    const softwareRevenue = revenue * (0.3 + Math.random() * 0.2)
    const mrr = softwareRevenue / 12
    
    return {
      arr: softwareRevenue,
      mrr,
      cac: 500 + Math.random() * 1000,
      ltv: 3000 + Math.random() * 2000,
      churnRate: 0.02 + Math.random() * 0.03, // 2-5%
      nrr: 1.05 + Math.random() * 0.15, // 105-120%
      totalSubscribers: Math.floor(revenue / 1000000 * 100), // 基于营收规模估算
      newSubscribers: Math.floor(Math.random() * 100),
      upgrades: Math.floor(Math.random() * 50),
      downgrades: Math.floor(Math.random() * 20),
      ltvCacRatio: 0, // 将在后面计算
      cacPaybackPeriod: 0, // 将在后面计算
      healthScore: 0 // 将在后面计算
    }
  }

  /**
   * 生成运营效率指标
   */
  private generateOperationalMetrics(revenue: number): OperationalMetrics {
    return {
      assetTurnover: 1.2 + Math.random() * 0.8,
      receivablesTurnover: 6 + Math.random() * 4,
      inventoryTurnover: 8 + Math.random() * 4,
      salesExpenseRatio: 0.15 + Math.random() * 0.05,
      adminExpenseRatio: 0.08 + Math.random() * 0.03,
      rdExpenseRatio: 0.12 + Math.random() * 0.05,
      operatingCashFlow: revenue * (0.12 + Math.random() * 0.08),
      investingCashFlow: revenue * (-0.05 - Math.random() * 0.03),
      financingCashFlow: revenue * (-0.02 + Math.random() * 0.04),
      freeCashFlow: revenue * (0.08 + Math.random() * 0.06)
    }
  }

  /**
   * 生成里程碑事件
   */
  private generateMilestoneEvents(period: string, year: number, quarter: number): FinancialEvent[] {
    const events: FinancialEvent[] = []
    
    // 每个季度都生成2-3个事件，确保时间轴有足够内容
    const quarterEvents = [
      // Q1 事件
      {
        quarter: 1,
        events: [
          {
            type: 'financial' as const,
            title: '发布全年业绩指引',
            description: `${year}年全年营收指引上调至${Math.floor(Math.random() * 100) + 900}M-${Math.floor(Math.random() * 100) + 1000}M美元`,
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-01-15`
          },
          {
            type: 'product_launch' as const,
            title: '年度产品规划发布',
            description: '公布新一年的产品路线图，重点关注5G和Wi-Fi 7技术',
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-02-28`
          },
          {
            type: 'market_expansion' as const,
            title: '拓展欧洲市场',
            description: '与欧洲主要运营商签署战略合作协议，扩大市场份额',
            impact: 'positive' as const,
            impactLevel: 4,
            date: `${year}-03-10`
          }
        ]
      },
      // Q2 事件
      {
        quarter: 2,
        events: [
          {
            type: 'product_launch' as const,
            title: '新一代Wi-Fi 7路由器发布',
            description: '推出支持最新Wi-Fi 7标准的高端路由器产品线，预期带动下半年营收增长',
            impact: 'positive' as const,
            impactLevel: 4,
            date: `${year}-04-15`
          },
          {
            type: 'financial_milestone' as const,
            title: '季度营收创新高',
            description: `Q2季度营收达到${Math.floor(Math.random() * 50) + 250}M美元，同比增长${Math.floor(Math.random() * 10) + 8}%`,
            impact: 'positive' as const,
            impactLevel: 4,
            date: `${year}-05-20`
          },
          {
            type: 'regulatory_change' as const,
            title: '获得重要技术认证',
            description: '新产品获得FCC和CE认证，为全球销售铺平道路',
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-06-05`
          }
        ]
      },
      // Q3 事件  
      {
        quarter: 3,
        events: [
          {
            type: 'strategic_partnership' as const,
            title: '与云服务商战略合作',
            description: '与主要云服务提供商签署战略合作协议，拓展企业级网络设备市场',
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-07-12`
          },
          {
            type: 'acquisition' as const,
            title: '收购AI网络技术公司',
            description: '收购一家专注于AI网络优化的初创公司，加强技术储备',
            impact: 'positive' as const,  
            impactLevel: 4,
            date: `${year}-08-25`
          },
          {
            type: 'market_expansion' as const,
            title: '进军亚太新兴市场',
            description: '在东南亚和印度市场建立新的销售渠道',
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-09-08`
          }
        ]
      },
      // Q4 事件
      {
        quarter: 4,
        events: [
          {
            type: 'product_launch' as const,
            title: '假日季产品促销',
            description: '推出针对消费者市场的假日季促销活动，预期带动Q4销量',
            impact: 'positive' as const,
            impactLevel: 3,
            date: `${year}-10-15`
          },
          {
            type: 'financial_milestone' as const,
            title: '年度业绩目标达成',
            description: `提前完成年度营收目标，全年营收预计达到${year < 2024 ? '950' : year === 2024 ? '1050' : '1150'}M美元`,
            impact: 'positive' as const,
            impactLevel: 5,
            date: `${year}-11-20`
          },
          {
            type: 'strategic_partnership' as const,
            title: '建立研发合作伙伴关系',
            description: '与高通、博通等芯片厂商建立长期技术合作关系',
            impact: 'positive' as const,
            impactLevel: 4,
            date: `${year}-12-10`
          }
        ]
      }
    ]

    // 根据当前季度生成对应事件
    const currentQuarterEvents = quarterEvents.find(q => q.quarter === quarter)
    if (currentQuarterEvents) {
      currentQuarterEvents.events.forEach((eventTemplate, index) => {
        events.push({
          id: `${period}-event-${index}`,
          date: eventTemplate.date,
          type: eventTemplate.type,
          title: eventTemplate.title,
          description: eventTemplate.description,
          impact: eventTemplate.impact,
          impactLevel: eventTemplate.impactLevel,
          relatedMetrics: ['revenue', 'growth']
        })
      })
    }
    
    return events
  }

  /**
   * 生成增强的模拟数据
   */
  generateEnhancedMockData(): EnhancedFinancialData[] {
    const data: EnhancedFinancialData[] = []
    
    // 扩展到5年数据 (2021-2025)
    for (let year = 2021; year <= 2025; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (year === 2025 && quarter > 1) break // 只到2025年Q1
        
        const period = `Q${quarter}-${year}`
        const baseRevenue = 300000000 + (year - 2021) * 20000000 // 基础增长
        const seasonalFactor = quarter === 4 ? 1.2 : quarter === 1 ? 0.9 : 1.0 // 季节性因素
        const randomFactor = 0.9 + Math.random() * 0.2 // 随机波动
        
        const revenue = baseRevenue * seasonalFactor * randomFactor
        const grossProfit = revenue * (0.25 + Math.random() * 0.1)
        const netIncome = revenue * (0.08 + Math.random() * 0.05)
        const totalAssets = revenue * 3
        
        // 生成软件业务指标
        const softwareMetrics = this.generateSoftwareMetrics(revenue, quarter, year)
        softwareMetrics.ltvCacRatio = softwareMetrics.ltv / softwareMetrics.cac
        softwareMetrics.cacPaybackPeriod = softwareMetrics.cac / softwareMetrics.mrr
        softwareMetrics.healthScore = ((revenue - data[data.length - 1]?.revenue || revenue) / (data[data.length - 1]?.revenue || revenue) * 100) + (netIncome / revenue * 100)
        
        // 生成运营指标
        const operationalMetrics = this.generateOperationalMetrics(revenue)
        
        // 生成里程碑事件
        const milestoneEvents = this.generateMilestoneEvents(period, year, quarter)
        
        data.push({
          period,
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
          cashRatio: 50,
          
          // 新增数据
          softwareMetrics,
          operationalMetrics,
          milestoneEvents,
          
          dataQuality: {
            completeness: 0.95,
            accuracy: 0.9,
            source: 'mock'
          }
        })
      }
    }
    
    return sortByQuarter(data, false) // 最新的在前
  }

  /**
   * 基于真实财务数据生成产品线营收数据
   * 
   * ⚠️ 重要说明：这是估算数据！
   * 
   * 原因：NETGEAR等网络设备公司在SEC财报中通常只披露总营收，
   * 不会详细分解到具体产品线（这属于商业机密）
   * 
   * 估算方法：
   * 1. 基于NETGEAR历年年报中的业务描述
   * 2. 参考同行业公司（Cisco、Ubiquiti等）的产品组合
   * 3. 结合网络设备市场研究报告的行业分布数据
   * 4. 使用固定比例避免数据不一致性
   * 
   * 数据质量：中等（基于公开信息的合理推算）
   * 适用场景：趋势分析、业务理解，不适用于投资决策
   */
  generateProductLineData(year: number, actualRevenue?: number): ProductHierarchy {
    // 如果有真实营收数据则使用，否则使用基于年份的差异化估算
    let totalRevenue: number
    if (actualRevenue) {
      totalRevenue = actualRevenue
    } else {
      // 基于Netgear实际业务增长的营收估算
      switch (year) {
        case 2023:
          totalRevenue = 1180000000 // 11.8亿美元
          break
        case 2024:
          totalRevenue = 1250000000 // 12.5亿美元
          break
        case 2025:
          // ⚠️ 这是预测数据！基于2024年趋势和行业分析
          totalRevenue = 1340000000 // 13.4亿美元（预测值，实际可能存在±15%差异）
          break
        default:
          totalRevenue = 300000000 + (year - 2021) * 20000000
      }
    }
    
    // 基于NETGEAR实际业务结构的合理分布（参考公司年报和行业分析）
    // 注意：这些比例是基于公开信息和行业标准的推算，非精确数据
    return {
      level1: [
        {
          name: '消费级网络产品',
          revenue: totalRevenue * 0.68, // NETGEAR主要业务
          children: [
            { 
              name: 'WiFi路由器', 
              revenue: totalRevenue * 0.40, 
              profitMargin: 28, 
              growth: this.calculateYearOverYearGrowth(year, 0.40) 
            },
            { 
              name: '网络扩展器/Mesh系统', 
              revenue: totalRevenue * 0.18, 
              profitMargin: 25, 
              growth: this.calculateYearOverYearGrowth(year, 0.18) 
            },
            { 
              name: '网络存储(NAS)', 
              revenue: totalRevenue * 0.10, 
              profitMargin: 32, 
              growth: this.calculateYearOverYearGrowth(year, 0.10) 
            }
          ]
        },
        {
          name: '商用/企业级产品',
          revenue: totalRevenue * 0.22,
          children: [
            { 
              name: '企业级路由器', 
              revenue: totalRevenue * 0.10, 
              profitMargin: 35, 
              growth: this.calculateYearOverYearGrowth(year, 0.10) 
            },
            { 
              name: '交换机', 
              revenue: totalRevenue * 0.08, 
              profitMargin: 30, 
              growth: this.calculateYearOverYearGrowth(year, 0.08) 
            },
            { 
              name: '无线接入点', 
              revenue: totalRevenue * 0.04, 
              profitMargin: 38, 
              growth: this.calculateYearOverYearGrowth(year, 0.04) 
            }
          ]
        },
        {
          name: '服务与软件',
          revenue: totalRevenue * 0.10,
          children: [
            { 
              name: 'Armor安全服务', 
              revenue: totalRevenue * 0.05, 
              profitMargin: 65, 
              growth: this.calculateYearOverYearGrowth(year, 0.05) 
            },
            { 
              name: 'Insight网络管理', 
              revenue: totalRevenue * 0.03, 
              profitMargin: 70, 
              growth: this.calculateYearOverYearGrowth(year, 0.03) 
            },
            { 
              name: '其他服务', 
              revenue: totalRevenue * 0.02, 
              profitMargin: 60, 
              growth: this.calculateYearOverYearGrowth(year, 0.02) 
            }
          ]
        }
      ]
    }
  }

  /**
   * 计算产品线年度增长率（基于市场趋势）
   */
  private calculateYearOverYearGrowth(year: number, marketShare: number): number {
    // 使用固定的伪随机数生成，确保数据一致性
    const seedValue = year * 1000 + Math.floor(marketShare * 10000)
    const pseudoRandom = Math.sin(seedValue) * 10000
    const randomFactor = (pseudoRandom - Math.floor(pseudoRandom) - 0.5) * 6

    // 基于不同产品线的市场增长趋势和年度差异化
    let baseGrowth: number
    
    if (year === 2023) {
      // 2023年：疫情后复苏，不同产品线表现差异化
      baseGrowth = marketShare > 0.2 ? 3.2 : marketShare > 0.1 ? 6.8 : 18.5
    } else if (year === 2024) {
      // 2024年：市场稳定增长
      baseGrowth = marketShare > 0.2 ? 5.8 : marketShare > 0.1 ? 9.2 : 14.3
    } else if (year === 2025) {
      // 2025年：预期增长，AI和WiFi 7驱动
      baseGrowth = marketShare > 0.2 ? 7.5 : marketShare > 0.1 ? 11.8 : 16.2
    } else {
      // 其他年份的通用计算
      baseGrowth = year >= 2024 ? 
        (marketShare > 0.2 ? 8 : marketShare > 0.1 ? 12 : 15) : 
        (marketShare > 0.2 ? 5 : marketShare > 0.1 ? 8 : 20)
    }

    return baseGrowth + randomFactor
  }

  /**
   * 生成增强的地理分布数据
   */
  generateEnhancedGeographicData(revenue: number, year: number): EnhancedGeographicData[] {
    const baseDistribution = [
      { 
        region: '北美', country: 'United States', countryCode: 'US', 
        percentage: 0.55, coordinates: [-95.7129, 37.0902] as [number, number],
        marketDetails: {
          population: 331000000, gdpPerCapita: 63416, internetPenetration: 89.4,
          competitorCount: 15, marketSize: 12500000000, marketShare: 8.5
        }
      },
      { 
        region: '欧洲', country: 'Germany', countryCode: 'DE',
        percentage: 0.28, coordinates: [10.4515, 51.1657] as [number, number],
        marketDetails: {
          population: 83000000, gdpPerCapita: 46258, internetPenetration: 91.5,
          competitorCount: 22, marketSize: 8200000000, marketShare: 6.2
        }
      },
      { 
        region: '亚太', country: 'Japan', countryCode: 'JP',
        percentage: 0.17, coordinates: [138.2529, 36.2048] as [number, number],
        marketDetails: {
          population: 125800000, gdpPerCapita: 39312, internetPenetration: 93.2,
          competitorCount: 18, marketSize: 5800000000, marketShare: 4.8
        }
      }
    ]
    
    return baseDistribution.map(item => ({
      region: item.region,
      country: item.country,
      countryCode: item.countryCode,
      revenue: Math.round(revenue * item.percentage),
      percentage: item.percentage * 100,
      growth: -5 + Math.random() * 25, // -5% 到 20% 的增长率
      coordinates: item.coordinates,
      year,
      marketDetails: item.marketDetails,
      productMix: {
        consumer: 60 + Math.random() * 20,
        enterprise: 25 + Math.random() * 15,
        software: 5 + Math.random() * 10
      }
    }))
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
    
    // 使用正确的季度排序
    return sortByQuarter(mockData, false) // 最新的在前
  }
}

// 导出单例
export const financialService = new FinancialService()