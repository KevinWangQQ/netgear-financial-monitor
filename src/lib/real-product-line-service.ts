/**
 * 真实产品线营收分析服务
 * 直接连接Supabase数据库，展示PDF提取的真实财务数据
 */

import { supabase } from './supabase'

export type ProductLineViewMode = 'real' | 'estimated'

export interface ProductLineData {
  name: string
  revenue: number | null
  profitMargin?: number | null
  growth?: number | null
  children?: ProductLineData[]
  metadata?: {
    dataSource: string
    confidenceLevel: 'high' | 'medium' | 'low' | 'none'
    lastUpdated?: string
    notes?: string
  }
}

export interface ProductLineAnalysis {
  viewMode: ProductLineViewMode
  totalRevenue: number
  dataCompleteness: number
  products: ProductLineData[]
  methodology: string
  lastUpdated: string
  confidence: 'high' | 'medium' | 'low'
}

class RealProductLineService {

  /**
   * 获取真实数据视图 - 基于Supabase中的PDF财报数据
   */
  async getRealDataView(symbol: string, year: number): Promise<ProductLineAnalysis> {
    console.log(`📊 获取${symbol}年份${year}的真实产品线数据 (from Supabase)...`)

    try {
      // 1. 获取公司ID
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('symbol', symbol)
        .single()

      if (companyError || !companies) {
        throw new Error(`未找到公司 ${symbol}`)
      }

      const companyId = companies.id

      // 2. 获取该年份的财务数据
      const { data: financialData, error: financialError } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('fiscal_year', year)
        .order('fiscal_quarter')

      if (financialError) {
        throw new Error(`获取财务数据失败: ${financialError.message}`)
      }

      // 3. 获取该年份的产品线数据
      const { data: productLineData, error: productLineError } = await supabase
        .from('product_line_revenue')
        .select('*')
        .eq('company_id', companyId)
        .eq('fiscal_year', year)
        .order('fiscal_quarter', { ascending: false })
        .order('revenue', { ascending: false })

      if (productLineError) {
        throw new Error(`获取产品线数据失败: ${productLineError.message}`)
      }

      console.log(`✅ 获取到数据: 财务${financialData?.length || 0}条, 产品线${productLineData?.length || 0}条`)

      // 4. 计算总收入
      const totalRevenue = financialData?.reduce((sum, item) => sum + (item.revenue || 0), 0) || 0

      // 5. 处理产品线数据
      const products = this.processProductLineData(productLineData || [], totalRevenue, year)

      // 6. 计算数据完整性
      const dataCompleteness = this.calculateDataCompleteness(products)

      return {
        viewMode: 'real',
        totalRevenue,
        dataCompleteness,
        products,
        methodology: this.getRealDataMethodology(),
        lastUpdated: new Date().toISOString().split('T')[0],
        confidence: dataCompleteness > 0.7 ? 'high' : dataCompleteness > 0.3 ? 'medium' : 'low'
      }

    } catch (error) {
      console.error('获取真实产品线数据失败:', error)
      
      return {
        viewMode: 'real',
        totalRevenue: 0,
        dataCompleteness: 0,
        products: [],
        methodology: this.getRealDataMethodology(),
        lastUpdated: new Date().toISOString().split('T')[0],
        confidence: 'low'
      }
    }
  }

  /**
   * 获取估算预测视图 - 基于历史数据估算
   */
  async getEstimatedView(symbol: string, year: number): Promise<ProductLineAnalysis> {
    console.log(`📈 生成${symbol}年份${year}的估算产品线数据...`)

    // 为了简化，这里返回一个基础的估算结构
    // 在实际应用中，可以基于历史数据生成更复杂的估算
    return {
      viewMode: 'estimated',
      totalRevenue: 0,
      dataCompleteness: 0,
      products: [],
      methodology: '估算数据已被禁用，系统现在只显示基于官方PDF财报的真实数据',
      lastUpdated: new Date().toISOString().split('T')[0],
      confidence: 'low'
    }
  }

