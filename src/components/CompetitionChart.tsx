'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line
} from 'recharts'

interface CompetitorData {
  company: string
  revenue: number
  grossProfitMargin: number
  netProfitMargin: number
  marketShare: number
  roe: number
  roa: number
}

interface CompetitionChartProps {
  data: CompetitorData[]
  type: 'bar' | 'radar' | 'line'
  title: string
  height?: number
}

export function CompetitionChart({ data, type, title, height = 350 }: CompetitionChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`
    }
    return `$${value.toLocaleString()}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'revenue' 
                ? `${entry.name}: ${formatCurrency(entry.value)}`
                : `${entry.name}: ${entry.value}${entry.dataKey.includes('Margin') || entry.dataKey === 'roe' || entry.dataKey === 'roa' ? '%' : ''}`
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getCompanyColor = (company: string) => {
    const colors: { [key: string]: string } = {
      'NETGEAR': '#3b82f6',
      'Cisco': '#10b981',
      'HP Enterprise': '#f59e0b',
      'Ubiquiti': '#8b5cf6'
    }
    return colors[company] || '#6b7280'
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="company" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="revenue" 
              name="营收"
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Bar key={`cell-${index}`} fill={getCompanyColor(entry.company)} />
              ))}
            </Bar>
          </BarChart>
        )

      case 'radar':
        const radarData = data.map(item => ({
          company: item.company,
          '毛利率': item.grossProfitMargin,
          '净利率': item.netProfitMargin,
          '市场份额': item.marketShare,
          'ROE': item.roe,
          'ROA': item.roa
        }))

        return (
          <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid stroke="#f0f0f0" />
            <PolarAngleAxis tick={{ fontSize: 11 }} />
            <PolarRadiusAxis 
              angle={45} 
              domain={[0, 100]} 
              tick={{ fontSize: 10 }}
            />
            {data.map((item, index) => (
              <Radar
                key={item.company}
                name={item.company}
                dataKey={item.company}
                stroke={getCompanyColor(item.company)}
                fill={getCompanyColor(item.company)}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        )

      case 'line':
        // 这里可以展示历史趋势对比，暂时使用单点数据
        const lineData = [
          { period: 'Q1-2024', ...data.reduce((acc, curr) => ({ ...acc, [curr.company]: curr.revenue }), {}) },
          { period: 'Q2-2024', ...data.reduce((acc, curr) => ({ ...acc, [curr.company]: curr.revenue * 1.05 }), {}) },
          { period: 'Q3-2024', ...data.reduce((acc, curr) => ({ ...acc, [curr.company]: curr.revenue * 1.08 }), {}) },
          { period: 'Q4-2024', ...data.reduce((acc, curr) => ({ ...acc, [curr.company]: curr.revenue * 1.12 }), {}) }
        ]

        return (
          <LineChart
            data={lineData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            {data.map((item, index) => (
              <Line
                key={item.company}
                type="monotone"
                dataKey={item.company}
                stroke={getCompanyColor(item.company)}
                strokeWidth={3}
                dot={{ fill: getCompanyColor(item.company), strokeWidth: 2, r: 4 }}
              />
            ))}
            <Legend />
          </LineChart>
        )

      default:
        return null
    }
  }

  const chart = renderChart()
  
  if (!chart) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>暂无图表数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {chart}
      </ResponsiveContainer>
    </div>
  )
}

// 专门的对比表格组件
interface CompetitionTableProps {
  data: CompetitorData[]
  title: string
}

export function CompetitionTable({ data, title }: CompetitionTableProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`
    }
    return `$${value.toLocaleString()}`
  }

  const getRankBadge = (rank: number) => {
    const colors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-orange-100 text-orange-800']
    const color = colors[rank - 1] || 'bg-blue-100 text-blue-800'
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        #{rank}
      </span>
    )
  }

  // 按营收排序
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                排名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                公司
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                营收
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                毛利率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                净利率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                市场份额
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ROE
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((company, index) => (
              <tr key={company.company} className={company.company === 'NETGEAR' ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRankBadge(index + 1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {company.company}
                      {company.company === 'NETGEAR' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          关注目标
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(company.revenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.grossProfitMargin.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.netProfitMargin.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.marketShare.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.roe.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}