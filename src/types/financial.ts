/**
 * 增强的财务数据类型定义
 * 支持传统财务指标、软件业务指标和事件数据
 */

// 基础财务数据接口
export interface BaseFinancialData {
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

// 软件业务指标
export interface SoftwareMetrics {
  // 经常性收入指标
  arr: number  // Annual Recurring Revenue 年度经常性收入
  mrr: number  // Monthly Recurring Revenue 月度经常性收入
  
  // 客户指标
  cac: number     // Customer Acquisition Cost 客户获取成本
  ltv: number     // Lifetime Value 客户终身价值
  churnRate: number    // 客户流失率
  nrr: number     // Net Revenue Retention 净收入留存率
  
  // 订阅指标
  totalSubscribers: number     // 总订阅用户数
  newSubscribers: number       // 新增订阅用户
  upgrades: number            // 升级用户数
  downgrades: number          // 降级用户数
  
  // 计算指标
  ltvCacRatio: number         // LTV/CAC比率
  cacPaybackPeriod: number    // CAC回收期（月）
  healthScore: number         // 40%法则评分（增长率+利润率）
}

// 运营效率指标
export interface OperationalMetrics {
  // 周转率指标
  assetTurnover: number           // 总资产周转率
  receivablesTurnover: number     // 应收账款周转率
  inventoryTurnover: number       // 存货周转率
  
  // 费用率指标
  salesExpenseRatio: number       // 销售费用率
  adminExpenseRatio: number       // 管理费用率
  rdExpenseRatio: number          // 研发费用率
  
  // 现金流指标
  operatingCashFlow: number       // 经营现金流
  investingCashFlow: number       // 投资现金流
  financingCashFlow: number       // 筹资现金流
  freeCashFlow: number           // 自由现金流
}

// 财务事件类型
export type FinancialEventType = 'milestone' | 'product' | 'market' | 'management' | 'financial'
export type EventImpact = 'positive' | 'negative' | 'neutral'

// 财务事件接口
export interface FinancialEvent {
  id: string
  date: string
  type: FinancialEventType
  title: string
  description: string
  impact: EventImpact
  impactLevel: number  // 影响程度 1-5
  relatedMetrics: string[]  // 相关的财务指标
  details?: {
    changeAmount?: number     // 变化金额
    changePercentage?: number // 变化百分比
    marketContext?: string    // 市场背景
    competitorImpact?: string // 竞争对手影响
  }
}

// 增强的财务数据接口
export interface EnhancedFinancialData extends BaseFinancialData {
  // 软件业务指标
  softwareMetrics: SoftwareMetrics
  
  // 运营效率指标
  operationalMetrics: OperationalMetrics
  
  // 关联事件
  milestoneEvents: FinancialEvent[]
  
  // 数据质量标识
  dataQuality: {
    completeness: number  // 数据完整度 0-1
    accuracy: number      // 数据准确度 0-1
    source: 'api' | 'mock' | 'estimated'  // 数据来源
  }
}

// 产品线营收数据
export interface ProductLineRevenue {
  category: string        // 产品大类
  subcategory: string    // 产品子类
  revenue: number
  percentage: number
  growth: number
  profitMargin: number
  year: number
  quarter?: number
}

// 产品线层级结构
export interface ProductHierarchy {
  level1: {
    name: string
    revenue: number
    children: {
      name: string
      revenue: number
      profitMargin: number
      growth: number
    }[]
  }[]
}

// 地区营收数据扩展
export interface EnhancedGeographicData {
  region: string
  country: string
  countryCode: string    // ISO国家代码，用于地图映射
  revenue: number
  percentage: number
  growth: number
  coordinates: [number, number]
  year: number
  quarter?: number
  
  // 市场详情
  marketDetails: {
    population: number
    gdpPerCapita: number
    internetPenetration: number
    competitorCount: number
    marketSize: number
    marketShare: number
  }
  
  // 产品组合
  productMix: {
    consumer: number      // 消费级产品占比
    enterprise: number    // 企业级产品占比
    software: number      // 软件服务占比
  }
}

// 数据转折点
export interface DataTurningPoint {
  period: string
  metric: string
  value: number
  previousValue: number
  changePercentage: number
  significance: 'high' | 'medium' | 'low'  // 重要性级别
  reason?: string
  relatedEvents: string[]  // 关联事件ID
}

// 竞争对手数据
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
  
  // 软件业务指标（如果适用）
  softwareMetrics?: Partial<SoftwareMetrics>
}

// 现金流分析数据
export interface CashFlowAnalysis {
  period: string
  
  // 现金流组成
  operatingCashFlow: {
    netIncome: number
    depreciation: number
    workingCapitalChange: number
    other: number
    total: number
  }
  
  investingCashFlow: {
    capex: number
    acquisitions: number
    investments: number
    other: number
    total: number
  }
  
  financingCashFlow: {
    debtChange: number
    equityChange: number
    dividends: number
    other: number
    total: number
  }
  
  netCashFlow: number
  cashPosition: number
}

// 资产负债结构分析
export interface BalanceSheetAnalysis {
  period: string
  
  // 资产结构
  assets: {
    currentAssets: {
      cash: number
      receivables: number
      inventory: number
      other: number
      total: number
    }
    fixedAssets: {
      ppe: number  // Property, Plant & Equipment
      intangible: number
      other: number
      total: number
    }
    totalAssets: number
  }
  
  // 负债结构
  liabilities: {
    currentLiabilities: {
      payables: number
      shortTermDebt: number
      other: number
      total: number
    }
    longTermLiabilities: {
      longTermDebt: number
      other: number
      total: number
    }
    totalLiabilities: number
  }
  
  // 股东权益
  equity: {
    paidInCapital: number
    retainedEarnings: number
    other: number
    total: number
  }
  
  // 财务比率
  ratios: {
    currentRatio: number      // 流动比率
    quickRatio: number        // 速动比率
    debtToEquity: number      // 负债权益比
    assetTurnover: number     // 资产周转率
  }
}

// 综合分析报告
export interface FinancialAnalysisReport {
  period: string
  overview: {
    revenue: number
    revenueGrowth: number
    profitability: number
    efficiency: number
    financial_health: number
  }
  
  insights: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    risks: string[]
  }
  
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    action: string
    expected_impact: string
  }[]
}

// 导出所有类型
export type {
  BaseFinancialData,
  SoftwareMetrics,
  OperationalMetrics,
  FinancialEvent,
  EnhancedFinancialData,
  ProductLineRevenue,
  ProductHierarchy,
  EnhancedGeographicData,
  DataTurningPoint,
  CompetitorData,
  CashFlowAnalysis,
  BalanceSheetAnalysis,
  FinancialAnalysisReport
}