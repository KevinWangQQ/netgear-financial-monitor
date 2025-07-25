'use client'

import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Map, Table as TableIcon, Eye } from 'lucide-react'

// 视图类型定义
export type ViewType = 'bar' | 'line' | 'pie' | 'area' | 'map' | 'table' | 'bubble' | 'radar'

export interface ViewConfig {
  type: ViewType
  label: string
  icon: React.ReactNode
}

export interface MultiViewChartProps {
  data: any[]
  views: ViewType[]
  defaultView?: ViewType
  title: string
  height?: number
  colors?: string[]
  onViewChange?: (view: ViewType) => void
  renderCustomView?: (view: ViewType, data: any[]) => React.ReactNode
}

// 默认视图配置
const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  bar: { type: 'bar', label: '柱状图', icon: <BarChart3 className="w-4 h-4" /> },
  line: { type: 'line', label: '折线图', icon: <LineChartIcon className="w-4 h-4" /> },
  pie: { type: 'pie', label: '饼图', icon: <PieChartIcon className="w-4 h-4" /> },
  area: { type: 'area', label: '面积图', icon: <LineChartIcon className="w-4 h-4" /> },
  map: { type: 'map', label: '地图', icon: <Map className="w-4 h-4" /> },
  table: { type: 'table', label: '表格', icon: <TableIcon className="w-4 h-4" /> },
  bubble: { type: 'bubble', label: '气泡图', icon: <Eye className="w-4 h-4" /> },
  radar: { type: 'radar', label: '雷达图', icon: <Eye className="w-4 h-4" /> }
}

// 默认颜色配置
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

export function MultiViewChart({
  data,
  views,
  defaultView,
  title,
  height = 400,
  colors = DEFAULT_COLORS,
  onViewChange,
  renderCustomView
}: MultiViewChartProps) {
  const [currentView, setCurrentView] = useState<ViewType>(defaultView || views[0])

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    onViewChange?.(view)
  }

  const renderChart = () => {
    // 如果有自定义渲染函数，优先使用
    if (renderCustomView) {
      const customView = renderCustomView(currentView, data)
      if (customView) return customView
    }

    // 使用默认渲染逻辑
    switch (currentView) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'pie':
        return renderPieChart()
      case 'area':
        return renderAreaChart()
      case 'table':
        return renderTable()
      default:
        return <div className="flex items-center justify-center h-full text-gray-500">暂不支持此视图类型</div>
    }
  }

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
          <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )

  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
          <Line 
            key={key} 
            type="monotone" 
            dataKey={key} 
            stroke={colors[index % colors.length]} 
            strokeWidth={2}
            fill={colors[index % colors.length]}
            fillOpacity={0.3}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Object.keys(data[0] || {}).map((key) => (
              <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index}>
              {Object.values(row).map((value, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {typeof value === 'number' 
                    ? value.toLocaleString()
                    : String(value)
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {/* 视图切换按钮 */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {views.map((view) => {
            const config = VIEW_CONFIGS[view]
            return (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === view
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={config.label}
              >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 图表内容 */}
      <div className="w-full">
        {data.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            暂无数据
          </div>
        )}
      </div>
    </div>
  )
}