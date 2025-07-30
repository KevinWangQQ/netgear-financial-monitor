/**
 * 数据库服务层 - 统一处理所有数据库操作
 * 从完整的Supabase数据库结构中读取数据
 */

import { supabase } from './supabase'
import { Database } from './supabase'

type DatabaseTables = Database['public']['Tables']
type FinancialData = DatabaseTables['financial_data']['Row']
type ProductLineRevenue = DatabaseTables['product_line_revenue']['Row']
type GeographicRevenue = DatabaseTables['geographic_revenue']['Row']
type MilestoneEvent = DatabaseTables['milestone_events']['Row']
type CompetitorData = DatabaseTables['competitor_data']['Row']
type MarketMetrics = DatabaseTables['market_metrics']['Row']
type Company = DatabaseTables['companies']['Row']

// 返回类型定义
export interface DatabaseFinancialData extends FinancialData {
  company?: {
    symbol: string
    name: string
  }
}

export interface DatabaseProductLineData extends ProductLineRevenue {
  company?: {
    symbol: string
    name: string
  }
}

export interface DatabaseGeographicData extends GeographicRevenue {
  company?: {
    symbol: string
    name: string
  }
}

export interface DatabaseMilestoneEvent extends MilestoneEvent {
  company?: {
    symbol: string
    name: string
  }
}

export interface DatabaseCompetitorData extends CompetitorData {
  company?: {
    symbol: string
    name: string
  }
  competitor?: {
    symbol: string
    name: string
  }
}

class DatabaseService {
  
  /**
   * 获取公司基本信息
   */
  async getCompany(symbol: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single()

    if (error) {
      console.error('获取公司信息失败:', error)
      return null
    }

    return data
  }

