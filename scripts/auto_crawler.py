#!/usr/bin/env python3
"""
自动财务数据爬虫 - 生产版本
适用于GitHub Actions自动化执行
"""

import os
import sys
import requests
import time
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional
from supabase import create_client
from dotenv import load_dotenv

# 尝试加载环境变量（支持本地测试）
try:
    load_dotenv('../.env.local')
except:
    pass

class AutoFinancialCrawler:
    def __init__(self):
        # 从环境变量获取配置（兼容本地和GitHub Actions环境）
        self.alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not all([self.alpha_vantage_key, self.supabase_url, self.supabase_key]):
            raise ValueError("缺少必要的环境变量配置")
        
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        self.base_url = 'https://www.alphavantage.co/query'
        
        # 目标公司配置
        self.companies = [
            {'symbol': 'NTGR', 'name': 'NETGEAR Inc', 'priority': 'high'},
            {'symbol': 'CSCO', 'name': 'Cisco Systems Inc', 'priority': 'medium'},
            {'symbol': 'HPE', 'name': 'Hewlett Packard Enterprise', 'priority': 'medium'}
        ]
        
        # 统计信息
        self.stats = {
            'total_requests': 0,
            'successful_updates': 0,
            'failed_requests': 0,
            'companies_processed': 0,
            'start_time': datetime.now(timezone.utc)
        }

    def log(self, message: str, level: str = 'INFO'):
        """统一日志输出"""
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        print(f"[{timestamp}] {level}: {message}")

    def make_api_request(self, params: Dict, max_retries: int = 3) -> Optional[Dict]:
        """发送API请求到Alpha Vantage，支持重试"""
        params['apikey'] = self.alpha_vantage_key
        
        for attempt in range(max_retries):
            try:
                self.log(f"API请求: {params.get('function')} for {params.get('symbol', 'N/A')} (尝试 {attempt + 1}/{max_retries})")
                self.stats['total_requests'] += 1
                
                response = requests.get(self.base_url, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                
                # 检查API错误
                if 'Error Message' in data:
                    self.log(f"API错误: {data['Error Message']}", 'ERROR')
                    return None
                
                if 'Note' in data:
                    self.log(f"API限制: {data['Note']}", 'WARNING')
                    if attempt < max_retries - 1:
                        self.log(f"等待60秒后重试...", 'INFO')
                        time.sleep(60)
                        continue
                    return None
                
                self.log(f"API请求成功", 'SUCCESS')
                return data
                
            except requests.exceptions.RequestException as e:
                self.log(f"请求失败 (尝试 {attempt + 1}): {e}", 'ERROR')
                if attempt < max_retries - 1:
                    time.sleep(10)
        
        self.stats['failed_requests'] += 1
        return None

    def format_period(self, date_string: str) -> str:
        """格式化日期为季度格式"""
        try:
            date = datetime.strptime(date_string, '%Y-%m-%d')
            quarter = (date.month - 1) // 3 + 1
            return f"Q{quarter}-{date.year}"
        except:
            return date_string

    def safe_int(self, value) -> Optional[int]:
        """安全转换为整数"""
        if not value or value == 'None':
            return None
        try:
            return int(float(value))
        except:
            return None

    def get_company_financials(self, company: Dict) -> List[Dict]:
        """获取公司财务数据"""
        symbol = company['symbol']
        financial_data = []
        
        self.log(f"开始处理公司: {company['name']} ({symbol})")
        
        # 获取损益表数据
        income_data = self.make_api_request({
            'function': 'INCOME_STATEMENT',
            'symbol': symbol
        })
        
        if not income_data:
            self.log(f"无法获取 {symbol} 的损益表数据", 'ERROR')
            return []
        
        # API限制：每分钟5次调用
        time.sleep(12)
        
        # 获取资产负债表数据
        balance_data = self.make_api_request({
            'function': 'BALANCE_SHEET',
            'symbol': symbol
        })
        
        if not balance_data:
            self.log(f"无法获取 {symbol} 的资产负债表数据", 'ERROR')  
            return []
        
        # 解析季度数据
        quarterly_income = income_data.get('quarterlyReports', [])[:4]  # 最近4个季度
        quarterly_balance = balance_data.get('quarterlyReports', [])[:4]
        
        if not quarterly_income or not quarterly_balance:
            self.log(f"{symbol} 没有季度数据", 'WARNING')
            return []
        
        for i, income_report in enumerate(quarterly_income):
            if i < len(quarterly_balance):
                balance_report = quarterly_balance[i]
                
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
        
        self.log(f"成功解析 {symbol} 的 {len(financial_data)} 条财务记录")
        return financial_data

    def save_to_database(self, financial_data: List[Dict]) -> int:
        """保存数据到Supabase"""
        saved_count = 0
        
        for data in financial_data:
            try:
                # 获取公司ID
                company_result = self.supabase.table('companies').select('id').eq('symbol', data['symbol']).execute()
                
                if not company_result.data:
                    self.log(f"公司 {data['symbol']} 不存在于数据库中", 'WARNING')
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
                
                self.log(f"保存 {data['symbol']} {data['period']} 成功")
                saved_count += 1
                
            except Exception as e:
                self.log(f"保存 {data['symbol']} {data['period']} 失败: {e}", 'ERROR')
        
        return saved_count

    def crawl_all_companies(self):
        """爬取所有公司的财务数据"""
        self.log("开始自动财务数据爬取")
        
        # 按优先级排序
        sorted_companies = sorted(self.companies, key=lambda x: x['priority'] == 'high', reverse=True)
        
        for company in sorted_companies:
            try:
                self.stats['companies_processed'] += 1
                
                financial_data = self.get_company_financials(company)
                
                if financial_data:
                    saved_count = self.save_to_database(financial_data)
                    self.stats['successful_updates'] += saved_count
                    self.log(f"{company['symbol']} 处理完成，保存 {saved_count} 条记录")
                else:
                    self.log(f"{company['symbol']} 未获取到数据", 'WARNING')
                
                # 避免API限制，等待一段时间
                if company != sorted_companies[-1]:  # 不是最后一个公司
                    self.log("等待30秒以避免API限制...")
                    time.sleep(30)
                    
            except Exception as e:
                self.log(f"处理 {company['symbol']} 时发生错误: {e}", 'ERROR')
        
        self.print_summary()

    def print_summary(self):
        """打印执行摘要"""
        end_time = datetime.now(timezone.utc)
        duration = end_time - self.stats['start_time']
        
        self.log("=== 爬取任务完成 ===")
        self.log(f"执行时间: {duration}")
        self.log(f"处理公司数: {self.stats['companies_processed']}")
        self.log(f"API请求总数: {self.stats['total_requests']}")
        self.log(f"成功更新记录数: {self.stats['successful_updates']}")
        self.log(f"失败请求数: {self.stats['failed_requests']}")
        
        # 输出JSON格式的结果供GitHub Actions使用
        summary = {
            'success': self.stats['failed_requests'] == 0,
            'duration_seconds': duration.total_seconds(),
            'companies_processed': self.stats['companies_processed'],
            'records_updated': self.stats['successful_updates'],
            'api_requests': self.stats['total_requests'],
            'failed_requests': self.stats['failed_requests']
        }
        
        print(f"::set-output name=summary::{json.dumps(summary)}")

if __name__ == "__main__":
    try:
        crawler = AutoFinancialCrawler()
        crawler.crawl_all_companies()
    except Exception as e:
        print(f"[ERROR] 爬虫执行失败: {e}")
        sys.exit(1)