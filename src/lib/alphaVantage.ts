const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY

export interface FinancialData {
  symbol: string
  period: string
  revenue: number
  grossProfit: number
  netIncome: number
  totalAssets: number
  operatingExpenses: number
  cashAndEquivalents: number
  totalDebt: number
}

export interface CompanyOverview {
  Symbol: string
  Name: string
  Sector: string
  MarketCapitalization: string
  RevenueTTM: string
  GrossProfitTTM: string
  OperatingIncomeTTM: string
  NetIncomeTTM: string
}

export class AlphaVantageAPI {
  private apiKey: string

  constructor(apiKey: string = API_KEY || '') {
    if (!apiKey) {
      throw new Error('Alpha Vantage API key is required')
    }
    this.apiKey = apiKey
  }

  private async makeRequest(params: Record<string, string>) {
    const url = new URL(ALPHA_VANTAGE_BASE_URL)
    url.searchParams.append('apikey', this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`Making request to: ${url.toString()}`)

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`)
    }

    if (data['Note']) {
      throw new Error(`Alpha Vantage API rate limit: ${data['Note']}`)
    }

    return data
  }

  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const data = await this.makeRequest({
      function: 'OVERVIEW',
      symbol: symbol
    })

    return data as CompanyOverview
  }

  async getIncomeStatement(symbol: string): Promise<any> {
    const data = await this.makeRequest({
      function: 'INCOME_STATEMENT',
      symbol: symbol
    })

    return data
  }

  async getBalanceSheet(symbol: string): Promise<any> {
    const data = await this.makeRequest({
      function: 'BALANCE_SHEET',
      symbol: symbol
    })

    return data
  }

  async getCashFlow(symbol: string): Promise<any> {
    const data = await this.makeRequest({
      function: 'CASH_FLOW',
      symbol: symbol
    })

    return data
  }

  async getQuarterlyEarnings(symbol: string): Promise<any> {
    const data = await this.makeRequest({
      function: 'EARNINGS',
      symbol: symbol
    })

    return data
  }

  // 解析财务数据的辅助方法
  parseFinancialData(
    symbol: string,
    incomeStatement: any,
    balanceSheet: any,
    cashFlow: any
  ): FinancialData[] {
    const financialData: FinancialData[] = []

    if (!incomeStatement?.quarterlyReports || !balanceSheet?.quarterlyReports) {
      return financialData
    }

    // 合并季度数据
    const quarterlyIncome = incomeStatement.quarterlyReports.slice(0, 8) // 最近8个季度
    const quarterlyBalance = balanceSheet.quarterlyReports.slice(0, 8)

    quarterlyIncome.forEach((incomeReport: any, index: number) => {
      const balanceReport = quarterlyBalance[index]
      
      if (balanceReport && incomeReport.fiscalDateEnding === balanceReport.fiscalDateEnding) {
        const period = this.formatPeriod(incomeReport.fiscalDateEnding)
        
        financialData.push({
          symbol,
          period,
          revenue: parseInt(incomeReport.totalRevenue) || 0,
          grossProfit: parseInt(incomeReport.grossProfit) || 0,
          netIncome: parseInt(incomeReport.netIncome) || 0,
          totalAssets: parseInt(balanceReport.totalAssets) || 0,
          operatingExpenses: parseInt(incomeReport.operatingExpenses) || 0,
          cashAndEquivalents: parseInt(balanceReport.cashAndCashEquivalentsAtCarryingValue) || 0,
          totalDebt: parseInt(balanceReport.shortLongTermDebtTotal) || 0
        })
      }
    })

    return financialData
  }

  private formatPeriod(dateString: string): string {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const quarter = Math.ceil((date.getMonth() + 1) / 3)
    return `Q${quarter}-${year}`
  }
}

// 导出单例实例
export const alphaVantageAPI = new AlphaVantageAPI()