  /**
   * 获取公司的财务数据
   */
  async getFinancialData(symbol: string, limit: number = 20): Promise<DatabaseFinancialData[]> {
    const { data, error } = await supabase
      .from('financial_data')
      .select(`
        *,
        company:companies(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('获取财务数据失败:', error)
      throw new Error(`获取财务数据失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取产品线营收数据
   */
  async getProductLineRevenue(
    symbol: string, 
    year?: number, 
    quarter?: number
  ): Promise<DatabaseProductLineData[]> {
    let query = supabase
      .from('product_line_revenue')
      .select(`
        *,
        company:companies(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .order('category_level', { ascending: true })

    if (year) {
      query = query.eq('fiscal_year', year)
    }

    if (quarter) {
      query = query.eq('fiscal_quarter', quarter)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取产品线数据失败:', error)
      throw new Error(`获取产品线数据失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取地理营收分布数据
   */
  async getGeographicRevenue(
    symbol: string, 
    year?: number, 
    quarter?: number
  ): Promise<DatabaseGeographicData[]> {
    let query = supabase
      .from('geographic_revenue')
      .select(`
        *,
        company:companies(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .order('revenue', { ascending: false })

    if (year) {
      query = query.eq('fiscal_year', year)
    }

    if (quarter) {
      query = query.eq('fiscal_quarter', quarter)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取地理营收数据失败:', error)
      throw new Error(`获取地理营收数据失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取里程碑事件数据
   */
  async getMilestoneEvents(
    symbol: string, 
    startDate?: string, 
    endDate?: string,
    limit: number = 50
  ): Promise<DatabaseMilestoneEvent[]> {
    let query = supabase
      .from('milestone_events')
      .select(`
        *,
        company:companies(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('event_date', { ascending: false })
      .limit(limit)

    if (startDate) {
      query = query.gte('event_date', startDate)
    }

    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取里程碑事件失败:', error)
      throw new Error(`获取里程碑事件失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取竞争对手数据
   */
  async getCompetitorData(
    symbol: string, 
    year?: number, 
    quarter?: number
  ): Promise<DatabaseCompetitorData[]> {
    let query = supabase
      .from('competitor_data')
      .select(`
        *,
        company:companies!competitor_data_company_id_fkey(symbol, name),
        competitor:companies!competitor_data_competitor_id_fkey(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })

    if (year) {
      query = query.eq('fiscal_year', year)
    }

    if (quarter) {
      query = query.eq('fiscal_quarter', quarter)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取竞争对手数据失败:', error)
      throw new Error(`获取竞争对手数据失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取市场指标数据
   */
  async getMarketMetrics(
    industry?: string,
    segment?: string,
    region?: string,
    year?: number,
    quarter?: number
  ): Promise<MarketMetrics[]> {
    let query = supabase
      .from('market_metrics')
      .select('*')
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (segment) {
      query = query.eq('segment', segment)
    }

    if (region) {
      query = query.eq('region', region)
    }

    if (year) {
      query = query.eq('fiscal_year', year)
    }

    if (quarter) {
      query = query.eq('fiscal_quarter', quarter)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取市场指标失败:', error)
      throw new Error(`获取市场指标失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 获取最新的财务数据（用于KPI展示）
   */
  async getLatestFinancialData(symbol: string): Promise<DatabaseFinancialData | null> {
    const { data, error } = await supabase
      .from('financial_data')
      .select(`
        *,
        company:companies(symbol, name)
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('获取最新财务数据失败:', error)
      return null
    }

    return data
  }

  /**
   * 获取年度财务汇总数据
   */
  async getYearlyFinancialSummary(symbol: string): Promise<{
    year: number
    totalRevenue: number
    avgGrossMargin: number
    avgNetMargin: number
    quarterCount: number
  }[]> {
    const { data, error } = await supabase
      .from('financial_data')
      .select(`
        fiscal_year,
        revenue,
        gross_profit,
        net_income
      `)
      .eq('companies.symbol', symbol.toUpperCase())
      .order('fiscal_year', { ascending: false })

    if (error) {
      console.error('获取年度汇总失败:', error)
      return []
    }

    // 在JavaScript中进行分组和计算
    const yearlyData = new Map<number, {
      revenues: number[]
      grossProfits: number[]
      netIncomes: number[]
    }>()

    data?.forEach(item => {
      if (!item.fiscal_year || !item.revenue) return
      
      if (!yearlyData.has(item.fiscal_year)) {
        yearlyData.set(item.fiscal_year, {
          revenues: [],
          grossProfits: [],
          netIncomes: []
        })
      }

      const yearData = yearlyData.get(item.fiscal_year)!
      yearData.revenues.push(item.revenue)
      if (item.gross_profit) yearData.grossProfits.push(item.gross_profit)
      if (item.net_income) yearData.netIncomes.push(item.net_income)
    })

    return Array.from(yearlyData.entries()).map(([year, data]) => {
      const totalRevenue = data.revenues.reduce((sum, r) => sum + r, 0)
      const avgGrossMargin = data.grossProfits.length > 0 
        ? data.grossProfits.reduce((sum, gp) => sum + gp, 0) / totalRevenue * 100
        : 0
      const avgNetMargin = data.netIncomes.length > 0
        ? data.netIncomes.reduce((sum, ni) => sum + ni, 0) / totalRevenue * 100
        : 0

      return {
        year,
        totalRevenue,
        avgGrossMargin,
        avgNetMargin,
        quarterCount: data.revenues.length
      }
    }).sort((a, b) => b.year - a.year)
  }

  /**
   * 检查数据库连接状态
   */
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.error('数据库连接检查失败:', error)
      return false
    }
  }

  /**
   * 获取数据更新日志
   */
  async getDataUpdateLog(limit: number = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('data_update_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('获取更新日志失败:', error)
      return []
    }

    return data || []
  }

  /**
   * 记录数据更新日志
   */
  async logDataUpdate(
    tableName: string,
    updateType: 'insert' | 'update' | 'delete' | 'full_refresh',
    recordsAffected: number,
    status: 'success' | 'failed' | 'partial',
    errorMessage?: string,
    executionTimeMs?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_update_log')
        .insert({
          table_name: tableName,
          update_type: updateType,
          records_affected: recordsAffected,
          status,
          error_message: errorMessage,
          execution_time_ms: executionTimeMs
        })

      if (error) {
        console.error('记录更新日志失败:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('记录更新日志异常:', error)
      return false
    }
  }
}

// 导出单例
export const databaseService = new DatabaseService()