'use client'

import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface RevenueChartProps {
  data: Array<{
    period: string
    revenue: number
    profit: number
    expenses: number
  }>
  type?: 'line' | 'bar' | 'area'
  title?: string
  height?: number
}

// 自定义数字格式化函数，避免本地化差异
const formatNumber = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function RevenueChart({ data, type = 'line', title = '营收趋势', height = 300 }: RevenueChartProps) {
  const option = useMemo((): EChartsOption => {
    const periods = data.map(item => item.period)
    const revenues = data.map(item => item.revenue)
    const profits = data.map(item => item.profit)
    const expenses = data.map(item => item.expenses)

    // 根据图表类型调整系列配置
    const getSeriesType = () => {
      if (type === 'area') return 'line'
      return type
    }

    const getSeriesConfig = (name: string, data: number[], color: string) => {
      const baseConfig = {
        name,
        data,
        itemStyle: { color },
        ...(type === 'area' && {
          areaStyle: { color: color + '20' }, // 添加透明度
          smooth: true,
          symbol: 'none'
        }),
        ...(type === 'line' && {
          lineStyle: { color },
          smooth: true,
          symbol: 'circle',
          symbolSize: 5
        }),
        ...(type === 'bar' && {
          barMaxWidth: 50
        })
      }

      return {
        ...baseConfig,
        type: getSeriesType() as 'line' | 'bar'
      }
    }

    return {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `<div style="font-weight: bold">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            const value = typeof param.value === 'number' ? formatNumber(param.value) : param.value
            result += `<div>${param.seriesName}: $${value}</div>`
          })
          return result
        }
      },
      legend: {
        data: ['营收', '利润', '支出'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: periods,
        boundaryGap: type === 'bar'
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `$${formatNumber(value)}`
        }
      },
      series: [
        getSeriesConfig('营收', revenues, '#3b82f6'),
        getSeriesConfig('利润', profits, '#10b981'),
        getSeriesConfig('支出', expenses, '#f59e0b')
      ]
    }
  }, [data, type, title])

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ReactECharts option={option} style={{ height: height }} />
    </div>
  )
}