#!/usr/bin/env python3
"""
自动清理数据库中的估算数据，只保留来自Alpha Vantage的真实财务数据
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
        logging.FileHandler('auto_cleanup_estimated_data.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class AutoDataCleanupService:
    def __init__(self):
        """初始化清理服务"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("自动数据清理服务初始化完成")

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

    def cleanup_estimated_data(self, symbol: str = 'NTGR'):
        """清理估算数据，只保留真实数据"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                logger.error(f"未找到公司: {symbol}")
                return False
            
            logger.info(f"🧹 开始清理 {symbol} 的估算数据...")
            
            # 统计删除前的数据
            product_before = self.supabase.table('product_line_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            geo_before = self.supabase.table('geographic_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            logger.info(f"📊 删除前统计:")
            logger.info(f"  - 产品线估算数据: {len(product_before.data)} 条")
            logger.info(f"  - 地理估算数据: {len(geo_before.data)} 条")
            
            # 删除产品线估算数据
            logger.info("🗑️  删除产品线估算数据...")
            product_result = self.supabase.table('product_line_revenue').delete().eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            logger.info(f"✅ 产品线估算数据删除完成")
            
            # 删除地理估算数据
            logger.info("🗑️  删除地理估算数据...")
            geo_result = self.supabase.table('geographic_revenue').delete().eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            logger.info(f"✅ 地理估算数据删除完成")
            
            # 验证删除结果
            product_after = self.supabase.table('product_line_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            geo_after = self.supabase.table('geographic_revenue').select('id').eq(
                'company_id', company_id
            ).eq('data_source', 'estimated').execute()
            
            logger.info(f"📊 删除后验证:")
            logger.info(f"  - 剩余产品线估算数据: {len(product_after.data)} 条")
            logger.info(f"  - 剩余地理估算数据: {len(geo_after.data)} 条")
            
            # 检查保留的真实数据
            financial_data = self.supabase.table('financial_data').select('period').eq(
                'company_id', company_id
            ).eq('data_source', 'alpha_vantage').execute()
            
            logger.info(f"💰 保留的Alpha Vantage真实财务数据: {len(financial_data.data)} 条")
            for item in financial_data.data:
                logger.info(f"  ✅ 保留: {item['period']}")
            
            # 记录清理活动
            self.log_cleanup_activity(symbol, len(product_before.data), len(geo_before.data))
            
            if len(product_after.data) == 0 and len(geo_after.data) == 0:
                logger.info("🎉 清理成功完成!")
                logger.info("💡 现在系统只包含来自Alpha Vantage的真实财务数据")
                logger.info("📋 产品线视图将显示基于SEC报告的真实业务分段")
                return True
            else:
                logger.warning("⚠️ 清理不完整，仍有估算数据残留")
                return False
                
        except Exception as e:
            logger.error(f"清理数据失败: {e}")
            return False

    def log_cleanup_activity(self, symbol: str, product_deleted: int, geo_deleted: int):
        """记录清理活动"""
        try:
            log_record = {
                'table_name': 'data_cleanup',
                'update_type': 'delete',
                'records_affected': product_deleted + geo_deleted,
                'company_id': self.get_company_id(symbol),
                'status': 'success',
                'data_source': 'cleanup_service',
                'created_by': 'auto_cleanup_estimated_data.py',
                'error_message': f"清理估算数据 - 删除产品线{product_deleted}条, 地理{geo_deleted}条"
            }
            
            self.supabase.table('data_update_log').insert(log_record).execute()
            logger.info("📝 清理活动已记录到日志")
            
        except Exception as e:
            logger.error(f"记录清理日志失败: {e}")

def main():
    """主函数"""
    try:
        logger.info("=" * 60)
        logger.info("🚀 启动自动数据清理服务")
        logger.info("🎯 目标：删除所有估算数据，只保留Alpha Vantage真实数据")
        logger.info("=" * 60)
        
        cleanup_service = AutoDataCleanupService()
        
        success = cleanup_service.cleanup_estimated_data('NTGR')
        
        if success:
            logger.info("=" * 60)
            logger.info("✅ 自动清理成功完成!")
            logger.info("📊 数据库现在只包含真实的财务数据")
            logger.info("🔍 前端将基于SEC报告显示真实的业务分段")
            logger.info("⚠️  对于缺失的细分数据将显示'无可用数据'")
            logger.info("=" * 60)
            sys.exit(0)
        else:
            logger.error("=" * 60)
            logger.error("❌ 自动清理失败")
            logger.error("=" * 60)
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"自动清理服务运行异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()