  /**
   * 处理产品线数据，将数据库记录转换为前端所需格式
   */
  private processProductLineData(dbData: any[], totalRevenue: number, year: number): ProductLineData[] {
    if (!dbData || dbData.length === 0) {
      return []
    }

    console.log(`📊 处理${year}年真实产品线数据，共${dbData.length}条记录`)

    // 按分类名称分组
    const categoryMap = new Map<string, any[]>()
    
    dbData.forEach(item => {
      const categoryName = item.category_name || '其他'
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, [])
      }
      categoryMap.get(categoryName)!.push(item)
    })

    // 转换为ProductLineData格式
    const products: ProductLineData[] = []

    categoryMap.forEach((items, categoryName) => {
      // 使用最新季度的数据
      const latestItem = items[0]
      
      const product: ProductLineData = {
        name: categoryName,
        revenue: latestItem.revenue || null,
        profitMargin: latestItem.gross_margin || null,
        growth: latestItem.yoy_growth || null,
        metadata: {
          dataSource: latestItem.data_source || 'unknown',
          confidenceLevel: this.getConfidenceLevel(latestItem.data_source),
          lastUpdated: latestItem.updated_at || new Date().toISOString(),
          notes: this.getDataSourceNotes(latestItem.data_source, categoryName)
        }
      }

      products.push(product)
    })

    // 按收入排序
    products.sort((a, b) => (b.revenue || 0) - (a.revenue || 0))

    console.log('✅ 处理后的产品数据:', products.map(p => 
      `${p.name}: $${((p.revenue || 0) / 1e6).toFixed(1)}M [${p.metadata?.dataSource}]`
    ))

    return products
  }

  /**
   * 根据数据源获取置信度等级
   */
  private getConfidenceLevel(dataSource: string): 'high' | 'medium' | 'low' | 'none' {
    switch (dataSource) {
      case 'official_pdf_report':
      case 'sec_filing':
        return 'high'
      case 'earnings_call':
      case 'earnings_report':
        return 'high'
      case 'updated_segment_model':
        return 'medium'
      case 'alpha_vantage':
        return 'medium'
      case 'estimated_from_financial':
      case 'trend_estimation':
        return 'low'
      default:
        return 'none'
    }
  }

  /**
   * 获取数据源说明
   */
  private getDataSourceNotes(dataSource: string, categoryName: string): string {
    switch (dataSource) {
      case 'official_pdf_report':
        return `来自NETGEAR官方PDF财报的权威数据 - ${categoryName}分段收入直接从财报中提取`
      case 'sec_filing':
        return `来自SEC官方文件的业务分段数据 - ${categoryName}分段收入来自10-K/10-Q报告`
      case 'earnings_call':
        return `来自财报电话会议的披露数据 - ${categoryName}分段信息来自管理层讨论`
      case 'earnings_report':
        return `来自财报发布的官方数据 - ${categoryName}分段收入来自季度财报`
      case 'updated_segment_model':
        return `基于业务转型的分段模型更新 - ${categoryName}数据基于新的三分段业务架构`
      case 'alpha_vantage':
        return `来自Alpha Vantage的财务数据 - ${categoryName}数据来自第三方验证的财务信息`
      default:
        return `${categoryName}数据来源: ${dataSource}`
    }
  }

  /**
   * 计算数据完整性
   */
  private calculateDataCompleteness(products: ProductLineData[]): number {
    if (products.length === 0) return 0

    const totalProducts = products.length
    const productsWithRevenue = products.filter(p => p.revenue !== null && p.revenue > 0).length

    return productsWithRevenue / totalProducts
  }

  /**
   * 真实数据方法说明
   */
  private getRealDataMethodology(): string {
    return `真实数据视图基于Supabase数据库中的权威数据源：

📊 数据来源层级 (按权威性排序):
1. 🥇 官方PDF财报 (official_pdf_report) - 最高权威性
2. 🥈 SEC官方文件 (sec_filing) - 法定披露数据  
3. 🥉 财报电话会议 (earnings_call) - 管理层披露
4. 📈 Alpha Vantage验证 (alpha_vantage) - 第三方验证

🔄 业务分段演进:
- 2023年: Connected Home + NETGEAR for Business (2分段)
- 2024年起: NETGEAR for Business + Home Networking + Mobile (3分段)

📋 数据处理原则:
- 直接从Supabase数据库查询，无人工调整
- 按季度获取最新数据，避免重复计算
- 保留原始数据源标识，确保数据追溯性
- 数据完整性基于实际可用数据计算

⚠️ 数据限制:
- 仅显示数据库中已获取的分段数据
- 未获取的分段不进行估算或外推
- 依赖PDF提取和API获取的数据质量`
  }
}

export const realProductLineService = new RealProductLineService()