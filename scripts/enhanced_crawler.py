#!/usr/bin/env python3
"""
增强版财务数据抓取脚本
集成数据库更新功能
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('../.env.local')
load_dotenv('../.env.production')

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('enhanced_crawler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class EnhancedFinancialCrawler:
    def __init__(self):
        """初始化爬虫"""
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.alpha_vantage_key, self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # 要抓取的公司列表
        self.companies = ['NTGR', 'CSCO', 'HPE', 'JNPR']
        
        logger.info("增强版财务数据爬虫初始化完成")

    def get_company_id(self, symbol: str) -> Optional[str]:
        """获取公司ID"""
        try:
            result = self.supabase.table('companies').select('id').eq('symbol', symbol).execute()
            if result.data:
                return result.data[0]['id']
            return None
        except Exception as e:
            logger.error(f"获取公司ID失败 {symbol}: {e}")
            return None

    def fetch_financial_data(self, symbol: str) -> Optional[Dict]:
        """从Alpha Vantage获取财务数据"""
        try:
            # 获取季度财报数据
            url = 'https://www.alphavantage.co/query'
            params = {
                'function': 'INCOME_STATEMENT',
                'symbol': symbol,
                'apikey': self.alpha_vantage_key
            }
            
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            if 'Error Message' in data:
                logger.error(f"API错误 {symbol}: {data['Error Message']}")
                return None
            elif 'Note' in data:
                logger.warning(f"API限制 {symbol}: {data['Note']}")
                return None
            elif 'quarterlyReports' not in data:
                logger.warning(f"无季度数据 {symbol}")
                return None
            
            return data
            
        except Exception as e:
            logger.error(f"获取财务数据失败 {symbol}: {e}")
            return None

    def fetch_balance_sheet(self, symbol: str) -> Optional[Dict]:
        """获取资产负债表数据"""
        try:
            url = 'https://www.alphavantage.co/query'
            params = {
                'function': 'BALANCE_SHEET',
                'symbol': symbol,
                'apikey': self.alpha_vantage_key
            }
            
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            if 'quarterlyReports' in data:
                return data
            else:
                logger.warning(f"无资产负债表数据 {symbol}")
                return None
                
        except Exception as e:
            logger.error(f"获取资产负债表失败 {symbol}: {e}")
            return None

    def fetch_cash_flow(self, symbol: str) -> Optional[Dict]:
        """获取现金流数据"""
        try:
            url = 'https://www.alphavantage.co/query'
            params = {
                'function': 'CASH_FLOW',
                'symbol': symbol,
                'apikey': self.alpha_vantage_key
            }
            
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            if 'quarterlyReports' in data:
                return data
            else:
                logger.warning(f"无现金流数据 {symbol}")
                return None
                
        except Exception as e:
            logger.error(f"获取现金流数据失败 {symbol}: {e}")
            return None

    def parse_quarter_from_date(self, date_str: str) -> tuple:
        """从日期解析季度信息"""
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            year = date.year
            month = date.month
            
            if month in [1, 2, 3]:
                quarter = 1
            elif month in [4, 5, 6]:
                quarter = 2
            elif month in [7, 8, 9]:
                quarter = 3
            else:
                quarter = 4
                
            period = f"Q{quarter}-{year}"
            return period, year, quarter
            
        except Exception as e:
            logger.error(f"解析日期失败 {date_str}: {e}")
            return None, None, None

    def safe_int_convert(self, value: str) -> Optional[int]:
        """安全转换为整数"""
        try:
            if value == 'None' or value is None or value == '':
                return None
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def update_financial_data(self, symbol: str, financial_data: Dict, 
                            balance_sheet: Dict = None, cash_flow: Dict = None) -> int:
        """更新财务数据到数据库"""
        company_id = self.get_company_id(symbol)
        if not company_id:
            logger.error(f"未找到公司 {symbol}")
            return 0
        
        updated_count = 0
        quarterly_reports = financial_data.get('quarterlyReports', [])[:8]  # 最近8个季度
        
        # 获取资产负债表和现金流数据
        balance_reports = {}
        cash_reports = {}
        
        if balance_sheet and 'quarterlyReports' in balance_sheet:
            for report in balance_sheet['quarterlyReports']:
                balance_reports[report['fiscalDateEnding']] = report
                
        if cash_flow and 'quarterlyReports' in cash_flow:
            for report in cash_flow['quarterlyReports']:
                cash_reports[report['fiscalDateEnding']] = report
        
        for report in quarterly_reports:
            try:
                fiscal_date = report['fiscalDateEnding']
                period, year, quarter = self.parse_quarter_from_date(fiscal_date)
                
                if not all([period, year, quarter]):
                    continue
                
                # 获取对应的资产负债表和现金流数据
                balance_report = balance_reports.get(fiscal_date, {})
                cash_report = cash_reports.get(fiscal_date, {})
                
                # 准备财务数据
                financial_record = {
                    'company_id': company_id,
                    'period': period,
                    'fiscal_year': year,
                    'fiscal_quarter': quarter,
                    'revenue': self.safe_int_convert(report.get('totalRevenue')),
                    'gross_profit': self.safe_int_convert(report.get('grossProfit')),
                    'net_income': self.safe_int_convert(report.get('netIncome')),
                    'operating_income': self.safe_int_convert(report.get('operatingIncome')),
                    'operating_expenses': self.safe_int_convert(report.get('operatingExpenses')),
                    'total_assets': self.safe_int_convert(balance_report.get('totalAssets')),
                    'current_assets': self.safe_int_convert(balance_report.get('totalCurrentAssets')),
                    'cash_and_equivalents': self.safe_int_convert(balance_report.get('cashAndCashEquivalentsAtCarryingValue')),
                    'total_debt': self.safe_int_convert(balance_report.get('totalLiabilities')),
                    'current_liabilities': self.safe_int_convert(balance_report.get('totalCurrentLiabilities')),
                    'shareholders_equity': self.safe_int_convert(balance_report.get('totalShareholderEquity')),
                    'operating_cash_flow': self.safe_int_convert(cash_report.get('operatingCashflow')),
                    'investing_cash_flow': self.safe_int_convert(cash_report.get('cashflowFromInvestment')),
                    'financing_cash_flow': self.safe_int_convert(cash_report.get('cashflowFromFinancing')),
                    'data_source': 'alpha_vantage',
                    'confidence_level': 1.0
                }
                
                # 使用upsert插入或更新数据
                result = self.supabase.table('financial_data').upsert(
                    financial_record,
                    on_conflict='company_id,period'
                ).execute()
                
                if result.data:
                    updated_count += len(result.data)
                    logger.info(f"更新 {symbol} {period} 财务数据")
                
            except Exception as e:
                logger.error(f"处理财务数据失败 {symbol} {fiscal_date}: {e}")
                continue
        
        return updated_count

    def update_enhanced_data_based_on_financials(self, symbol: str):
        """基于新的财务数据更新产品线和地理分布数据"""
        if symbol != 'NTGR':  # 目前只为NETGEAR更新增强数据
            return
        
        try:
            company_id = self.get_company_id(symbol)
            if not company_id:
                return
            
            # 获取最新的财务数据
            result = self.supabase.table('financial_data').select('*').eq(
                'company_id', company_id
            ).order('fiscal_year', desc=True).order('fiscal_quarter', desc=True).limit(1).execute()
            
            if not result.data:
                logger.warning(f"未找到 {symbol} 的财务数据")
                return
            
            latest_data = result.data[0]
            revenue = latest_data['revenue']
            period = latest_data['period']
            year = latest_data['fiscal_year']
            quarter = latest_data['fiscal_quarter']
            
            if not revenue:
                logger.warning(f"营收数据为空: {symbol} {period}")
                return
            
            logger.info(f"基于 {symbol} {period} 营收 ${revenue/1e6:.1f}M 更新增强数据")
            
            # 更新产品线数据（基于营收比例）
            self.update_product_line_estimates(company_id, period, year, quarter, revenue)
            
            # 更新地理分布数据
            self.update_geographic_estimates(company_id, period, year, quarter, revenue)
            
        except Exception as e:
            logger.error(f"更新增强数据失败 {symbol}: {e}")

    def update_product_line_estimates(self, company_id: str, period: str, year: int, quarter: int, revenue: int):
        """更新产品线估算数据"""
        try:
            # 删除现有数据
            self.supabase.table('product_line_revenue').delete().eq('company_id', company_id).eq('period', period).execute()
            
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
                    'yoy_growth': 5 + (hash(product['name']) % 20),  # 模拟增长率 5-25%
                    'qoq_growth': 2 + (hash(product['name']) % 15),  # 模拟季度增长 2-17%
                    'data_source': 'estimated',
                    'estimation_method': 'financial_data_based'
                }
                records.append(record)
            
            # 批量插入
            result = self.supabase.table('product_line_revenue').insert(records).execute()
            logger.info(f"更新产品线数据: {len(records)} 条记录")
            
        except Exception as e:
            logger.error(f"更新产品线数据失败: {e}")

    def update_geographic_estimates(self, company_id: str, period: str, year: int, quarter: int, revenue: int):
        """更新地理分布估算数据"""
        try:
            # 删除现有数据
            self.supabase.table('geographic_revenue').delete().eq('company_id', company_id).eq('period', period).execute()
            
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
                    'yoy_growth': 3 + (hash(region['region']) % 15),  # 3-18%
                    'qoq_growth': 1 + (hash(region['region']) % 10),  # 1-11%
                    'latitude': region['lat'],
                    'longitude': region['lng'],
                    'data_source': 'estimated'
                }
                records.append(record)
            
            # 插入数据
            result = self.supabase.table('geographic_revenue').insert(records).execute()
            logger.info(f"更新地理分布数据: {len(records)} 条记录")
            
        except Exception as e:
            logger.error(f"更新地理分布数据失败: {e}")

    def log_update_activity(self, table_name: str, records_affected: int, status: str, error_msg: str = None):
        """记录更新活动"""
        try:
            log_record = {
                'table_name': table_name,
                'update_type': 'full_refresh',
                'records_affected': records_affected,
                'status': status,
                'error_message': error_msg,
                'data_source': 'alpha_vantage',
                'created_by': 'enhanced_crawler'
            }
            
            self.supabase.table('data_update_log').insert(log_record).execute()
            
        except Exception as e:
            logger.error(f"记录更新日志失败: {e}")

    def run_full_update(self):
        """执行完整的数据更新"""
        logger.info("开始执行完整的财务数据更新...")
        
        total_updated = 0
        success_companies = []
        failed_companies = []
        
        for symbol in self.companies:
            try:
                logger.info(f"处理公司: {symbol}")
                
                # 获取收入报表
                financial_data = self.fetch_financial_data(symbol)
                if not financial_data:
                    failed_companies.append(f"{symbol} (无财务数据)")
                    continue
                
                # 获取资产负债表和现金流（为了完整性）
                balance_sheet = self.fetch_balance_sheet(symbol)
                cash_flow = self.fetch_cash_flow(symbol)
                
                # 更新财务数据
                updated = self.update_financial_data(symbol, financial_data, balance_sheet, cash_flow)
                total_updated += updated
                
                if updated > 0:
                    success_companies.append(f"{symbol} ({updated}条)")
                    
                    # 更新增强数据（仅对NETGEAR）
                    if symbol == 'NTGR':
                        self.update_enhanced_data_based_on_financials(symbol)
                else:
                    failed_companies.append(f"{symbol} (更新失败)")
                
                # API限制：每次请求后等待
                import time
                time.sleep(2)  # 避免API限制
                
            except Exception as e:
                logger.error(f"处理公司失败 {symbol}: {e}")
                failed_companies.append(f"{symbol} (异常: {str(e)[:50]})")
                continue
        
        # 记录更新日志
        self.log_update_activity(
            'financial_data', 
            total_updated, 
            'success' if total_updated > 0 else 'failed',
            f"失败公司: {', '.join(failed_companies)}" if failed_companies else None
        )
        
        # 输出总结
        logger.info("=" * 60)
        logger.info(f"数据更新完成！总计更新 {total_updated} 条记录")
        
        if success_companies:
            logger.info(f"✅ 成功: {', '.join(success_companies)}")
        
        if failed_companies:
            logger.warning(f"❌ 失败: {', '.join(failed_companies)}")
        
        logger.info("=" * 60)
        
        return total_updated > 0

def main():
    """主函数"""
    try:
        crawler = EnhancedFinancialCrawler()
        success = crawler.run_full_update()
        
        if success:
            logger.info("🎉 数据更新成功完成!")
            sys.exit(0)
        else:
            logger.error("❌ 数据更新失败")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"爬虫运行异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()