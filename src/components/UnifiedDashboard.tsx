'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Globe, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Package,
  MessageSquare
} from 'lucide-react'
import { Tab } from '@headlessui/react'
import { toast } from 'react-hot-toast'

// 导入现有组件
import { DashboardOverview } from './DashboardOverview'
import { RevenueAnalysis } from './RevenueAnalysis'
import { CompetitionAnalysis } from './CompetitionAnalysis'
import { KPICard } from './KPICard'

// 导入数据服务
import { financialService, type ProcessedFinancialData } from '@/lib/financial-service'

// 占位符组件
const PlaceholderComponent = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">该模块正在开发中，敬请期待</p>
      <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        开发中...
      </div>
    </div>
  </div>
)

interface TabConfig {
  id: string
  name: string
  icon: React.ReactNode
  component: React.ReactNode
  color: string
}

export function UnifiedDashboard() {
  const [selectedTab, setSelectedTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [financialData, setFinancialData] = useState<ProcessedFinancialData[]>([])
  const [isClient, setIsClient] = useState(false)

  // 客户端挂载标识
  useEffect(() => {
    setIsClient(true)
    setLastUpdated(new Date())
  }, [])

  // 标签页配置
  const tabs: TabConfig[] = [
    {
      id: 'overview',
      name: '财务概览',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <DashboardOverview />,
      color: 'blue'
    },
    {
      id: 'revenue',
      name: '产品分析',
      icon: <Package className="w-4 h-4" />,
      component: <PlaceholderComponent title="产品分析" icon={<Package className="w-8 h-8 text-green-500" />} />,
      color: 'green'
    },
    {
      id: 'competition',
      name: '舆情分析',
      icon: <MessageSquare className="w-4 h-4" />,
      component: <PlaceholderComponent title="舆情分析" icon={<MessageSquare className="w-8 h-8 text-purple-500" />} />,
      color: 'purple'
    }
  ]

  // 获取财务数据
  const fetchFinancialData = async () => {
    setIsLoading(true)
    try {
      // 这里使用模拟数据，实际项目中会调用真实API
      const data = financialService.generateMockData()
      setFinancialData(data)
      setLastUpdated(new Date())
      toast.success('数据更新成功')
    } catch (error) {
      console.error('获取财务数据失败:', error)
      toast.error('数据更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    fetchFinancialData()
  }, [])

  // 计算关键指标
  const latestData = financialData[0]
  const previousData = financialData[1]

  const kpiData = latestData ? [
    {
      title: '总营收',
      value: `$${(latestData.revenue / 1e6).toFixed(1)}M`,
      change: previousData ? 
        parseFloat(((latestData.revenue - previousData.revenue) / previousData.revenue * 100).toFixed(1)) : 
        0,
      changeType: 'increase' as const,
      period: `${latestData.period}`,
      description: '季度总营收规模',
      metricId: 'revenue'
    },
    {
      title: '毛利率',
      value: `${latestData.grossProfitMargin.toFixed(1)}%`,
      change: previousData ? 
        parseFloat((latestData.grossProfitMargin - previousData.grossProfitMargin).toFixed(1)) : 
        0,
      changeType: latestData.grossProfitMargin > (previousData?.grossProfitMargin || 0) ? 
        'increase' as const : 'decrease' as const,
      period: `${latestData.period}`,
      description: '销售毛利润率',
      metricId: 'grossProfitMargin'
    },
    {
      title: '净利率',
      value: `${latestData.netProfitMargin.toFixed(1)}%`,
      change: previousData ? 
        parseFloat((latestData.netProfitMargin - previousData.netProfitMargin).toFixed(1)) : 
        0,
      changeType: latestData.netProfitMargin > (previousData?.netProfitMargin || 0) ? 
        'increase' as const : 'decrease' as const,
      period: `${latestData.period}`,
      description: '净利润率水平',
      metricId: 'netProfitMargin'
    },
    {
      title: 'ROA',
      value: `${latestData.roa.toFixed(1)}%`,
      change: previousData ? 
        parseFloat((latestData.roa - previousData.roa).toFixed(1)) : 
        0,
      changeType: latestData.roa > (previousData?.roa || 0) ? 
        'increase' as const : 'decrease' as const,
      period: `${latestData.period}`,
      description: '资产收益率',
      metricId: 'roa'
    }
  ] : []

  // 格式化日期时间，确保客户端和服务器端一致
  const formatDateTime = (date: Date | null): string => {
    if (!date || !isClient) return '--'
    
    // 使用固定格式避免本地化差异
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Netgear 财务分析平台
              </h1>
              <p className="mt-2 text-gray-600">
                实时监控财务表现 · 智能分析竞争态势 · 数据驱动决策
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 最后更新时间 */}
              <div className="text-sm text-gray-500">
                <Calendar className="w-4 h-4 inline mr-1" />
                更新时间: {formatDateTime(lastUpdated)}
              </div>
              
              {/* 刷新按钮 */}
              <button
                onClick={fetchFinancialData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>刷新数据</span>
              </button>
              
              {/* 导出按钮 */}
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                <span>导出报告</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 卡片区域 */}
      {kpiData.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
              <motion.div
                key={kpi.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <KPICard {...kpi} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          {/* 标签页导航 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <Tab.List className="flex space-x-1 p-1">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.id}
                  className={({ selected }) =>
                    `flex items-center space-x-2 px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                      selected
                        ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-sm`
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </Tab>
              ))}
            </Tab.List>
          </div>

          {/* 标签页内容 */}
          <Tab.Panels>
            <AnimatePresence mode="wait">
              {tabs.map((tab, index) => (
                <Tab.Panel key={tab.id}>
                  {selectedTab === index && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {tab.component}
                    </motion.div>
                  )}
                </Tab.Panel>
              ))}
            </AnimatePresence>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* 页脚信息 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <p>© 2025 Netgear Financial Monitor. 数据仅供参考，不构成投资建议。</p>
            </div>
            <div className="flex items-center space-x-4">
              <span>数据来源: Alpha Vantage API</span>
              <span>•</span>
              <span>更新频率: 实时</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}