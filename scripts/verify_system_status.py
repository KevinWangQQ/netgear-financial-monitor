#!/usr/bin/env python3
"""
验证系统运行状态和数据完整性
"""

import os
import sys
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('.env.local')
load_dotenv('../.env.local')

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class SystemStatusVerifier:
    def __init__(self):
        """初始化验证服务"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("系统状态验证服务初始化完成")

    def get_company_id(self, symbol: str = 'NTGR'):
        """获取公司ID"""
        try:
            result = self.supabase.table('companies').select('id').eq('symbol', symbol).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f"获取公司ID失败: {e}")
            return None

    def verify_financial_data(self, symbol: str = 'NTGR'):
        """验证财务数据状态"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                return False
            
            logger.info("💰 验证Alpha Vantage真实财务数据...")
            
            result = self.supabase.table('financial_data').select('*').eq(
                'company_id', company_id
            ).eq('data_source', 'alpha_vantage').order('fiscal_year', desc=True).order('fiscal_quarter', desc=True).execute()
            
            if not result.data:
                logger.error("❌ 未找到Alpha Vantage财务数据")
                return False
            
            logger.info(f"✅ 找到 {len(result.data)} 条Alpha Vantage财务数据:")
            for item in result.data[:5]:
                period = item['period']
                revenue = item.get('revenue', 0)
                logger.info(f"  - {period}: ${revenue/1e6:.1f}M")
            
            return True
            
        except Exception as e:
            logger.error(f"验证财务数据失败: {e}")
            return False

    def verify_segment_data(self, symbol: str = 'NTGR'):
        """验证真实业务分段数据"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                return False
            
            logger.info("📊 验证SEC真实业务分段数据...")
            
            result = self.supabase.table('product_line_revenue').select('*').eq(
                'company_id', company_id
            ).eq('data_source', 'sec_filing').order('fiscal_year', desc=True).order('fiscal_quarter', desc=True).execute()
            
            if not result.data:
                logger.error("❌ 未找到SEC业务分段数据")
                return False
            
            # 按年度统计
            year_stats = {}
            for record in result.data:
                year = record['fiscal_year']
                category = record['category_name']
                revenue = record['revenue']
                
                if year not in year_stats:
                    year_stats[year] = {}
                if category not in year_stats[year]:
                    year_stats[year][category] = []
                
                year_stats[year][category].append(revenue)
            
            logger.info(f"✅ 找到 {len(result.data)} 条SEC业务分段数据:")
            for year in sorted(year_stats.keys(), reverse=True):
                logger.info(f"  {year}年:")
                for category, revenues in year_stats[year].items():
                    category_total = sum(revenues)
                    logger.info(f"    - {category}: ${category_total/1e6:.1f}M ({len(revenues)}个季度)")
            
            return True
            
        except Exception as e:
            logger.error(f"验证业务分段数据失败: {e}")
            return False

    def verify_estimated_data_cleanup(self, symbol: str = 'NTGR'):
        """验证估算数据清理状态"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                return False
            
            logger.info("🧹 验证估算数据清理状态...")
            
            # 检查产品线估算数据
            product_estimated = self.supabase.table('product_line_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            # 检查地理估算数据
            geo_estimated = self.supabase.table('geographic_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            if len(product_estimated.data) == 0 and len(geo_estimated.data) == 0:
                logger.info("✅ 估算数据清理完成 - 无剩余估算数据")
                return True
            else:
                logger.warning(f"⚠️ 发现剩余估算数据: 产品线{len(product_estimated.data)}条, 地理{len(geo_estimated.data)}条")
                return False
                
        except Exception as e:
            logger.error(f"验证数据清理状态失败: {e}")
            return False

    def verify_data_update_logs(self):
        """验证数据更新日志"""
        try:
            logger.info("📝 验证最近的数据更新日志...")
            
            result = self.supabase.table('data_update_log').select('*').order('created_at', desc=True).limit(5).execute()
            
            if not result.data:
                logger.warning("⚠️ 未找到数据更新日志")
                return False
            
            logger.info(f"✅ 找到 {len(result.data)} 条最近的更新日志:")
            for log in result.data:
                created_by = log.get('created_by', 'unknown')
                records_affected = log.get('records_affected', 0)
                status = log.get('status', 'unknown')
                created_at = log.get('created_at', '')[:19]  # 只显示日期时间部分
                logger.info(f"  - {created_at}: {created_by} - {records_affected}条记录 ({status})")
            
            return True
            
        except Exception as e:
            logger.error(f"验证更新日志失败: {e}")
            return False

    def run_complete_verification(self):
        """运行完整的系统验证"""
        logger.info("=" * 60)
        logger.info("🔍 开始完整的系统状态验证")
        logger.info("=" * 60)
        
        checks = [
            ("Alpha Vantage财务数据", self.verify_financial_data),
            ("SEC业务分段数据", self.verify_segment_data),
            ("估算数据清理状态", self.verify_estimated_data_cleanup),
            ("数据更新日志", self.verify_data_update_logs)
        ]
        
        results = []
        for check_name, check_func in checks:
            try:
                result = check_func()
                results.append((check_name, result))
                logger.info(f"{'✅' if result else '❌'} {check_name}: {'通过' if result else '失败'}")
            except Exception as e:
                logger.error(f"❌ {check_name}: 异常 - {e}")
                results.append((check_name, False))
        
        logger.info("=" * 60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        if passed == total:
            logger.info("🎉 系统验证全部通过!")
            logger.info("📊 数据真实性重构成功完成")
            logger.info("🔍 系统现在只包含真实、可验证的财务数据")
            logger.info("=" * 60)
            return True
        else:
            logger.warning(f"⚠️ 系统验证通过 {passed}/{total} 项检查")
            logger.warning("需要进一步调查失败的检查项")
            logger.info("=" * 60)
            return False

def main():
    """主函数"""
    try:
        verifier = SystemStatusVerifier()
        success = verifier.run_complete_verification()
        
        if success:
            logger.info("✅ 系统状态验证成功完成!")
            sys.exit(0)
        else:
            logger.error("❌ 系统状态验证存在问题")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"系统验证异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()