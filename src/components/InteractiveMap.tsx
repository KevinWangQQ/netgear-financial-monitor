'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  DollarSign,
  Users,
  MapPin,
  Activity
} from 'lucide-react'

// 动态导入地图组件（仅在客户端渲染）
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('react-leaflet').then(mod => mod.Tooltip),
  { ssr: false }
)

// 地理数据接口
export interface GeographicData {
  region: string
  country: string
  revenue: number
  percentage: number
  growth: number
  coordinates: [number, number]
  marketSize?: number
  competitors?: number
  details?: {
    population: number
    gdpPerCapita: number
    internetPenetration: number
    mainProducts: string[]
  }
}

interface InteractiveMapProps {
  data: GeographicData[]
  title: string
  height?: number
  showLegend?: boolean
  showControls?: boolean
}

// 默认地图数据
const DEFAULT_MAP_DATA: GeographicData[] = [
  {
    region: '北美',
    country: 'United States',
    revenue: 185000000,
    percentage: 55.2,
    growth: 8.5,
    coordinates: [-95.7129, 39.0902],
    marketSize: 12500000000,
    competitors: 15,
    details: {
      population: 331000000,
      gdpPerCapita: 63416,
      internetPenetration: 89.4,
      mainProducts: ['WiFi路由器', '交换机', '安全网关']
    }
  },
  {
    region: '欧洲',
    country: 'Germany',
    revenue: 94000000,
    percentage: 28.1,
    growth: 12.3,
    coordinates: [10.4515, 51.1657],
    marketSize: 8200000000,
    competitors: 22,
    details: {
      population: 83000000,
      gdpPerCapita: 46258,
      internetPenetration: 91.5,
      mainProducts: ['企业路由器', '网络存储', '无线设备']
    }
  },
  {
    region: '亚太',
    country: 'Japan',
    revenue: 56000000,
    percentage: 16.7,
    growth: -2.1,
    coordinates: [138.2529, 36.2048],
    marketSize: 5800000000,
    competitors: 18,
    details: {
      population: 125800000,
      gdpPerCapita: 39312,
      internetPenetration: 93.2,
      mainProducts: ['家用路由器', '智能家居网关']
    }
  },
  {
    region: '拉美',
    country: 'Brazil',
    revenue: 12000000,
    percentage: 3.6,
    growth: 25.8,
    coordinates: [-47.8825, -15.7942],
    marketSize: 1200000000,
    competitors: 8,
    details: {
      population: 213000000,
      gdpPerCapita: 7518,
      internetPenetration: 74.9,
      mainProducts: ['经济型路由器', '网络扩展器']
    }
  },
  {
    region: '中东非洲',
    country: 'UAE',
    revenue: 8000000,
    percentage: 2.4,
    growth: 31.2,
    coordinates: [54.3773, 24.2992],
    marketSize: 800000000,
    competitors: 12,
    details: {
      population: 9890000,
      gdpPerCapita: 43103,
      internetPenetration: 99.0,
      mainProducts: ['高端路由器', '企业级设备']
    }
  }
]

