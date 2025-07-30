#!/usr/bin/env python3
"""
简化版财务数据爬虫 - 优先使用增强版，回退到基础版
"""

import os
import sys
import logging
from datetime import datetime

# 尝试使用增强版爬虫，回退到基础版
try:
    from enhanced_crawler import EnhancedFinancialCrawler
    USE_ENHANCED = True
    print("使用增强版财务数据爬虫...")
except ImportError:
    USE_ENHANCED = False
    print("使用基础版财务数据爬虫...")
    
    import requests
    import time
    from dotenv import load_dotenv
    from supabase import create_client

    # 加载环境变量
    load_dotenv('../.env.local')

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawler_log.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

def run_enhanced_crawler():
    """运行增强版爬虫"""
    logger = logging.getLogger(__name__)
    
    try:
        crawler = EnhancedFinancialCrawler()
        success = crawler.run_full_update()
        
        if success:
            logger.info("🎉 增强版数据爬取成功完成!")
            return True
        else:
            logger.error("❌ 增强版数据爬取失败")
            return False
            
    except Exception as e:
        logger.error(f"增强版爬虫运行异常: {e}")
        return False

def run_basic_crawler():
    """运行基础版爬虫（原始逻辑）"""

    logger = logging.getLogger(__name__)
    
    alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    supabase = create_client(supabase_url, supabase_key)
    base_url = 'https://www.alphavantage.co/query'

    def make_api_request(params):
        """发送API请求到Alpha Vantage"""
        params['apikey'] = alpha_vantage_key
    
    try:
        print(f"正在请求: {params.get('function')} for {params.get('symbol', 'N/A')}")
        response = requests.get(base_url, params=params, timeout=30)
        data = response.json()
        
        if 'Error Message' in data:
            print(f"API错误: {data['Error Message']}")
            return None
        
        if 'Note' in data:
            print(f"API限制: {data['Note']}")
            return None
        
        return data
    except Exception as e:
        print(f"请求失败: {e}")
        return None

def format_period(date_string):
    """格式化日期为季度格式"""
    try:
        date = datetime.strptime(date_string, '%Y-%m-%d')
        quarter = (date.month - 1) // 3 + 1
        return f"Q{quarter}-{date.year}"
    except:
        return date_string

def safe_int(value):
    """安全转换为整数"""
    if not value or value == 'None':
        return None
    try:
        return int(float(value))
    except:
        return None

print("开始获取NETGEAR财务数据...")

# 获取NETGEAR公司ID
try:
    company_result = supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
    if not company_result.data:
        print("错误: 未找到NETGEAR公司记录")
        exit(1)
    
    company_id = company_result.data[0]['id']
    print(f"找到NETGEAR公司ID: {company_id}")
    
except Exception as e:
    print(f"获取公司ID失败: {e}")
    exit(1)

# 获取损益表数据
income_params = {
    'function': 'INCOME_STATEMENT',
    'symbol': 'NTGR'
}
income_data = make_api_request(income_params)

if not income_data:
    print("无法获取损益表数据")
    exit(1)

print("等待12秒以避免API限制...")
time.sleep(12)

# 获取资产负债表数据
balance_params = {
    'function': 'BALANCE_SHEET', 
    'symbol': 'NTGR'
}
balance_data = make_api_request(balance_params)

if not balance_data:
    print("无法获取资产负债表数据")
    exit(1)

# 处理数据
quarterly_income = income_data.get('quarterlyReports', [])[:4]  # 最近4个季度
quarterly_balance = balance_data.get('quarterlyReports', [])[:4]

saved_count = 0

for i, income_report in enumerate(quarterly_income):
    if i < len(quarterly_balance):
        balance_report = quarterly_balance[i]
        
        if income_report.get('fiscalDateEnding') == balance_report.get('fiscalDateEnding'):
            period = format_period(income_report['fiscalDateEnding'])
            
            financial_record = {
                'company_id': company_id,
                'period': period,
                'revenue': safe_int(income_report.get('totalRevenue')),
                'gross_profit': safe_int(income_report.get('grossProfit')),
                'net_income': safe_int(income_report.get('netIncome')),
                'total_assets': safe_int(balance_report.get('totalAssets')),
                'operating_expenses': safe_int(income_report.get('operatingExpenses')),
                'cash_and_equivalents': safe_int(balance_report.get('cashAndCashEquivalentsAtCarryingValue')),
                'total_debt': safe_int(balance_report.get('shortLongTermDebtTotal'))
            }
            
            try:
                # 使用upsert避免重复插入
                result = supabase.table('financial_data').upsert(
                    financial_record,
                    on_conflict='company_id,period'
                ).execute()
                
                print(f"✅ 保存 NTGR {period} 财务数据成功")
                saved_count += 1
                
            except Exception as e:
                print(f"❌ 保存数据失败: {e}")

    logger.info(f"🎉 基础版财务数据获取完成! 共保存 {saved_count} 条记录")
    return saved_count > 0

def main():
    """主函数"""
    logger = logging.getLogger(__name__)
    
    if USE_ENHANCED:
        # 尝试使用增强版爬虫
        logger.info("开始运行增强版财务数据爬虫...")
        success = run_enhanced_crawler()
    else:
        # 使用基础版爬虫
        logger.info("开始运行基础版财务数据爬虫...")
        success = run_basic_crawler()
    
    if success:
        logger.info("🎉 数据更新成功完成!")
        logger.info("现在可以启动前端应用查看数据: npm run dev")
        sys.exit(0)
    else:
        logger.error("❌ 数据更新失败")
        sys.exit(1)

if __name__ == "__main__":
    main()