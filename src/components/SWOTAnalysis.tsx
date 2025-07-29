'use client'

import { Card, Row, Col, Tag, Space, Typography, Progress } from 'antd'
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  ThunderboltOutlined, 
  WarningOutlined,
  TrophyOutlined,
  RocketOutlined,
  SafetyOutlined,
  AlertOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

interface SWOTItem {
  id: string
  text: string
  impact: 'high' | 'medium' | 'low'
  category?: string
}

interface SWOTData {
  strengths: SWOTItem[]
  weaknesses: SWOTItem[]
  opportunities: SWOTItem[]
  threats: SWOTItem[]
}

interface SWOTAnalysisProps {
  data: SWOTData
  companyName?: string
  title?: string
}

export function SWOTAnalysis({ 
  data, 
  companyName = "Netgear", 
  title = "SWOT 战略分析" 
}: SWOTAnalysisProps) {
  
  // 获取影响程度颜色
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#ff4d4f'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }
  
  // 获取影响程度标签
  const getImpactTag = (impact: string) => {
    const configs = {
      high: { color: 'red', text: '高' },
      medium: { color: 'orange', text: '中' },
      low: { color: 'green', text: '低' }
    }
    const config = configs[impact as keyof typeof configs] || { color: 'default', text: '未知' }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 计算SWOT评分
  const calculateScore = (items: SWOTItem[]) => {
    if (items.length === 0) return 0
    const scoreMap = { high: 3, medium: 2, low: 1 }
    const totalScore = items.reduce((sum, item) => sum + scoreMap[item.impact], 0)
    return Math.round((totalScore / (items.length * 3)) * 100)
  }

  const strengthScore = calculateScore(data.strengths)
  const weaknessScore = calculateScore(data.weaknesses)
  const opportunityScore = calculateScore(data.opportunities)
  const threatScore = calculateScore(data.threats)

  // SWOT象限配置
  const swotQuadrants = [
    {
      key: 'strengths',
      title: '优势 (Strengths)',
      icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />,
      items: data.strengths,
      score: strengthScore,
      color: '#f6ffed',
      borderColor: '#52c41a',
      description: '内部优势因素，可以利用来获得竞争优势'
    },
    {
      key: 'weaknesses', 
      title: '劣势 (Weaknesses)',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />,
      items: data.weaknesses,
      score: weaknessScore,
      color: '#fff2f0',
      borderColor: '#ff4d4f',
      description: '内部劣势因素，需要改进和加强的领域'
    },
    {
      key: 'opportunities',
      title: '机会 (Opportunities)', 
      icon: <ThunderboltOutlined style={{ color: '#1890ff', fontSize: '20px' }} />,
      items: data.opportunities,
      score: opportunityScore,
      color: '#f0f8ff',
      borderColor: '#1890ff',
      description: '外部机会因素，可以抓住的市场机遇'
    },
    {
      key: 'threats',
      title: '威胁 (Threats)',
      icon: <WarningOutlined style={{ color: '#faad14', fontSize: '20px' }} />,
      items: data.threats,
      score: threatScore,
      color: '#fffbe6',
      borderColor: '#faad14',
      description: '外部威胁因素，需要防范的风险挑战'
    }
  ]

  return (
    <div className="space-y-6">
      {/* 标题和总体评分 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title level={3} className="m-0 flex items-center gap-2">
            <TrophyOutlined />
            {title}
          </Title>
          <Tag color="blue" className="text-sm">
            {companyName} 战略分析
          </Tag>
        </div>
        
        {/* 总体SWOT评分 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ backgroundColor: '#f6ffed', textAlign: 'center' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <SafetyOutlined style={{ color: '#52c41a' }} />
                <Text strong>优势指数</Text>
              </div>
              <Progress
                type="circle"
                size={60}
                percent={strengthScore}
                strokeColor="#52c41a"
                format={(percent) => `${percent}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ backgroundColor: '#fff2f0', textAlign: 'center' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertOutlined style={{ color: '#ff4d4f' }} />
                <Text strong>劣势指数</Text>
              </div>
              <Progress
                type="circle"
                size={60}
                percent={weaknessScore}
                strokeColor="#ff4d4f"
                format={(percent) => `${percent}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ backgroundColor: '#f0f8ff', textAlign: 'center' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <RocketOutlined style={{ color: '#1890ff' }} />
                <Text strong>机会指数</Text>
              </div>
              <Progress
                type="circle"
                size={60}
                percent={opportunityScore}
                strokeColor="#1890ff"
                format={(percent) => `${percent}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ backgroundColor: '#fffbe6', textAlign: 'center' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <WarningOutlined style={{ color: '#faad14' }} />
                <Text strong>威胁指数</Text>
              </div>
              <Progress
                type="circle"
                size={60}
                percent={threatScore}
                strokeColor="#faad14"
                format={(percent) => `${percent}`}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* SWOT四象限分析 */}
      <Row gutter={[16, 16]} className="swot-quadrants">
        {swotQuadrants.map(quadrant => (
          <Col key={quadrant.key} xs={24} lg={12} className="flex">
            <Card
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {quadrant.icon}
                    <span>{quadrant.title}</span>
                  </div>
                  <Progress
                    percent={quadrant.score}
                    size="small"
                    showInfo={false}
                    strokeColor={quadrant.borderColor}
                    style={{ width: '100px' }}
                  />
                </div>
              }
              className="w-full"
              style={{ 
                backgroundColor: quadrant.color,
                borderLeft: `4px solid ${quadrant.borderColor}`,
                minHeight: '450px',
                height: 'auto'
              }}
              bodyStyle={{ 
                overflow: 'visible',
                paddingBottom: '24px'
              }}
            >
              <Text type="secondary" className="block mb-4 text-sm">
                {quadrant.description}
              </Text>
              
              <div className="space-y-3">
                {quadrant.items.length > 0 ? (
                  quadrant.items.map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <Text className="flex-1">{item.text}</Text>
                        {getImpactTag(item.impact)}
                      </div>
                      {item.category && (
                        <Tag color="blue">{item.category}</Tag>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Text type="secondary">暂无{quadrant.title.split(' ')[0]}数据</Text>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 战略建议 */}
      <Card 
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined />
            战略建议
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="SO策略 (优势-机会)" style={{ backgroundColor: '#f0f9ff' }}>
              <Text className="text-sm">
                利用内部优势抓住外部机会，制定积极进攻战略。
                建议重点关注核心技术优势与市场扩张机会的结合。
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="WO策略 (劣势-机会)" style={{ backgroundColor: '#fff7e6' }}>
              <Text className="text-sm">
                克服内部劣势，利用外部机会。
                建议通过外部合作或投资来弥补不足，抓住市场机遇。
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="ST策略 (优势-威胁)" style={{ backgroundColor: '#f6ffed' }}>
              <Text className="text-sm">
                利用内部优势应对外部威胁，采取多元化战略。
                建议发挥技术和品牌优势，规避市场风险。
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="WT策略 (劣势-威胁)" style={{ backgroundColor: '#fff2f0' }}>
              <Text className="text-sm">
                克服内部劣势，规避外部威胁，采取防御性战略。
                建议优化内部管理，提高抗风险能力。
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}