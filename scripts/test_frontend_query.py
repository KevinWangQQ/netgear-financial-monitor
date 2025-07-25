#!/usr/bin/env python3
"""
测试前端使用的相同查询逻辑
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# 加载环境变量
load_dotenv('../.env.local')

supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print("🧪 测试前端查询逻辑...")

try:
    supabase = create_client(supabase_url, supabase_key)
    
    print("\n1️⃣ 查询NTGR公司ID...")
    # 模拟前端查询：获取Netgear公司ID
    company_result = supabase.table('companies').select('id').eq('symbol', 'NTGR').single().execute()
    
    print(f"查询结果: {company_result}")
    
    if company_result.data:
        company_id = company_result.data['id']
        print(f"✅ 找到NTGR公司ID: {company_id}")
        
        print("\n2️⃣ 查询财务数据...")
        # 模拟前端查询：获取财务数据
        financial_result = supabase.table('financial_data').select('*').eq('company_id', company_id).order('period', desc=True).limit(2).execute()
        
        print(f"财务数据查询结果: {financial_result}")
        
        if financial_result.data:
            print(f"✅ 找到 {len(financial_result.data)} 条财务记录")
            for data in financial_result.data:
                print(f"  - {data['period']}: 营收 ${data['revenue']:,}" if data['revenue'] else f"  - {data['period']}: 营收 N/A")
        else:
            print("❌ 未找到财务数据")
    else:
        print("❌ 未找到NTGR公司")

except Exception as e:
    print(f"❌ 查询失败: {e}")
    print(f"错误类型: {type(e)}")

print("\n✅ 测试完成")