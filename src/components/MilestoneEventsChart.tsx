'use client'

import { Timeline, Card, Tag, Tooltip, Space } from 'antd'
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
  RocketOutlined
} from '@ant-design/icons'

interface MilestoneEvent {
  id: string
  date: string  
  type: 'product_launch' | 'acquisition' | 'market_expansion' | 'financial_milestone' | 'strategic_partnership' | 'regulatory_change'
  title: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
  impactLevel: number // 1-5
  relatedMetrics: string[]
  details?: {
    changeAmount?: number
    changePercentage?: number
    marketSegment?: string
  }
}

interface MilestoneEventsChartProps {
  events: MilestoneEvent[]
  title?: string
  height?: number
  period?: string // 当前期间，用于高亮显示
  isHorizontal?: boolean // 是否横向时间轴
}

export function MilestoneEventsChart({ 
  events, 
  title = "里程碑事件", 
  height = 400,
  period,
  isHorizontal = false
}: MilestoneEventsChartProps) {
  
  // 获取事件类型对应的图标
  const getEventIcon = (type: string, impact: string) => {
    const iconStyle = { fontSize: '16px' }
    
    switch (type) {
      case 'product_launch':
        return <RocketOutlined style={{ ...iconStyle, color: '#1890ff' }} />
      case 'acquisition':
        return <TrophyOutlined style={{ ...iconStyle, color: '#52c41a' }} />
      case 'market_expansion':
        return <CheckCircleOutlined style={{ ...iconStyle, color: '#722ed1' }} />
      case 'financial_milestone':
        return <InfoCircleOutlined style={{ ...iconStyle, color: '#faad14' }} />
      case 'strategic_partnership':
        return <CheckCircleOutlined style={{ ...iconStyle, color: '#13c2c2' }} />
      case 'regulatory_change':
        return <WarningOutlined style={{ ...iconStyle, color: impact === 'negative' ? '#ff4d4f' : '#fa8c16' }} />
      default:
        return <InfoCircleOutlined style={{ ...iconStyle, color: '#d9d9d9' }} />
    }
  }

  // 获取影响标签颜色
  const getImpactColor = (impact: string, level: number) => {
    switch (impact) {
      case 'positive':
        return level >= 4 ? 'green' : 'blue'
      case 'negative':
        return level >= 4 ? 'red' : 'orange'
      default:
        return 'default'
    }
  }

  // 获取事件类型中文名称
  const getEventTypeName = (type: string) => {
    const typeMap = {
      'product_launch': '产品发布',
      'acquisition': '收购兼并',
      'market_expansion': '市场扩张',
      'financial_milestone': '财务里程碑',
      'strategic_partnership': '战略合作',
      'regulatory_change': '监管变化'
    }
    return typeMap[type as keyof typeof typeMap] || '其他事件'
  }

  // 格式化影响程度
  const formatImpactLevel = (level: number) => {
    const levels = ['轻微', '一般', '中等', '显著', '重大']
    return levels[level - 1] || '未知'
  }

  // 排序事件（横向时间轴按日期倒序最新在左，纵向按日期倒序）
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    return timeB - timeA // 都按倒序，最新的在前
  })

  // 准备Timeline数据
  const timelineItems = sortedEvents.map(event => ({
    dot: getEventIcon(event.type, event.impact),
    children: (
      <Card 
        size="small" 
        className={isHorizontal ? "mb-2" : "mb-4"}
        style={{ 
          [isHorizontal ? 'borderTop' : 'borderLeft']: `4px solid ${
            event.impact === 'positive' ? '#52c41a' : 
            event.impact === 'negative' ? '#ff4d4f' : '#d9d9d9'
          }`,
          backgroundColor: period && event.date.includes(period) ? '#f0f8ff' : 'white',
          width: isHorizontal ? '250px' : 'auto',
          minHeight: isHorizontal ? '150px' : 'auto'
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-semibold text-gray-900 m-0">
                {event.title}
              </h4>
              <Tag color={getImpactColor(event.impact, event.impactLevel)}>
                {getEventTypeName(event.type)}
              </Tag>
            </div>
            <p className="text-sm text-gray-600 m-0 mb-2">
              {event.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{event.date}</div>
            <Tooltip title={`影响程度: ${formatImpactLevel(event.impactLevel)}`}>
              <Tag color={getImpactColor(event.impact, event.impactLevel)}>
                影响: {formatImpactLevel(event.impactLevel)}
              </Tag>
            </Tooltip>
          </div>
        </div>
        
        {/* 相关指标 */}
        {event.relatedMetrics.length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-gray-500 mr-2">相关指标:</span>
            <Space size={[0, 4]} wrap>
              {event.relatedMetrics.map(metric => (
                <Tag key={metric} color="blue">
                  {metric}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* 详细影响数据 */}
        {event.details && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <Space size={[8, 4]} wrap>
              {event.details.changeAmount && (
                <span className="text-xs">
                  金额影响: <strong>${(Math.abs(event.details.changeAmount) / 1e6).toFixed(1)}M</strong>
                </span>
              )}
              {event.details.changePercentage && (
                <span className="text-xs">
                  比例影响: <strong>{event.details.changePercentage > 0 ? '+' : ''}{event.details.changePercentage.toFixed(1)}%</strong>
                </span>
              )}
              {event.details.marketSegment && (
                <span className="text-xs">
                  市场细分: <strong>{event.details.marketSegment}</strong>
                </span>
              )}
            </Space>
          </div>
        )}
      </Card>
    )
  }))

  return (
    <Card 
      title={
        <div className="flex items-center gap-2">
          <InfoCircleOutlined />
          {title}
          {period && (
            <Tag color="blue" className="ml-2">
              当前期间: {period}
            </Tag>
          )}
        </div>
      }
      className="w-full"
    >
      <div style={{ 
        height: `${height}px`, 
        overflowY: isHorizontal ? 'hidden' : 'auto',
        overflowX: isHorizontal ? 'auto' : 'hidden'
      }}>
        {sortedEvents.length > 0 ? (
          isHorizontal ? (
            // 自定义水平时间轴
            <div className="relative h-full">
              {/* 主时间轴线 */}
              <div className="absolute top-12 left-4 right-4 h-0.5 bg-gray-200" style={{ zIndex: 0 }}></div>
              
              <div className="flex items-start p-4 gap-8" style={{ minWidth: `${sortedEvents.length * 280}px` }}>
                {sortedEvents.map((event, index) => (
                  <div key={event.id} className="relative flex flex-col items-center">
                    {/* 时间点标记 */}
                    <div className="relative flex flex-col items-center mb-4">
                      <div className="w-6 h-6 rounded-full bg-white border-4 flex items-center justify-center relative z-10"
                           style={{ 
                             borderColor: event.impact === 'positive' ? '#52c41a' : 
                                         event.impact === 'negative' ? '#ff4d4f' : '#d9d9d9'
                           }}>
                        <div className="w-2 h-2 rounded-full"
                             style={{ 
                               backgroundColor: event.impact === 'positive' ? '#52c41a' : 
                                              event.impact === 'negative' ? '#ff4d4f' : '#d9d9d9'
                             }} />
                      </div>
                      <div className="text-xs text-gray-500 mt-2 whitespace-nowrap">
                        {new Date(event.date).toLocaleDateString('zh-CN', { 
                          year: 'numeric', 
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    
                    {/* 事件卡片 */}
                    <Card 
                      size="small" 
                      className="w-64"
                      style={{ 
                        borderTop: `4px solid ${
                          event.impact === 'positive' ? '#52c41a' : 
                          event.impact === 'negative' ? '#ff4d4f' : '#d9d9d9'
                        }`,
                        backgroundColor: period && event.date.includes(period) ? '#f0f8ff' : 'white',
                        minHeight: '120px'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                            {event.title}
                          </h4>
                          <Tag 
                            color={getImpactColor(event.impact, event.impactLevel)}
                            className="text-xs"
                          >
                            {getEventTypeName(event.type)}
                          </Tag>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {event.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          影响程度: {formatImpactLevel(event.impactLevel)}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 垂直时间轴（原有实现）
            <Timeline
              mode="left"
              items={timelineItems}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <InfoCircleOutlined className="text-4xl mb-4" />
              <p>暂无里程碑事件数据</p>
            </div>
          </div>
        )}
      </div>
      
      {/* 统计信息 */}
      {sortedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Space size={[16, 8]} wrap>
            <span className="text-sm text-gray-600">
              总计事件: <strong>{sortedEvents.length}</strong>
            </span>
            <span className="text-sm text-gray-600">
              正面影响: <strong className="text-green-600">
                {sortedEvents.filter(e => e.impact === 'positive').length}
              </strong>
            </span>
            <span className="text-sm text-gray-600">
              负面影响: <strong className="text-red-600">
                {sortedEvents.filter(e => e.impact === 'negative').length}
              </strong>
            </span>
            <span className="text-sm text-gray-600">
              重大事件: <strong className="text-orange-600">
                {sortedEvents.filter(e => e.impactLevel >= 4).length}
              </strong>
            </span>
          </Space>
        </div>
      )}
    </Card>
  )
}