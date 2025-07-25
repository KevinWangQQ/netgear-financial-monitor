import { RevenueAnalysis } from '@/components/RevenueAnalysis'

export default function RevenuePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          营收分析
        </h1>
        <p className="text-lg text-gray-600">
          深度分析Netgear的营收趋势和组成结构
        </p>
      </div>
      
      <RevenueAnalysis />
    </div>
  )
}