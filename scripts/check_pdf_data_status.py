#!/usr/bin/env python3
"""
检查PDF数据在Supabase中的具体状态
"""

import os
import logging
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class CheckPDFDataStatus:
    def __init__(self):
        self.setup_logging()
        self.setup_supabase()
        self.netgear_company_id = None
        
    def setup_logging(self):
        """设置日志"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_supabase(self):
        """初始化Supabase客户端"""
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase凭据未找到")
            
        self.supabase = create_client(supabase_url, supabase_key)
        self.logger.info("✅ Supabase客户端初始化成功")
        
    def get_company_id(self) -> str:
        """获取NETGEAR公司ID"""
        if self.netgear_company_id:
            return self.netgear_company_id
            
        result = self.supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
        if not result.data:
            raise ValueError("未找到NETGEAR公司记录")
            
        self.netgear_company_id = result.data[0]['id']
        return self.netgear_company_id
    
    def check_pdf_data_status(self):
        """检查PDF数据状态"""
        self.logger.info("🔍 检查PDF数据在Supabase中的状态...")
        
        company_id = self.get_company_id()
        
        # 检查所有数据源类型
        all_segments = self.supabase.table('product_line_revenue').select('*').eq('company_id', company_id).execute()
        all_financial = self.supabase.table('financial_data').select('*').eq('company_id', company_id).execute()
        
        self.logger.info(f"📊 总数据统计:")
        self.logger.info(f"   - 财务数据总数: {len(all_financial.data)}")
        self.logger.info(f"   - 分段数据总数: {len(all_segments.data)}")
        
        # 按数据源分类财务数据
        financial_by_source = {}
        for record in all_financial.data:
            source = record.get('data_source', 'unknown')
            if source not in financial_by_source:
                financial_by_source[source] = []
            financial_by_source[source].append(record)
        
        self.logger.info("\n💰 财务数据按来源分类:")
        for source, records in financial_by_source.items():
            self.logger.info(f"   - {source}: {len(records)}条")
            for record in records[:3]:  # 只显示前3条
                revenue_m = (record.get('revenue', 0) or 0) / 1000000
                self.logger.info(f"     * {record['period']}: ${revenue_m:.1f}M")
        
        # 按数据源分类分段数据
        segment_by_source = {}
        for record in all_segments.data:
            source = record.get('data_source', 'unknown')
            if source not in segment_by_source:
                segment_by_source[source] = []
            segment_by_source[source].append(record)
        
        self.logger.info("\n📈 分段数据按来源分类:")
        for source, records in segment_by_source.items():
            self.logger.info(f"   - {source}: {len(records)}条")
            # 显示具体的期间和分段
            periods = set(r['period'] for r in records)
            for period in sorted(periods)[:2]:  # 只显示前2个期间
                period_records = [r for r in records if r['period'] == period]
                segments = [r['category_name'] for r in period_records]
                self.logger.info(f"     * {period}: {segments}")
        
        # 特别检查official_pdf_report数据源
        pdf_financial = [r for r in all_financial.data if r.get('data_source') == 'official_pdf_report']
        pdf_segments = [r for r in all_segments.data if r.get('data_source') == 'official_pdf_report']
        
        self.logger.info(f"\n📄 PDF官方数据状态:")
        self.logger.info(f"   - PDF财务数据: {len(pdf_financial)}条")
        self.logger.info(f"   - PDF分段数据: {len(pdf_segments)}条")
        
        if pdf_financial:
            self.logger.info("   PDF财务数据详情:")
            for record in pdf_financial:
                revenue_m = (record.get('revenue', 0) or 0) / 1000000
                self.logger.info(f"     * {record['period']}: ${revenue_m:.1f}M")
        
        if pdf_segments:
            self.logger.info("   PDF分段数据详情:")
            for record in pdf_segments:
                revenue_m = (record.get('revenue', 0) or 0) / 1000000
                self.logger.info(f"     * {record['period']} - {record['category_name']}: ${revenue_m:.1f}M")
        
        # 数据源占比分析
        total_segments = len(all_segments.data)
        if total_segments > 0:
            for source, records in segment_by_source.items():
                percentage = len(records) / total_segments * 100
                self.logger.info(f"\n📊 {source} 占比: {percentage:.1f}% ({len(records)}/{total_segments})")
        
        return True

def main():
    """主函数"""
    try:
        checker = CheckPDFDataStatus()
        success = checker.check_pdf_data_status()
        exit(0 if success else 1)
    except Exception as e:
        logging.error(f"脚本执行失败: {e}")
        exit(1)

if __name__ == "__main__":
    main()