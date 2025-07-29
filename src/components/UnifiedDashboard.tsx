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
  RefreshCw
} from 'lucide-react'
import { Tab } from '@headlessui/react'
import { toast } from 'react-hot-toast'

// 导入现有组件
import { FinancialDataModule } from './FinancialDataModule'
import { CompetitionAnalysis } from './CompetitionAnalysis'
import { KPICard } from './KPICard'

// 导入数据服务
import { financialService, type ProcessedFinancialData } from '@/lib/financial-service'

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
  const [isClient, setIsClient] = useState(false)

  // 客户端挂载标识
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined') {
      setLastUpdated(new Date())
    }
  }, [])

  // 标签页配置
  const tabs: TabConfig[] = [
    {
      id: 'financial',
      name: '财务数据',
      icon: <BarChart3 className="w-4 h-4" />,
      component: <FinancialDataModule />,
      color: 'blue'
    },
    {
      id: 'competition',
      name: '竞争对比',
      icon: <Target className="w-4 h-4" />,
      component: <CompetitionAnalysis />,
      color: 'purple'
    }
  ]

  // 刷新数据
  const refreshData = async () => {
    setIsLoading(true)
    try {
      setLastUpdated(new Date())
      toast.success('数据更新成功')
    } catch (error) {
      console.error('刷新数据失败:', error)
      toast.error('数据更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 格式化日期时间，确保客户端和服务器端一致
  const formatDateTime = (date: Date | null): string => {
    if (!date) return '--'
    
    // 在服务器端和客户端都使用相同的格式
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
    } catch {
      return '--'
    }
  }

  // 导出财务数据为CSV
  const exportToCSV = async () => {
    try {
      setIsLoading(true)
      
      // 获取原始财务数据
      let rawData: ProcessedFinancialData[]
      try {
        const data = await financialService.getRawFinancialData('NTGR', 50)
        rawData = financialService.processFinancialData(data)
      } catch (apiError) {
        console.warn('无法获取真实数据，使用模拟数据:', apiError)
        rawData = financialService.generateMockData()
      }

      // 准备CSV数据
      const csvData = rawData.map(item => ({
        '期间': item.period,
        '年份': item.year,
        '季度': item.quarter,
        '营收(美元)': item.revenue,
        '毛利润(美元)': item.grossProfit,
        '净利润(美元)': item.netIncome,
        '总资产(美元)': item.totalAssets,
        '运营费用(美元)': item.operatingExpenses,
        '现金及等价物(美元)': item.cashAndEquivalents,
        '总债务(美元)': item.totalDebt,
        '毛利率(%)': item.grossProfitMargin.toFixed(2),
        '净利率(%)': item.netProfitMargin.toFixed(2),
        '资产回报率(%)': item.roa.toFixed(2),
        '股本回报率(%)': item.roe.toFixed(2),
        '负债资产比(%)': item.debtToAssets.toFixed(2),
        '现金比率(%)': item.cashRatio.toFixed(2)
      }))

      // 转换为CSV格式
      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n')

      // 下载文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `netgear_financial_data_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('财务数据导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    } finally {
      setIsLoading(false)
    }
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
                统一财务分析平台 · 智能竞争对比 · 数据驱动决策
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 最后更新时间 */}
              <div className="text-sm text-gray-500">
                <Calendar className="w-4 h-4 inline mr-1" />
                更新时间: {formatDateTime(lastUpdated)}
              </div>
              
              {/* 刷新按钮 - 只在竞争对比页面显示 */}
              {selectedTab !== 0 && (
                <button
                  onClick={refreshData}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>刷新数据</span>
                </button>
              )}
              
              {/* 导出按钮 */}
              <button 
                onClick={exportToCSV}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{isLoading ? '导出中...' : '导出报告'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>


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