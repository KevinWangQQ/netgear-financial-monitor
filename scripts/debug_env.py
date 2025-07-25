#!/usr/bin/env python3
"""
调试环境变量加载
"""

import os
from dotenv import load_dotenv

# 加载环境变量
print("加载环境变量文件...")
load_result = load_dotenv('../.env.local')
print(f"load_dotenv结果: {load_result}")

# 检查环境变量
alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print(f"ALPHA_VANTAGE_API_KEY: {'设置' if alpha_vantage_key else '未设置'}")
print(f"NEXT_PUBLIC_SUPABASE_URL: {'设置' if supabase_url else '未设置'}")
print(f"NEXT_PUBLIC_SUPABASE_ANON_KEY: {'设置' if supabase_key else '未设置'}")

if supabase_url:
    print(f"Supabase URL: {supabase_url}")
    
if alpha_vantage_key:
    print(f"Alpha Vantage Key前缀: {alpha_vantage_key[:10]}...")

# 检查所有环境变量
print("\n所有环境变量:")
for key, value in os.environ.items():
    if 'SUPABASE' in key or 'ALPHA' in key:
        print(f"{key}: {value}")