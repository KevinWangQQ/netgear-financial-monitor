'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GeographicData } from '@/lib/financial-service'
import { InteractiveMap } from './InteractiveMap'

interface GeographicChartProps {
  data: GeographicData[]
  title: string
  height?: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export function GeographicChart({ data, title, height = 400 }: GeographicChartProps) {
  const [view, setView] = useState<'bar' | 'map'>('map')

  const renderBarView = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="region" />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1e6).toFixed(0)}M`}
        />
        <Tooltip 
          formatter={(value: number) => [`$${(value / 1e6).toFixed(0)}M`, '营收']}
          labelFormatter={(label) => `地区: ${label}`}
        />
        <Bar 
          dataKey="revenue" 
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderMapView = () => {
    // 转换数据格式以适配InteractiveMap组件
    const mapData = data.map(item => ({
      region: item.region,
      country: item.country || item.region,
      revenue: item.revenue,
      percentage: item.percentage,
      growth: item.growth,
      coordinates: item.coordinates || [0, 0] as [number, number]
    }))

    return (
      <InteractiveMap 
        data={mapData}
        title=""
        height={height}
        showLegend={true}
        showControls={true}
      />
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {/* 视图切换 */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('bar')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'bar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            柱状图
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'map'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            地图
          </button>
        </div>
      </div>

      {/* 图表内容 */}
      <div className="w-full">
        {view === 'bar' ? renderBarView() : renderMapView()}
      </div>

      {/* 图例说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>营收规模</span>
            </div>
          </div>
          <div className="text-xs">
            总营收: ${(data.reduce((sum, item) => sum + item.revenue, 0) / 1e6).toFixed(0)}M
          </div>
        </div>
        
        {/* 地区详情 */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {data.map((item, index) => (
            <div key={item.region} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="font-medium">{item.region}</span>
              </div>
              <div className="text-right">
                <div>${(item.revenue / 1e6).toFixed(0)}M</div>
                <div className={`${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}