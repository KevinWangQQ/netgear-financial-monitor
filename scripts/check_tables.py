#!/usr/bin/env python3
"""
检查数据库表结构
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('../.env.local')

def check_database_tables():
    """检查数据库中的表"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    supabase = create_client(supabase_url, supabase_key)
    
    tables_to_check = [
        'companies',
        'financial_data',
        'product_line_revenue',
        'geographic_revenue',
        'milestone_events',
        'competitor_data',
        'market_metrics'
    ]
    
    print("检查数据库表结构:")
    print("=" * 50)
    
    for table in tables_to_check:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"✅ {table:20} - 存在 ({len(result.data)} 条记录样例)")
        except Exception as e:
            print(f"❌ {table:20} - 不存在或无权限")
    
    print("\n尝试查看companies表结构:")
    try:
        result = supabase.table('companies').select('*').limit(1).execute()
        if result.data:
            print("companies表字段:", list(result.data[0].keys()))
        else:
            print("companies表为空")
    except Exception as e:
        print(f"无法查看companies表: {e}")

if __name__ == "__main__":
    check_database_tables()