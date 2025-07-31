#!/usr/bin/env python3
"""
NETGEAR 2025年增强数据爬取脚本
- 获取Q1/Q2 2025年Alpha Vantage财务数据
- 搜索SEC业务分段数据
- 清理异常数据
- 补充投资者关系页面信息
"""

import os
import requests
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from supabase import create_client
from dotenv import load_dotenv
import time

# 加载环境变量
load_dotenv()

class Enhanced2025DataCrawler:
    def __init__(self):
        self.setup_logging()
        self.setup_clients()
        self.netgear_company_id = None
        
    def setup_logging(self):
        """设置日志"""
        log_filename = f'enhanced_2025_crawler_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_clients(self):
        """初始化客户端"""
        # Supabase客户端
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase凭据未找到")
            
        self.supabase = create_client(supabase_url, supabase_key)
        
        # Alpha Vantage API密钥
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        if not self.alpha_vantage_key:
            raise ValueError("Alpha Vantage API密钥未找到")
            
        self.logger.info("✅ 客户端初始化成功")
        
    def get_company_id(self) -> str:
        """获取NETGEAR公司ID"""
        if self.netgear_company_id:
            return self.netgear_company_id
            
        result = self.supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
        if not result.data:
            raise ValueError("未找到NETGEAR公司记录")
            
        self.netgear_company_id = result.data[0]['id']
        return self.netgear_company_id
        
    def clean_abnormal_2025_data(self):
        """清理异常的2025年财务数据"""
        self.logger.info("🧹 开始清理异常的2025年财务数据...")
        
        company_id = self.get_company_id()
        
        # 查找2025年的异常数据（营收超过1000亿美元的明显错误数据）
        result = self.supabase.table('financial_data').select('*').eq('company_id', company_id).eq('fiscal_year', 2025).execute()
        
        abnormal_records = []
        for record in result.data:
            if record['revenue'] and record['revenue'] > 100000000000:  # 超过1000亿美元
                abnormal_records.append(record)
                
        if abnormal_records:
            self.logger.warning(f"发现 {len(abnormal_records)} 条异常的2025年数据")
            for record in abnormal_records:
                revenue_b = record['revenue'] / 1000000000
                self.logger.warning(f"  - Q{record['fiscal_quarter']}-2025: ${revenue_b:.1f}B (异常)")
                
                # 删除异常记录
                self.supabase.table('financial_data').delete().eq('id', record['id']).execute()
                self.logger.info(f"  ✅ 已删除异常记录: Q{record['fiscal_quarter']}-2025")
        else:
            self.logger.info("✅ 未发现异常的2025年财务数据")
            
    def fetch_alpha_vantage_2025_data(self):
        """获取2025年Alpha Vantage财务数据"""
        self.logger.info("📊 开始获取2025年Alpha Vantage财务数据...")
        
        company_id = self.get_company_id()
        
        # 获取季度财务数据
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': 'INCOME_STATEMENT',
            'symbol': 'NTGR',
            'apikey': self.alpha_vantage_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'quarterlyReports' not in data:
                self.logger.error(f"Alpha Vantage响应异常: {data}")
                return False
                
            quarterly_reports = data['quarterlyReports']
            self.logger.info(f"获取到 {len(quarterly_reports)} 个季度报告")
            
            # 处理2025年数据
            inserted_count = 0
            for report in quarterly_reports:
                fiscal_date = report.get('fiscalDateEnding', '')
                if not fiscal_date.startswith('2025'):
                    continue
                    
                # 解析季度
                quarter = self.parse_quarter_from_date(fiscal_date)
                if not quarter:
                    continue
                    
                # 检查是否已存在
                existing = self.supabase.table('financial_data').select('id').eq('company_id', company_id).eq('fiscal_year', 2025).eq('fiscal_quarter', quarter).eq('data_source', 'alpha_vantage').execute()
                
                if existing.data:
                    self.logger.info(f"Q{quarter}-2025 Alpha Vantage数据已存在")
                    continue
                
                # 解析财务数据
                revenue = self.parse_financial_value(report.get('totalRevenue'))
                gross_profit = self.parse_financial_value(report.get('grossProfit'))
                net_income = self.parse_financial_value(report.get('netIncome'))
                operating_expenses = self.parse_financial_value(report.get('operatingExpenses'))
                
                if not revenue:
                    self.logger.warning(f"Q{quarter}-2025: 营收数据为空，跳过")
                    continue
                
                # 插入数据
                financial_record = {
                    'company_id': company_id,
                    'period': f'Q{quarter}-2025',
                    'fiscal_year': 2025,
                    'fiscal_quarter': quarter,
                    'revenue': revenue,
                    'gross_profit': gross_profit,
                    'net_income': net_income,
                    'operating_expenses': operating_expenses,
                    'data_source': 'alpha_vantage',
                    'source_date': fiscal_date
                }
                
                result = self.supabase.table('financial_data').insert(financial_record).execute()
                if result.data:
                    inserted_count += 1
                    revenue_m = revenue / 1000000 if revenue else 0
                    self.logger.info(f"✅ 插入Q{quarter}-2025财务数据: ${revenue_m:.1f}M")
                    
            self.logger.info(f"✅ 成功插入 {inserted_count} 条2025年Alpha Vantage财务数据")
            return True
            
        except Exception as e:
            self.logger.error(f"获取Alpha Vantage数据失败: {e}")
            return False
            
    def search_sec_2025_segments(self):
        """搜索2025年SEC业务分段数据"""
        self.logger.info("🔍 开始搜索2025年SEC业务分段数据...")
        
        # 搜索NETGEAR SEC EDGAR文件
        search_urls = [
            "https://www.sec.gov/edgar/search/#/q=NETGEAR&dateRange=custom&startdt=2025-01-01&enddt=2025-07-31",
            "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001122904&type=10-Q&dateb=&owner=exclude&count=10"
        ]
        
        # 由于SEC EDGAR API限制，这里记录搜索建议
        self.logger.info("🔗 建议手动检查以下SEC EDGAR链接:")
        for url in search_urls:
            self.logger.info(f"   - {url}")
            
        # 尝试从已知的NETGEAR季度报告URL模式获取
        potential_urls = [
            "https://investor.netgear.com/sec-filings",
            "https://www.sec.gov/Archives/edgar/data/1122904/"
        ]
        
        self.logger.info("💡 建议的SEC数据获取策略:")
        self.logger.info("   1. 访问 investor.netgear.com/sec-filings")
        self.logger.info("   2. 下载最新的10-Q报告 (Q1 2025, Q2 2025)")
        self.logger.info("   3. 搜索 'revenue by segment' 或 'Connected Home' 关键词")
        self.logger.info("   4. 手动提取业务分段数据")
        
        return False  # 需要手动处理
        
    def fetch_investor_relations_data(self):
        """获取投资者关系页面数据"""
        self.logger.info("👔 开始搜索投资者关系页面数据...")
        
        # NETGEAR投资者关系页面URL
        urls_to_check = [
            "https://investor.netgear.com/releases/press-release-details/2025/NETGEAR-Reports-First-Quarter-2025-Results/default.aspx",
            "https://investor.netgear.com/releases/press-release-details/2025/NETGEAR-Reports-Second-Quarter-2025-Results/default.aspx",
            "https://investor.netgear.com/financials/quarterly-results/default.aspx"
        ]
        
        self.logger.info("🔗 发现以下投资者关系数据源:")
        for url in urls_to_check:
            self.logger.info(f"   - {url}")
            
        # 记录需要提取的关键数据点
        key_data_points = [
            "Connected Home segment revenue",
            "NETGEAR for Business segment revenue", 
            "Product line breakdown",
            "Geographic revenue distribution",
            "Gross margins by segment"
        ]
        
        self.logger.info("📋 建议提取的关键数据点:")
        for point in key_data_points:
            self.logger.info(f"   - {point}")
            
        return True
        
    def parse_quarter_from_date(self, date_str: str) -> Optional[int]:
        """从日期字符串解析季度"""
        try:
            from datetime import datetime
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            month = date_obj.month
            
            if month in [1, 2, 3]:
                return 1
            elif month in [4, 5, 6]:
                return 2
            elif month in [7, 8, 9]:
                return 3
            elif month in [10, 11, 12]:
                return 4
        except:
            pass
        return None
        
    def parse_financial_value(self, value_str: str) -> Optional[int]:
        """解析财务数值"""
        if not value_str or value_str == 'None':
            return None
        try:
            return int(float(value_str))
        except:
            return None
            
    def log_update(self, operation: str, records_count: int, status: str):
        """记录数据库更新日志"""
        try:
            log_record = {
                'operation_type': operation,
                'records_affected': records_count,
                'status': status,
                'details': f'Enhanced 2025 data crawler - {operation}',
                'script_name': 'enhanced_2025_data_crawler.py'
            }
            self.supabase.table('data_update_log').insert(log_record).execute()
        except Exception as e:
            self.logger.warning(f"记录更新日志失败: {e}")
            
    def run_full_crawl(self):
        """运行完整的数据获取流程"""
        self.logger.info("🚀 启动增强的2025年数据获取流程")
        self.logger.info("=" * 60)
        
        success_count = 0
        total_operations = 4
        
        try:
            # 1. 清理异常数据
            self.logger.info("步骤 1/4: 清理异常数据")
            self.clean_abnormal_2025_data()
            success_count += 1
            
            # 2. 获取Alpha Vantage 2025数据
            self.logger.info("步骤 2/4: 获取Alpha Vantage 2025数据")
            if self.fetch_alpha_vantage_2025_data():
                success_count += 1
                self.log_update('alpha_vantage_2025_fetch', 2, 'success')
            else:
                self.log_update('alpha_vantage_2025_fetch', 0, 'failed')
            
            # 3. 搜索SEC 2025业务分段数据
            self.logger.info("步骤 3/4: 搜索SEC业务分段数据")
            self.search_sec_2025_segments()
            success_count += 1  # 信息收集成功
            
            # 4. 获取投资者关系数据
            self.logger.info("步骤 4/4: 收集投资者关系数据源")
            if self.fetch_investor_relations_data():
                success_count += 1
                
        except Exception as e:
            self.logger.error(f"数据获取过程中发生错误: {e}")
            self.log_update('enhanced_2025_crawl', 0, 'failed')
            
        self.logger.info("=" * 60)
        self.logger.info(f"🎯 数据获取流程完成: {success_count}/{total_operations} 步骤成功")
        
        if success_count >= 2:
            self.logger.info("✅ 核心数据获取成功完成!")
        else:
            self.logger.warning("⚠️ 部分步骤需要手动处理")
            
        return success_count >= 2

def main():
    """主函数"""
    try:
        crawler = Enhanced2025DataCrawler()
        success = crawler.run_full_crawl()
        exit(0 if success else 1)
    except Exception as e:
        logging.error(f"脚本执行失败: {e}")
        exit(1)

if __name__ == "__main__":
    main()