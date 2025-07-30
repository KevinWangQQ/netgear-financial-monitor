#!/usr/bin/env python3
"""
清理数据库中的估算数据，只保留来自Alpha Vantage的真实财务数据
"""

import os
import sys
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('../.env.local')

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cleanup_estimated_data.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DataCleanupService:
    def __init__(self):
        """初始化清理服务"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("数据清理服务初始化完成")

    def get_company_id(self, symbol: str):
        """获取公司ID"""
        try:
            result = self.supabase.table('companies').select('id').eq('symbol', symbol).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f"获取公司ID失败 {symbol}: {e}")
            return None

    def analyze_current_data(self, symbol: str = 'NTGR'):
        """分析当前数据库中的数据状况"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                logger.error(f"未找到公司: {symbol}")
                return
            
            logger.info(f"📊 分析 {symbol} 当前数据状况...")
            
            # 检查财务数据
            financial_result = self.supabase.table('financial_data').select('*').eq(
                'company_id', company_id
            ).order('fiscal_year', desc=True).order('fiscal_quarter', desc=True).execute()
            
            logger.info(f"💰 财务数据: {len(financial_result.data)} 条记录")
            if financial_result.data:
                for item in financial_result.data[:5]:  # 显示最近5条
                    source = item.get('data_source', 'unknown')
                    period = item.get('period', 'unknown')
                    revenue = item.get('revenue', 0)
                    logger.info(f"  - {period}: ${revenue/1e6:.1f}M ({source})")
            
            # 检查产品线数据
            product_result = self.supabase.table('product_line_revenue').select('*').eq(
                'company_id', company_id
            ).execute()
            
            logger.info(f"📦 产品线数据: {len(product_result.data)} 条记录")
            
            # 按数据源分类统计
            source_stats = {}
            for item in product_result.data:
                source = item.get('data_source', 'unknown')
                if source not in source_stats:
                    source_stats[source] = {'count': 0, 'periods': set()}
                source_stats[source]['count'] += 1
                source_stats[source]['periods'].add(item.get('period', 'unknown'))
            
            for source, stats in source_stats.items():
                periods = sorted(list(stats['periods']))
                logger.info(f"  - {source}: {stats['count']}条, 期间: {periods}")
            
            # 检查地理数据
            geo_result = self.supabase.table('geographic_revenue').select('*').eq(
                'company_id', company_id
            ).execute()
            
            logger.info(f"🌍 地理数据: {len(geo_result.data)} 条记录")
            
            return {
                'financial': len(financial_result.data),
                'product': len(product_result.data),
                'geographic': len(geo_result.data),
                'product_sources': source_stats
            }
            
        except Exception as e:
            logger.error(f"分析数据失败: {e}")
            return None

    def cleanup_estimated_data(self, symbol: str = 'NTGR', dry_run: bool = True):
        """清理估算数据，只保留真实数据"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                logger.error(f"未找到公司: {symbol}")
                return False
            
            action_word = "模拟删除" if dry_run else "删除"
            logger.info(f"🧹 开始{action_word}估算数据...")
            
            # 删除产品线估算数据
            if dry_run:
                product_estimated = self.supabase.table('product_line_revenue').select('id, period, category_name').eq(
                    'company_id', company_id
                ).eq('data_source', 'estimated').execute()
                
                logger.info(f"📦 将{action_word}产品线估算数据: {len(product_estimated.data)} 条")
                for item in product_estimated.data:
                    logger.info(f"  - {item['period']}: {item['category_name']}")
            else:
                result = self.supabase.table('product_line_revenue').delete().eq(
                    'company_id', company_id
                ).eq('data_source', 'estimated').execute()
                logger.info(f"✅ 删除产品线估算数据完成")
            
            # 删除地理估算数据
            if dry_run:
                geo_estimated = self.supabase.table('geographic_revenue').select('id, period, region').eq(
                    'company_id', company_id
                ).eq('data_source', 'estimated').execute()
                
                logger.info(f"🌍 将{action_word}地理估算数据: {len(geo_estimated.data)} 条")
                for item in geo_estimated.data:
                    logger.info(f"  - {item['period']}: {item['region']}")
            else:
                result = self.supabase.table('geographic_revenue').delete().eq(
                    'company_id', company_id
                ).eq('data_source', 'estimated').execute()
                logger.info(f"✅ 删除地理估算数据完成")
            
            # 保留Alpha Vantage的真实财务数据
            financial_alpha = self.supabase.table('financial_data').select('period').eq(
                'company_id', company_id
            ).eq('data_source', 'alpha_vantage').execute()
            
            logger.info(f"💰 保留Alpha Vantage真实财务数据: {len(financial_alpha.data)} 条")
            for item in financial_alpha.data:
                logger.info(f"  ✅ 保留: {item['period']}")
            
            if not dry_run:
                # 记录清理活动
                self.log_cleanup_activity(symbol, dry_run)
            
            return True
            
        except Exception as e:
            logger.error(f"清理数据失败: {e}")
            return False

    def log_cleanup_activity(self, symbol: str, dry_run: bool):
        """记录清理活动"""
        try:
            log_record = {
                'table_name': 'data_cleanup',
                'update_type': 'delete',
                'company_id': self.get_company_id(symbol),
                'status': 'success',
                'data_source': 'cleanup_service',
                'created_by': 'cleanup_estimated_data.py',
                'error_message': f"清理估算数据 - {'模拟运行' if dry_run else '实际执行'}"
            }
            
            self.supabase.table('data_update_log').insert(log_record).execute()
            
        except Exception as e:
            logger.error(f"记录清理日志失败: {e}")

    def verify_cleanup_result(self, symbol: str = 'NTGR'):
        """验证清理结果"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                return False
            
            logger.info("🔍 验证清理结果...")
            
            # 检查是否还有估算数据
            product_estimated = self.supabase.table('product_line_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            geo_estimated = self.supabase.table('geographic_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            # 检查Alpha Vantage数据是否完整
            financial_data = self.supabase.table('financial_data').select('period').eq(
                'company_id', company_id
            ).eq('data_source', 'alpha_vantage').execute()
            
            logger.info(f"📊 清理验证结果:")
            logger.info(f"  - 剩余产品线估算数据: {len(product_estimated.data)} 条")
            logger.info(f"  - 剩余地理估算数据: {len(geo_estimated.data)} 条")
            logger.info(f"  - Alpha Vantage真实数据: {len(financial_data.data)} 条")
            
            if len(product_estimated.data) == 0 and len(geo_estimated.data) == 0:
                logger.info("✅ 清理成功！所有估算数据已删除")
                return True
            else:
                logger.warning("⚠️ 清理不完整，仍有估算数据残留")
                return False
                
        except Exception as e:
            logger.error(f"验证清理结果失败: {e}")
            return False

def main():
    """主函数"""
    try:
        cleanup_service = DataCleanupService()
        
        # 1. 分析当前数据
        logger.info("=" * 60)
        logger.info("第一步：分析当前数据状况")
        logger.info("=" * 60)
        current_data = cleanup_service.analyze_current_data('NTGR')
        
        if not current_data:
            logger.error("❌ 无法分析当前数据")
            sys.exit(1)
        
        # 2. 模拟清理（dry run）
        logger.info("\n" + "=" * 60)
        logger.info("第二步：模拟清理估算数据（预览）")
        logger.info("=" * 60)
        success = cleanup_service.cleanup_estimated_data('NTGR', dry_run=True)
        
        if not success:
            logger.error("❌ 模拟清理失败")
            sys.exit(1)
        
        # 3. 询问用户是否继续
        print("\n" + "=" * 60)
        print("⚠️  即将删除所有估算数据，只保留Alpha Vantage真实数据")
        print("📋 这意味着：")
        print("   - 删除所有data_source='estimated'的产品线数据")
        print("   - 删除所有data_source='estimated'的地理分布数据") 
        print("   - 保留所有data_source='alpha_vantage'的财务数据")
        print("=" * 60)
        
        user_input = input("是否继续执行清理？(输入 'YES' 确认): ")
        
        if user_input != 'YES':
            logger.info("🚫 用户取消操作")
            sys.exit(0)
        
        # 4. 执行实际清理
        logger.info("\n" + "=" * 60)
        logger.info("第三步：执行实际清理")
        logger.info("=" * 60)
        success = cleanup_service.cleanup_estimated_data('NTGR', dry_run=False)
        
        if not success:
            logger.error("❌ 清理执行失败")
            sys.exit(1)
        
        # 5. 验证结果
        logger.info("\n" + "=" * 60)
        logger.info("第四步：验证清理结果")
        logger.info("=" * 60)
        success = cleanup_service.verify_cleanup_result('NTGR')
        
        if success:
            logger.info("🎉 数据清理成功完成!")
            logger.info("💡 现在系统只包含来自Alpha Vantage的真实财务数据")
            logger.info("📋 产品线视图将显示基于SEC报告的真实业务分段")
            sys.exit(0)
        else:
            logger.error("❌ 清理验证失败")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"清理服务运行异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()