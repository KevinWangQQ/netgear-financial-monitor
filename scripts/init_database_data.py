#!/usr/bin/env python3
"""
数据库初始化脚本
插入基础的产品线和地理分布数据
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
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseInitializer:
    def __init__(self):
        """初始化数据库连接"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("缺少必要的环境变量: NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("数据库连接初始化完成")

    def get_company_id(self, symbol: str):
        """获取公司ID"""
        try:
            result = self.supabase.table('companies').select('id').eq('symbol', symbol).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]['id']
            else:
                logger.error(f"未找到公司: {symbol}")
                return None
        except Exception as e:
            logger.error(f"获取公司ID失败: {e}")
            return None

    def insert_product_line_data(self):
        """插入产品线营收数据"""
        logger.info("开始插入产品线数据...")
        
        # 获取NETGEAR公司ID
        netgear_id = self.get_company_id('NTGR')
        if not netgear_id:
            logger.error("无法获取NETGEAR公司ID，跳过产品线数据插入")
            return False

        # Q1-2025 产品线数据 (一级分类)
        product_line_data = [
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'category_level': 1,
                'category_name': '消费级网络产品',
                'revenue': 110200000,
                'revenue_percentage': 68.0,
                'gross_margin': 28.5,
                'yoy_growth': 12.5,
                'qoq_growth': 8.2,
                'data_source': 'estimated',
                'estimation_method': 'industry_analysis'
            },
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'category_level': 1,
                'category_name': '商用/企业级产品',
                'revenue': 35640000,
                'revenue_percentage': 22.0,
                'gross_margin': 32.8,
                'yoy_growth': 15.2,
                'qoq_growth': 5.8,
                'data_source': 'estimated',
                'estimation_method': 'industry_analysis'
            },
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'category_level': 1,
                'category_name': '服务与软件',
                'revenue': 16200000,
                'revenue_percentage': 10.0,
                'gross_margin': 65.5,
                'yoy_growth': 28.5,
                'qoq_growth': 12.1,
                'data_source': 'estimated',
                'estimation_method': 'industry_analysis'
            }
        ]

        # 二级分类数据 - 消费级产品
        product_line_data.extend([
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'category_level': 2,
                'category_name': 'WiFi路由器',
                'revenue': 64800000,
                'revenue_percentage': 40.0,
                'gross_margin': 28.0,
                'yoy_growth': 10.5,
                'qoq_growth': 6.8,
                'data_source': 'estimated',
                'estimation_method': 'market_share_analysis'
            },
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'category_level': 2,
                'category_name': '网络扩展器/Mesh系统',
                'revenue': 29160000,
                'revenue_percentage': 18.0,
                'gross_margin': 25.0,
                'yoy_growth': 18.2,
                'qoq_growth': 12.5,
                'data_source': 'estimated',
                'estimation_method': 'market_share_analysis'
            }
        ])

        try:
            result = self.supabase.table('product_line_revenue').upsert(product_line_data).execute()
            logger.info(f"产品线数据插入成功: {len(product_line_data)} 条记录")
            return True
        except Exception as e:
            logger.error(f"产品线数据插入失败: {e}")
            return False

    def insert_geographic_data(self):
        """插入地理分布数据"""
        logger.info("开始插入地理分布数据...")
        
        # 获取NETGEAR公司ID
        netgear_id = self.get_company_id('NTGR')
        if not netgear_id:
            logger.error("无法获取NETGEAR公司ID，跳过地理分布数据插入")
            return False

        geographic_data = [
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'region': '北美',
                'country': 'United States',
                'country_code': 'US',
                'revenue': 89100000,
                'revenue_percentage': 55.0,
                'market_size': 12500000000,
                'market_share': 8.5,
                'competitor_count': 15,
                'yoy_growth': 8.2,
                'qoq_growth': 5.8,
                'latitude': 37.0902,
                'longitude': -95.7129,
                'data_source': 'market_research'
            },
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'region': '欧洲',
                'country': 'Germany',
                'country_code': 'DE',
                'revenue': 45360000,
                'revenue_percentage': 28.0,
                'market_size': 8200000000,
                'market_share': 6.2,
                'competitor_count': 22,
                'yoy_growth': 12.5,
                'qoq_growth': 8.5,
                'latitude': 51.1657,
                'longitude': 10.4515,
                'data_source': 'market_research'
            },
            {
                'company_id': netgear_id,
                'period': 'Q1-2025',
                'fiscal_year': 2025,
                'fiscal_quarter': 1,
                'region': '亚太',
                'country': 'Japan',
                'country_code': 'JP',
                'revenue': 27540000,
                'revenue_percentage': 17.0,
                'market_size': 5800000000,
                'market_share': 4.8,
                'competitor_count': 18,
                'yoy_growth': 15.8,
                'qoq_growth': 12.2,
                'latitude': 36.2048,
                'longitude': 138.2529,
                'data_source': 'market_research'
            }
        ]

        try:
            result = self.supabase.table('geographic_revenue').upsert(geographic_data).execute()
            logger.info(f"地理分布数据插入成功: {len(geographic_data)} 条记录")
            return True
        except Exception as e:
            logger.error(f"地理分布数据插入失败: {e}")
            return False

    def insert_milestone_events(self):
        """插入里程碑事件数据"""
        logger.info("开始插入里程碑事件数据...")
        
        # 获取NETGEAR公司ID
        netgear_id = self.get_company_id('NTGR')
        if not netgear_id:
            logger.error("无法获取NETGEAR公司ID，跳过里程碑事件数据插入")
            return False

        events_data = [
            {
                'company_id': netgear_id,
                'event_date': '2025-01-15',
                'event_type': 'financial_milestone',
                'title': '发布2025年业绩指引',
                'description': '发布2025年全年营收指引1100M-1200M美元，预期增长8-12%',
                'impact_type': 'positive',
                'impact_level': 4,
                'estimated_revenue_impact': 100000000,
                'estimated_impact_percentage': 10.0,
                'related_metrics': ['revenue', 'guidance'],
                'affected_product_lines': ['所有产品线'],
                'affected_regions': ['全球'],
                'data_source': 'earnings_call',
                'verification_status': 'verified'
            },
            {
                'company_id': netgear_id,
                'event_date': '2025-02-28',
                'event_type': 'product_launch',
                'title': '年度产品规划发布',
                'description': '公布新一年的产品路线图，重点关注5G和Wi-Fi 7技术融合',
                'impact_type': 'positive',
                'impact_level': 3,
                'estimated_revenue_impact': 60000000,
                'estimated_impact_percentage': 6.0,
                'related_metrics': ['innovation', 'technology'],
                'affected_product_lines': ['WiFi路由器', '企业级产品'],
                'affected_regions': ['全球'],
                'data_source': 'press_release',
                'verification_status': 'verified'
            }
        ]

        try:
            result = self.supabase.table('milestone_events').upsert(events_data).execute()
            logger.info(f"里程碑事件数据插入成功: {len(events_data)} 条记录")
            return True
        except Exception as e:
            logger.error(f"里程碑事件数据插入失败: {e}")
            return False

    def run_initialization(self):
        """执行完整的数据库初始化"""
        logger.info("开始数据库初始化流程...")
        
        success_count = 0
        total_tasks = 3
        
        # 1. 插入产品线数据
        if self.insert_product_line_data():
            success_count += 1
        
        # 2. 插入地理分布数据
        if self.insert_geographic_data():
            success_count += 1
        
        # 3. 插入里程碑事件数据
        if self.insert_milestone_events():
            success_count += 1
        
        logger.info(f"数据库初始化完成: {success_count}/{total_tasks} 个任务成功")
        
        if success_count == total_tasks:
            logger.info("🎉 所有数据初始化成功!")
            return True
        else:
            logger.warning(f"⚠️  部分数据初始化失败，成功率: {success_count/total_tasks*100:.1f}%")
            return False

def main():
    """主函数"""
    logger.info("开始数据库数据初始化...")
    
    try:
        initializer = DatabaseInitializer()
        success = initializer.run_initialization()
        
        if success:
            logger.info("数据库初始化全部完成!")
            sys.exit(0)
        else:
            logger.error("数据库初始化部分失败")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"数据库初始化流程异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()