export function InteractiveMap({ 
  data = DEFAULT_MAP_DATA,
  title = "全球市场分布",
  height = 500,
  showLegend = true,
  showControls = true
}: InteractiveMapProps) {
  const [selectedRegion, setSelectedRegion] = useState<GeographicData | null>(null)
  const [viewType, setViewType] = useState<'revenue' | 'growth' | 'market'>('revenue')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // 计算总值用于百分比计算
  const totalRevenue = useMemo(() => 
    data.reduce((sum, item) => sum + item.revenue, 0)
  , [data])

  // 根据视图类型获取数值和颜色
  const getMarkerInfo = (item: GeographicData) => {
    switch (viewType) {
      case 'revenue':
        return {
          value: item.revenue,
          size: Math.max(10, Math.min(50, (item.revenue / totalRevenue) * 300)),
          color: item.revenue > totalRevenue * 0.3 ? '#10b981' : 
                 item.revenue > totalRevenue * 0.15 ? '#3b82f6' : '#f59e0b',
          label: `$${(item.revenue / 1e6).toFixed(1)}M`,
          unit: '营收'
        }
      case 'growth':
        return {
          value: item.growth,
          size: Math.max(10, Math.min(50, Math.abs(item.growth) * 2 + 15)),
          color: item.growth > 10 ? '#10b981' : 
                 item.growth > 0 ? '#3b82f6' : 
                 item.growth > -5 ? '#f59e0b' : '#ef4444',
          label: `${item.growth > 0 ? '+' : ''}${item.growth.toFixed(1)}%`,
          unit: '增长率'
        }
      case 'market':
        return {
          value: item.marketSize || 0,
          size: Math.max(10, Math.min(50, ((item.marketSize || 0) / 12500000000) * 400)),
          color: (item.marketSize || 0) > 8000000000 ? '#10b981' : 
                 (item.marketSize || 0) > 3000000000 ? '#3b82f6' : '#f59e0b',
          label: `$${((item.marketSize || 0) / 1e9).toFixed(1)}B`,
          unit: '市场规模'
        }
    }
  }

  // 获取图例数据
  const getLegendData = () => {
    const sortedData = [...data].sort((a, b) => {
      const aInfo = getMarkerInfo(a)
      const bInfo = getMarkerInfo(b)
      return bInfo.value - aInfo.value
    })

    return sortedData.map(item => ({
      ...item,
      ...getMarkerInfo(item)
    }))
  }

  if (!isLoaded) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">加载地图中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* 标题和控制器 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        {showControls && (
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'revenue', label: '营收', icon: DollarSign },
              { key: 'growth', label: '增长', icon: TrendingUp },
              { key: 'market', label: '市场', icon: BarChart3 }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewType(key as any)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewType === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 地图区域 */}
        <div className="flex-1" style={{ height }}>
          <MapContainer
            center={[30, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {data.map((item, index) => {
              const markerInfo = getMarkerInfo(item)
              
              return (
                <CircleMarker
                  key={index}
                  center={item.coordinates}
                  radius={markerInfo.size / 3}
                  fillColor={markerInfo.color}
                  color="white"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.7}
                  eventHandlers={{
                    click: () => setSelectedRegion(item),
                    mouseover: (e) => {
                      e.target.setStyle({ fillOpacity: 0.9 })
                    },
                    mouseout: (e) => {
                      e.target.setStyle({ fillOpacity: 0.7 })
                    }
                  }}
                >
                  <Tooltip>
                    <div className="text-center">
                      <div className="font-semibold">{item.region}</div>
                      <div className="text-sm">{markerInfo.label} {markerInfo.unit}</div>
                    </div>
                  </Tooltip>
                  
                  <Popup>
                    <div className="p-2 min-w-64">
                      <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {item.region}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>营收:</span>
                          <span className="font-medium">${(item.revenue / 1e6).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span>占比:</span>
                          <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>增长率:</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            item.growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.growth > 0 ? '+' : ''}{item.growth.toFixed(1)}%
                          </span>
                        </div>
                        {item.marketSize && (
                          <div className="flex justify-between">
                            <span>市场规模:</span>
                            <span className="font-medium">${(item.marketSize / 1e9).toFixed(1)}B</span>
                          </div>
                        )}
                        {item.competitors && (
                          <div className="flex justify-between">
                            <span>竞争对手:</span>
                            <span className="font-medium">{item.competitors}家</span>
                          </div>
                        )}
                      </div>
                      
                      {item.details && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>人口: {(item.details.population / 1e6).toFixed(0)}M</div>
                            <div>人均GDP: ${item.details.gdpPerCapita.toLocaleString()}</div>
                            <div>互联网普及率: {item.details.internetPenetration}%</div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.details.mainProducts.map((product, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {product}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>

        {/* 图例和统计 */}
        {showLegend && (
          <div className="w-80 space-y-4">
            {/* 当前视图统计 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {viewType === 'revenue' ? '营收分布' : 
                 viewType === 'growth' ? '增长情况' : '市场规模'}
              </h4>
              
              <div className="space-y-2">
                {getLegendData().map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedRegion?.region === item.region ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedRegion(item)}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">{item.region}</div>
                        <div className="text-xs text-gray-500">{item.country}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-sm">{item.label}</div>
                      {viewType === 'revenue' && (
                        <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 选中区域详情 */}
            {selectedRegion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 p-4 rounded-lg border border-blue-200"
              >
                <h4 className="font-medium text-blue-900 mb-3">
                  {selectedRegion.region} 详情
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">营收规模:</span>
                    <span className="font-medium">${(selectedRegion.revenue / 1e6).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">市场份额:</span>
                    <span className="font-medium">{selectedRegion.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">同比增长:</span>
                    <span className={`font-medium ${selectedRegion.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedRegion.growth > 0 ? '+' : ''}{selectedRegion.growth.toFixed(1)}%
                    </span>
                  </div>
                  
                  {selectedRegion.details && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="text-xs text-blue-600 space-y-1">
                        <div>目标人群: {(selectedRegion.details.population / 1e6).toFixed(0)}M</div>
                        <div>购买力: ${selectedRegion.details.gdpPerCapita.toLocaleString()}</div>
                        <div>市场渗透: {selectedRegion.details.internetPenetration}%</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 全球汇总 */}
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${(totalRevenue / 1e6).toFixed(0)}M
              </div>
              <div className="text-sm text-gray-600">全球总营收</div>
              <div className="text-xs text-gray-500 mt-1">
                覆盖 {data.length} 个主要市场
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}