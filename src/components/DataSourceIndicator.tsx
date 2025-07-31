'use client'

import { Tag, Tooltip, Alert } from 'antd'
import { 
  InfoCircleOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons'

export type DataSource = 'api' | 'mock' | 'estimated' | 'predicted' | 'mixed' | 'pdf_official'
export type DataQuality = 'high' | 'medium' | 'low'

interface DataSourceIndicatorProps {
  source: DataSource
  quality?: DataQuality
  lastUpdated?: string
  methodology?: string
  showAlert?: boolean
  size?: 'small' | 'default'
  className?: string
}

export function DataSourceIndicator({
  source,
  quality = 'medium',
  lastUpdated,
  methodology,
  showAlert = false,
  size = 'small',
  className = ''
}: DataSourceIndicatorProps) {
  
  const getSourceConfig = (source: DataSource) => {
    switch (source) {
      case 'api':
        return {
          color: 'green',
          icon: <CheckCircleOutlined />,
          text: '真实数据',
          description: '来自官方API或财务报告的真实数据'
        }
      case 'mock':
        return {
          color: 'orange',
          icon: <WarningOutlined />,
          text: '模拟数据',
          description: '用于演示的模拟数据，非真实财务数据'
        }
      case 'estimated':
        return {
          color: 'blue',
          icon: <InfoCircleOutlined />,
          text: '估算数据',
          description: '基于历史数据和行业标准的合理估算'
        }
      case 'predicted':
        return {
          color: 'purple',
          icon: <ClockCircleOutlined />,
          text: '预测数据',
          description: '基于模型预测的未来数据，存在不确定性'
        }
      case 'mixed':
        return {
          color: 'volcano',
          icon: <InfoCircleOutlined />,
          text: '混合数据',
          description: '包含真实数据和估算数据的组合'
        }
      case 'pdf_official':
        return {
          color: 'green',
          icon: <CheckCircleOutlined />,
          text: '官方PDF',
          description: '从NETGEAR官方财报PDF提取的权威数据'
        }
      default:
        return {
          color: 'default',
          icon: <InfoCircleOutlined />,
          text: '未知来源',
          description: '数据来源不明'
        }
    }
  }

  const getQualityConfig = (quality: DataQuality) => {
    switch (quality) {
      case 'high':
        return { color: 'green', text: '高质量' }
      case 'medium':
        return { color: 'orange', text: '中等质量' }
      case 'low':
        return { color: 'red', text: '低质量' }
      default:
        return { color: 'default', text: '未评估' }
    }
  }

  const sourceConfig = getSourceConfig(source)
  const qualityConfig = getQualityConfig(quality)

  const tooltipContent = (
    <div>
      <div><strong>数据来源:</strong> {sourceConfig.description}</div>
      {methodology && <div><strong>计算方法:</strong> {methodology}</div>}
      {lastUpdated && <div><strong>更新时间:</strong> {lastUpdated}</div>}
      <div><strong>数据质量:</strong> {qualityConfig.text}</div>
    </div>
  )

  return (
    <div className={className}>
      {showAlert && source !== 'api' && (
        <Alert
          message="数据来源提示"
          description={
            <div>
              <p>{sourceConfig.description}</p>
              {methodology && <p><strong>估算方法:</strong> {methodology}</p>}
              {source === 'predicted' && (
                <p><strong>注意:</strong> 预测数据仅供参考，实际结果可能存在显著差异。</p>
              )}
            </div>
          }
          type={source === 'mock' ? 'warning' : 'info'}
          showIcon
          closable
          className="mb-4"
        />
      )}
      
      <div className="flex items-center gap-2">
        <Tooltip title={tooltipContent}>
          <Tag 
            color={sourceConfig.color} 
            icon={sourceConfig.icon}
            className={size === 'small' ? 'text-xs' : ''}
          >
            {sourceConfig.text}
          </Tag>
        </Tooltip>
        
        {quality && quality !== 'medium' && (
          <Tooltip title={`数据质量评估: ${qualityConfig.text}`}>
            <Tag 
              color={qualityConfig.color}
              className={size === 'small' ? 'text-xs' : ''}
            >
              {qualityConfig.text}
            </Tag>
          </Tooltip>
        )}
        
        {lastUpdated && (
          <Tooltip title={`最后更新: ${lastUpdated}`}>
            <Tag className={size === 'small' ? 'text-xs' : ''}>
              {lastUpdated}
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// 预定义的数据源配置
export const DATA_SOURCE_CONFIGS = {
  NETGEAR_FINANCIALS: {
    source: 'api' as DataSource,
    quality: 'high' as DataQuality,
    methodology: '来自SEC财务报告和官方发布',
    lastUpdated: '2024-Q3'
  },
  
  PRODUCT_LINE_ESTIMATED: {
    source: 'estimated' as DataSource,
    quality: 'medium' as DataQuality,
    methodology: '基于财报总收入按行业标准分布比例估算',
    lastUpdated: '基于2024-Q3数据'
  },
  
  GEOGRAPHIC_ESTIMATED: {
    source: 'estimated' as DataSource,
    quality: 'medium' as DataQuality,
    methodology: '基于网络设备行业地区分布和公司公开信息推算',
    lastUpdated: '基于2024年市场数据'
  },
  
  COMPETITOR_MOCK: {
    source: 'mock' as DataSource,
    quality: 'low' as DataQuality,
    methodology: '演示用模拟数据，非真实竞争对手数据',
    lastUpdated: '模拟生成'
  },
  
  FUTURE_PREDICTED: {
    source: 'predicted' as DataSource,
    quality: 'medium' as DataQuality,
    methodology: '基于历史趋势和市场分析的预测模型',
    lastUpdated: '2024年12月预测'
  }
}