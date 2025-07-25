import { CompetitionAnalysis } from '@/components/CompetitionAnalysis'

export default function CompetitionPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          竞争对比分析
        </h1>
        <p className="text-lg text-gray-600">
          对比分析Netgear与主要竞争对手的财务表现
        </p>
      </div>
      
      <CompetitionAnalysis />
    </div>
  )
}