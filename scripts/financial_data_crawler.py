#!/usr/bin/env python3
"""
Netgear财务数据爬虫脚本
使用Alpha Vantage API获取财务数据并存储到Supabase
"""

import os
import sys
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# 加载环境变量
load_dotenv('../.env.local')

class FinancialDataCrawler:
    def __init__(self):
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.alpha_vantage_key, self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量配置")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.base_url = 'https://www.alphavantage.co/query'
        
        # 主要关注的公司
        self.companies = [
            {'symbol': 'NTGR', 'name': 'NETGEAR Inc'},
            {'symbol': 'CSCO', 'name': 'Cisco Systems Inc'},
            {'symbol': 'HPE', 'name': 'Hewlett Packard Enterprise'}
        ]

    def make_api_request(self, params: Dict) -> Optional[Dict]:
        """发送API请求到Alpha Vantage"""
        params['apikey'] = self.alpha_vantage_key
        
        try:
            print(f"正在请求: {params.get('function')} for {params.get('symbol', 'N/A')}")
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # 检查API错误
            if 'Error Message' in data:
                print(f"API错误: {data['Error Message']}")
                return None
            
            if 'Note' in data:
                print(f"API限制: {data['Note']}")
                return None
            
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"请求失败: {e}")
            return None

    def format_period(self, date_string: str) -> str:
        """格式化日期为季度格式 Q1-2024"""
        try:
            date = datetime.strptime(date_string, '%Y-%m-%d')
            quarter = (date.month - 1) // 3 + 1
            return f"Q{quarter}-{date.year}"
        except:
            return date_string

    def get_company_financials(self, symbol: str) -> List[Dict]:
        """获取公司财务数据"""
        financial_data = []
        
        # 获取损益表数据
        income_params = {
            'function': 'INCOME_STATEMENT',
            'symbol': symbol
        }
        income_data = self.make_api_request(income_params)
        time.sleep(12)  # API限制每分钟5次调用
        
        # 获取资产负债表数据
        balance_params = {
            'function': 'BALANCE_SHEET',
            'symbol': symbol
        }
        balance_data = self.make_api_request(balance_params)
        time.sleep(12)
        
        if not income_data or not balance_data:
            print(f"无法获取 {symbol} 的完整财务数据")
            return []
        
        # 解析季度数据
        quarterly_income = income_data.get('quarterlyReports', [])[:8]  # 最近8个季度
        quarterly_balance = balance_data.get('quarterlyReports', [])[:8]
        
        for i, income_report in enumerate(quarterly_income):
            if i < len(quarterly_balance):
                balance_report = quarterly_balance[i]
                
                # 确保日期匹配
                if income_report.get('fiscalDateEnding') == balance_report.get('fiscalDateEnding'):
                    period = self.format_period(income_report['fiscalDateEnding'])
                    
                    financial_record = {
                        'symbol': symbol,
                        'period': period,
                        'revenue': self.safe_int(income_report.get('totalRevenue')),
                        'gross_profit': self.safe_int(income_report.get('grossProfit')),
                        'net_income': self.safe_int(income_report.get('netIncome')),
                        'total_assets': self.safe_int(balance_report.get('totalAssets')),
                        'operating_expenses': self.safe_int(income_report.get('operatingExpenses')),
                        'cash_and_equivalents': self.safe_int(balance_report.get('cashAndCashEquivalentsAtCarryingValue')),
                        'total_debt': self.safe_int(balance_report.get('shortLongTermDebtTotal'))
                    }
                    
                    financial_data.append(financial_record)
        
        return financial_data

    def safe_int(self, value) -> Optional[int]:
        """安全转换为整数"""
        if not value or value == 'None':
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def save_to_database(self, financial_data: List[Dict]):
        """保存数据到Supabase"""
        for data in financial_data:
            try:
                # 首先获取或创建公司记录
                company_result = self.supabase.table('companies').select('id').eq('symbol', data['symbol']).execute()
                
                if not company_result.data:
                    print(f"公司 {data['symbol']} 不存在于数据库中，跳过")
                    continue
                
                company_id = company_result.data[0]['id']
                
                # 准备财务数据
                financial_record = {
                    'company_id': company_id,
                    'period': data['period'],
                    'revenue': data['revenue'],
                    'gross_profit': data['gross_profit'],
                    'net_income': data['net_income'],
                    'total_assets': data['total_assets'],
                    'operating_expenses': data['operating_expenses'],
                    'cash_and_equivalents': data['cash_and_equivalents'],
                    'total_debt': data['total_debt']
                }
                
                # 使用upsert避免重复插入
                result = self.supabase.table('financial_data').upsert(
                    financial_record,
                    on_conflict='company_id,period'
                ).execute()
                
                print(f"保存 {data['symbol']} {data['period']} 财务数据成功")
                
            except Exception as e:
                print(f"保存数据失败: {e}")

    def crawl_all_companies(self):
        """爬取所有公司的财务数据"""
        print("开始爬取财务数据...")
        
        for company in self.companies:
            print(f"\n处理公司: {company['name']} ({company['symbol']})")
            
            try:
                financial_data = self.get_company_financials(company['symbol'])
                
                if financial_data:
                    print(f"获取到 {len(financial_data)} 条财务记录")
                    self.save_to_database(financial_data)
                else:
                    print("未获取到财务数据")
                    
            except Exception as e:
                print(f"处理 {company['symbol']} 时发生错误: {e}")
            
            # 避免API限制，等待一段时间
            print("等待30秒以避免API限制...")
            time.sleep(30)
        
        print("\n财务数据爬取完成!")

if __name__ == "__main__":
    try:
        crawler = FinancialDataCrawler()
        crawler.crawl_all_companies()
    except Exception as e:
        print(f"爬虫运行失败: {e}")
        sys.exit(1)