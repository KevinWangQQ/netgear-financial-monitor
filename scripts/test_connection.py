#!/usr/bin/env python3
"""
测试API连接
"""

import os
import requests
from dotenv import load_dotenv
from supabase import create_client

# 加载环境变量
load_dotenv('../.env.local')

alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print("开始测试连接...")

# 测试Supabase连接
try:
    print("1. 测试Supabase连接...")
    supabase = create_client(supabase_url, supabase_key)
    
    # 查询companies表
    result = supabase.table('companies').select('*').limit(1).execute()
    print(f"✅ Supabase连接成功，companies表有 {len(result.data)} 条记录")
    
except Exception as e:
    print(f"❌ Supabase连接失败: {e}")

# 测试Alpha Vantage API连接
try:
    print("\n2. 测试Alpha Vantage API连接...")
    base_url = 'https://www.alphavantage.co/query'
    params = {
        'function': 'OVERVIEW',
        'symbol': 'NTGR',
        'apikey': alpha_vantage_key
    }
    
    response = requests.get(base_url, params=params, timeout=30)
    data = response.json()
    
    if 'Error Message' in data:
        print(f"❌ API错误: {data['Error Message']}")
    elif 'Note' in data:
        print(f"⚠️ API限制: {data['Note']}")
    elif 'Symbol' in data:
        print(f"✅ Alpha Vantage API连接成功，获取到 {data['Symbol']} 数据")
        print(f"   公司名称: {data.get('Name', 'N/A')}")
        print(f"   营收TTM: {data.get('RevenueTTM', 'N/A')}")
    else:
        print(f"⚠️ API响应异常，前100字符: {str(data)[:100]}")
        
except Exception as e:
    print(f"❌ Alpha Vantage API连接失败: {e}")

print("\n连接测试完成！")