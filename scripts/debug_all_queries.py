#!/usr/bin/env python3
"""
调试所有前端查询，找出具体的错误源
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# 加载环境变量
load_dotenv('../.env.local')

supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print("🔍 调试所有前端查询...")

try:
    supabase = create_client(supabase_url, supabase_key)
    
    print("\n1️⃣ 测试DashboardOverview查询...")
    # DashboardOverview查询
    try:
        companies_result = supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
        print(f"✅ companies查询成功: {len(companies_result.data)} 条记录")
        
        if companies_result.data:
            company_id = companies_result.data[0]['id']
            financial_result = supabase.table('financial_data').select('*').eq('company_id', company_id).order('period', desc=True).limit(2).execute()
            print(f"✅ financial_data查询成功: {len(financial_result.data)} 条记录")
        
    except Exception as e:
        print(f"❌ DashboardOverview查询失败: {e}")
    
    print("\n2️⃣ 测试RevenueAnalysis查询...")
    # RevenueAnalysis查询
    try:
        companies_result = supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
        print(f"✅ companies查询成功: {len(companies_result.data)} 条记录")
        
        if companies_result.data:
            company_id = companies_result.data[0]['id']
            financial_result = supabase.table('financial_data').select('*').eq('company_id', company_id).order('period', desc=True).limit(8).execute()
            print(f"✅ financial_data查询成功: {len(financial_result.data)} 条记录")
        
    except Exception as e:
        print(f"❌ RevenueAnalysis查询失败: {e}")
    
    print("\n3️⃣ 测试CompetitionAnalysis查询...")
    # CompetitionAnalysis查询
    try:
        companies_result = supabase.table('companies').select('*').in_('symbol', ['NTGR', 'CSCO', 'HPE']).execute()
        print(f"✅ companies查询成功: {len(companies_result.data)} 条记录")
        
        for company in companies_result.data:
            financial_result = supabase.table('financial_data').select('*').eq('company_id', company['id']).order('period', desc=True).limit(1).execute()
            print(f"  - {company['symbol']}: {len(financial_result.data)} 条记录")
        
    except Exception as e:
        print(f"❌ CompetitionAnalysis查询失败: {e}")
    
    print("\n4️⃣ 测试数据库权限...")
    # 测试基本权限
    try:
        test_result = supabase.table('companies').select('count').execute()
        print(f"✅ 数据库权限正常")
    except Exception as e:
        print(f"❌ 数据库权限问题: {e}")

except Exception as e:
    print(f"❌ 连接失败: {e}")

print("\n✅ 调试完成")