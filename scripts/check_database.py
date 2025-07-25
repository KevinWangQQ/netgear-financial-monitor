#!/usr/bin/env python3
"""
检查Supabase数据库状态
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# 加载环境变量
load_dotenv('../.env.local')

supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print("🔍 检查Supabase数据库状态...")
print(f"URL: {supabase_url}")

try:
    supabase = create_client(supabase_url, supabase_key)
    
    # 检查companies表
    print("\n📋 检查companies表...")
    companies_result = supabase.table('companies').select('*').execute()
    print(f"companies表记录数: {len(companies_result.data)}")
    
    if companies_result.data:
        print("公司列表:")
        for company in companies_result.data:
            print(f"  - {company['symbol']}: {company['name']}")
    else:
        print("❌ companies表为空！")
    
    # 检查financial_data表
    print("\n💰 检查financial_data表...")
    financial_result = supabase.table('financial_data').select('*').execute()
    print(f"financial_data表记录数: {len(financial_result.data)}")
    
    if financial_result.data:
        print("财务数据概览:")
        for data in financial_result.data[:5]:  # 显示前5条
            print(f"  - {data['period']}: 营收 ${data['revenue']:,}" if data['revenue'] else f"  - {data['period']}: 营收 N/A")
    else:
        print("❌ financial_data表为空！")

except Exception as e:
    print(f"❌ 数据库连接失败: {e}")

print("\n✅ 数据库检查完成")