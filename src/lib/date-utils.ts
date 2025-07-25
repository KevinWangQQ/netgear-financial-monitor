/**
 * 日期和时间处理工具函数
 * 专门处理财务数据中的季度、年份排序和格式化
 */

import { format, parseISO, isValid, compareAsc } from 'date-fns'

export interface QuarterInfo {
  quarter: number
  year: number
  period: string
  sortKey: number // 用于排序的数字键
  displayName: string // 显示名称
}

/**
 * 解析季度字符串 (如 "Q1-2024" 或 "2024Q1")
 */
export function parseQuarter(period: string): QuarterInfo | null {
  const patterns = [
    /^Q(\d+)-(\d{4})$/, // Q1-2024 格式
    /^(\d{4})Q(\d+)$/,  // 2024Q1 格式
    /^Q(\d+)\s+(\d{4})$/, // Q1 2024 格式
    /^(\d{4})\s+Q(\d+)$/, // 2024 Q1 格式
  ]

  for (const pattern of patterns) {
    const match = period.match(pattern)
    if (match) {
      let quarter: number
      let year: number

      if (pattern.source.startsWith('^Q')) {
        // Q开头的格式
        quarter = parseInt(match[1])
        year = parseInt(match[2])
      } else {
        // 年份开头的格式
        year = parseInt(match[1])
        quarter = parseInt(match[2])
      }

      if (quarter >= 1 && quarter <= 4 && year >= 1900 && year <= 2100) {
        return {
          quarter,
          year,
          period,
          sortKey: year * 10 + quarter, // 2024Q1 -> 20241
          displayName: `${year}Q${quarter}`
        }
      }
    }
  }

  return null
}

/**
 * 按时间顺序排序季度数据
 * @param data 包含period字段的数据数组
 * @param ascending 是否升序排列（默认true，最早的在前）
 */
export function sortByQuarter<T extends { period: string }>(
  data: T[], 
  ascending: boolean = true
): T[] {
  return data.sort((a, b) => {
    const quarterA = parseQuarter(a.period)
    const quarterB = parseQuarter(b.period)

    // 如果解析失败，按字符串排序
    if (!quarterA || !quarterB) {
      return ascending 
        ? a.period.localeCompare(b.period)
        : b.period.localeCompare(a.period)
    }

    // 按排序键比较
    const diff = quarterA.sortKey - quarterB.sortKey
    return ascending ? diff : -diff
  })
}

/**
 * 格式化季度显示名称
 */
export function formatQuarterDisplay(period: string): string {
  const quarter = parseQuarter(period)
  return quarter ? quarter.displayName : period
}

/**
 * 获取季度的月份范围
 */
export function getQuarterMonths(quarter: number): [number, number, number] {
  const quarters: Record<number, [number, number, number]> = {
    1: [1, 2, 3],    // Q1: Jan-Mar
    2: [4, 5, 6],    // Q2: Apr-Jun  
    3: [7, 8, 9],    // Q3: Jul-Sep
    4: [10, 11, 12]  // Q4: Oct-Dec
  }
  return quarters[quarter] || [1, 2, 3]
}

/**
 * 计算季度之间的差值
 */
export function quarterDiff(fromPeriod: string, toPeriod: string): number {
  const from = parseQuarter(fromPeriod)
  const to = parseQuarter(toPeriod)
  
  if (!from || !to) return 0
  
  return to.sortKey - from.sortKey
}

/**
 * 检查是否为同一年的季度
 */
export function isSameYear(period1: string, period2: string): boolean {
  const q1 = parseQuarter(period1)
  const q2 = parseQuarter(period2)
  
  return q1?.year === q2?.year
}

/**
 * 获取季度的季节名称
 */
export function getSeasonName(quarter: number): string {
  const seasons = {
    1: '春季',
    2: '夏季', 
    3: '秋季',
    4: '冬季'
  }
  return seasons[quarter as keyof typeof seasons] || `Q${quarter}`
}

/**
 * 生成季度序列
 */
export function generateQuarterSequence(
  startPeriod: string, 
  endPeriod: string
): QuarterInfo[] {
  const start = parseQuarter(startPeriod)
  const end = parseQuarter(endPeriod)
  
  if (!start || !end) return []
  
  const sequence: QuarterInfo[] = []
  let current = { ...start }
  
  while (current.sortKey <= end.sortKey) {
    sequence.push({ ...current })
    
    // 移动到下一个季度
    current.quarter++
    if (current.quarter > 4) {
      current.quarter = 1
      current.year++
    }
    current.sortKey = current.year * 10 + current.quarter
    current.period = `Q${current.quarter}-${current.year}`
    current.displayName = `${current.year}Q${current.quarter}`
  }
  
  return sequence
}

/**
 * 获取季度的相对描述
 */
export function getRelativeQuarter(period: string): string {
  const quarter = parseQuarter(period)
  if (!quarter) return period
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const currentSortKey = currentYear * 10 + currentQuarter
  
  const diff = quarter.sortKey - currentSortKey
  
  if (diff === 0) return '本季度'
  if (diff === -1) return '上季度'
  if (diff === 1) return '下季度'
  if (diff < -1) return `${Math.abs(diff)}个季度前`
  if (diff > 1) return `${diff}个季度后`
  
  return quarter.displayName
}