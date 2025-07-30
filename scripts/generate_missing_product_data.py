#!/usr/bin/env python3
"""
专门用于为现有财务数据生成缺失的产品线估算数据
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
        logging.FileHandler('generate_product_data.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ProductLineDataGenerator:
    def __init__(self):
        """初始化生成器"""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("产品线数据生成器初始化完成")

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

    def generate_all_missing_product_data(self, symbol: str = 'NTGR'):
        """为所有缺失的财务期间生成产品线数据"""
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                logger.error(f"未找到公司: {symbol}")
                return False
            
            # 获取所有财务数据
            financial_result = self.supabase.table('financial_data').select('*').eq(
                'company_id', company_id
            ).order('fiscal_year', desc=True).order('fiscal_quarter', desc=True).execute()
            
            if not financial_result.data:
                logger.error(f"未找到 {symbol} 的财务数据")
                return False
            
            logger.info(f"找到 {len(financial_result.data)} 个财务期间")
            
            # 获取现有的产品线数据期间
            existing_result = self.supabase.table('product_line_revenue').select('period').eq(
                'company_id', company_id
            ).execute()
            
            existing_periods = set(item['period'] for item in existing_result.data)
            logger.info(f"现有产品线数据期间: {sorted(existing_periods)}")
            
            # 为缺失的期间生成数据
            generated_count = 0
            for financial_data in financial_result.data:
                period = financial_data['period']
                revenue = financial_data['revenue']
                year = financial_data['fiscal_year']
                quarter = financial_data['fiscal_quarter']
                
                if period in existing_periods:
                    logger.info(f"跳过已存在的期间: {period}")
                    continue
                
                if not revenue or revenue <= 0:
                    logger.warning(f"跳过营收为空的期间: {period}")
                    continue
                
                logger.info(f"为 {period} 生成产品线数据 (营收: ${revenue/1e6:.1f}M)")
                
                # 生成产品线数据
                self.generate_product_line_data(company_id, period, year, quarter, revenue)
                
                # 生成地理分布数据
                self.generate_geographic_data(company_id, period, year, quarter, revenue)
                
                generated_count += 1
            
            logger.info(f"✅ 成功为 {generated_count} 个期间生成产品线数据")
            return generated_count > 0
            
        except Exception as e:
            logger.error(f"生成产品线数据失败: {e}")
            return False

    def generate_product_line_data(self, company_id: str, period: str, year: int, quarter: int, revenue: int):
        """生成产品线估算数据"""
        try:
            # 基于NETGEAR业务结构的产品线分布
            product_lines = [
                # 一级分类
                {'level': 1, 'name': '消费级网络产品', 'percentage': 0.68, 'margin': 28.5},
                {'level': 1, 'name': '商用/企业级产品', 'percentage': 0.22, 'margin': 32.8},
                {'level': 1, 'name': '服务与软件', 'percentage': 0.10, 'margin': 65.5},
                
                # 二级分类 - 消费级
                {'level': 2, 'name': 'WiFi路由器', 'percentage': 0.40, 'margin': 28.0},
                {'level': 2, 'name': '网络扩展器/Mesh系统', 'percentage': 0.18, 'margin': 25.0},
                {'level': 2, 'name': '网络存储(NAS)', 'percentage': 0.10, 'margin': 32.0},
                
                # 二级分类 - 企业级
                {'level': 2, 'name': '企业级路由器', 'percentage': 0.10, 'margin': 35.0},
                {'level': 2, 'name': '交换机', 'percentage': 0.08, 'margin': 30.0},
                {'level': 2, 'name': '无线接入点', 'percentage': 0.04, 'margin': 38.0},
                
                # 二级分类 - 服务软件
                {'level': 2, 'name': 'Armor安全服务', 'percentage': 0.05, 'margin': 65.0},
                {'level': 2, 'name': 'Insight网络管理', 'percentage': 0.03, 'margin': 70.0},
                {'level': 2, 'name': '其他服务', 'percentage': 0.02, 'margin': 60.0}
            ]
            
            records = []
            for product in product_lines:
                product_revenue = int(revenue * product['percentage'])
                
                # 基于年份和产品类型调整增长率
                base_growth = 5 + (hash(product['name'] + str(year)) % 20)  # 5-25%
                yoy_growth = max(0, base_growth - (2025 - year) * 2)  # 历史年份增长率适当降低
                qoq_growth = 2 + (hash(product['name'] + period) % 15)  # 2-17%
                
                record = {
                    'company_id': company_id,
                    'period': period,
                    'fiscal_year': year,
                    'fiscal_quarter': quarter,
                    'category_level': product['level'],
                    'category_name': product['name'],
                    'revenue': product_revenue,
                    'revenue_percentage': product['percentage'] * 100,
                    'gross_margin': product['margin'],
                    'yoy_growth': yoy_growth,
                    'qoq_growth': qoq_growth,
                    'data_source': 'estimated',
                    'estimation_method': 'historical_financial_based'
                }
                records.append(record)
            
            # 批量插入
            result = self.supabase.table('product_line_revenue').insert(records).execute()
            logger.info(f"插入 {len(records)} 条产品线记录到 {period}")
            
        except Exception as e:
            logger.error(f"生成产品线数据失败 {period}: {e}")

    def generate_geographic_data(self, company_id: str, period: str, year: int, quarter: int, revenue: int):
        """生成地理分布估算数据"""
        try:
            # 基于NETGEAR地理分布
            regions = [
                {'region': '北美', 'country': 'United States', 'code': 'US', 'percentage': 0.55, 
                 'lat': 37.0902, 'lng': -95.7129, 'market_size': 12500000000},
                {'region': '欧洲', 'country': 'Germany', 'code': 'DE', 'percentage': 0.28,
                 'lat': 51.1657, 'lng': 10.4515, 'market_size': 8200000000},
                {'region': '亚太', 'country': 'Japan', 'code': 'JP', 'percentage': 0.17,
                 'lat': 36.2048, 'lng': 138.2529, 'market_size': 5800000000}
            ]
            
            records = []
            for region in regions:
                region_revenue = int(revenue * region['percentage'])
                
                # 基于年份调整增长率
                base_yoy_growth = 3 + (hash(region['region'] + str(year)) % 15)
                yoy_growth = max(0, base_yoy_growth - (2025 - year) * 1.5)
                qoq_growth = 1 + (hash(region['region'] + period) % 10)
                
                record = {
                    'company_id': company_id,
                    'period': period,
                    'fiscal_year': year,
                    'fiscal_quarter': quarter,
                    'region': region['region'],
                    'country': region['country'],
                    'country_code': region['code'],
                    'revenue': region_revenue,
                    'revenue_percentage': region['percentage'] * 100,
                    'market_size': region['market_size'],
                    'market_share': (region_revenue / region['market_size']) * 100,
                    'competitor_count': 15 + (hash(region['region']) % 10),
                    'yoy_growth': yoy_growth,
                    'qoq_growth': qoq_growth,
                    'latitude': region['lat'],
                    'longitude': region['lng'],
                    'data_source': 'estimated'
                }
                records.append(record)
            
            # 插入数据
            result = self.supabase.table('geographic_revenue').insert(records).execute()
            logger.info(f"插入 {len(records)} 条地理分布记录到 {period}")
            
        except Exception as e:
            logger.error(f"生成地理分布数据失败 {period}: {e}")

def main():
    """主函数"""
    try:
        generator = ProductLineDataGenerator()
        success = generator.generate_all_missing_product_data('NTGR')
        
        if success:
            logger.info("🎉 产品线数据生成完成!")
            sys.exit(0)
        else:
            logger.error("❌ 产品线数据生成失败")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"运行异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()