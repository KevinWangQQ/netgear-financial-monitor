#!/usr/bin/env python3
"""
数据库更新脚本
用于执行数据库结构迁移和种子数据插入
"""

import os
import sys
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('database_update.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class DatabaseUpdater:
    def __init__(self):
        """初始化数据库连接"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # 需要service role key执行DDL
        
        if not supabase_url or not supabase_key:
            raise ValueError("缺少必要的环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("数据库连接初始化完成")

    def read_sql_file(self, file_path: str) -> str:
        """读取SQL文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except FileNotFoundError:
            logger.error(f"SQL文件不存在: {file_path}")
            raise
        except Exception as e:
            logger.error(f"读取SQL文件失败: {e}")
            raise

    def execute_sql(self, sql_content: str, description: str) -> bool:
        """执行SQL语句"""
        try:
            logger.info(f"开始执行: {description}")
            
            # 分割SQL语句（以分号为分隔符）
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            success_count = 0
            error_count = 0
            
            for i, statement in enumerate(statements):
                try:
                    # 跳过注释行和空行
                    if statement.startswith('--') or not statement:
                        continue
                    
                    # 使用supabase-py的rpc功能执行原始SQL
                    result = self.supabase.rpc('exec_sql', {'sql': statement}).execute()
                    
                    success_count += 1
                    logger.debug(f"SQL语句 {i+1} 执行成功")
                    
                except Exception as stmt_error:
                    error_count += 1
                    logger.warning(f"SQL语句 {i+1} 执行失败: {stmt_error}")
                    # 继续执行其他语句
            
            logger.info(f"{description} 完成: 成功 {success_count} 条, 失败 {error_count} 条")
            return error_count == 0
            
        except Exception as e:
            logger.error(f"执行SQL失败: {description} - {e}")
            return False

    def check_table_exists(self, table_name: str) -> bool:
        """检查表是否存在"""
        try:
            result = self.supabase.table(table_name).select("*").limit(1).execute()
            return True
        except Exception:
            return False

    def backup_existing_data(self):
        """备份现有重要数据"""
        logger.info("开始备份现有数据...")
        
        try:
            # 备份companies表
            companies = self.supabase.table('companies').select('*').execute()
            logger.info(f"备份companies表: {len(companies.data)} 条记录")
            
            # 备份financial_data表
            financial_data = self.supabase.table('financial_data').select('*').execute()
            logger.info(f"备份financial_data表: {len(financial_data.data)} 条记录")
            
            # 将备份数据保存到文件
            backup_time = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir = f"backup_{backup_time}"
            os.makedirs(backup_dir, exist_ok=True)
            
            import json
            with open(f"{backup_dir}/companies_backup.json", 'w') as f:
                json.dump(companies.data, f, indent=2, default=str)
            
            with open(f"{backup_dir}/financial_data_backup.json", 'w') as f:
                json.dump(financial_data.data, f, indent=2, default=str)
                
            logger.info(f"数据备份完成: {backup_dir}")
            return True
            
        except Exception as e:
            logger.error(f"数据备份失败: {e}")
            return False

    def run_migration(self):
        """执行数据库迁移"""
        logger.info("开始数据库结构迁移...")
        
        # 1. 备份现有数据
        if not self.backup_existing_data():
            logger.error("数据备份失败，停止迁移")
            return False
        
        # 2. 执行迁移SQL
        migration_file = os.path.join(os.path.dirname(__file__), '..', 'database', 'migration_to_complete_schema.sql')
        
        if not os.path.exists(migration_file):
            logger.error(f"迁移文件不存在: {migration_file}")
            return False
        
        try:
            migration_sql = self.read_sql_file(migration_file)
            success = self.execute_sql(migration_sql, "数据库结构迁移")
            
            if success:
                logger.info("数据库结构迁移完成")
                return True
            else:
                logger.error("数据库结构迁移失败")
                return False
                
        except Exception as e:
            logger.error(f"数据库迁移异常: {e}")
            return False

    def run_seed_data(self):
        """插入种子数据"""
        logger.info("开始插入种子数据...")
        
        seed_file = os.path.join(os.path.dirname(__file__), '..', 'database', 'seed_data.sql')
        
        if not os.path.exists(seed_file):
            logger.error(f"种子数据文件不存在: {seed_file}")
            return False
        
        try:
            seed_sql = self.read_sql_file(seed_file)
            success = self.execute_sql(seed_sql, "种子数据插入")
            
            if success:
                logger.info("种子数据插入完成")
                return True
            else:
                logger.error("种子数据插入失败")
                return False
                
        except Exception as e:
            logger.error(f"种子数据插入异常: {e}")
            return False

    def verify_database_structure(self):
        """验证数据库结构"""
        logger.info("验证数据库结构...")
        
        required_tables = [
            'companies',
            'financial_data', 
            'product_line_revenue',
            'geographic_revenue',
            'milestone_events',
            'competitor_data',
            'market_metrics',
            'data_update_log'
        ]
        
        missing_tables = []
        for table in required_tables:
            if not self.check_table_exists(table):
                missing_tables.append(table)
        
        if missing_tables:
            logger.error(f"缺少以下表: {', '.join(missing_tables)}")
            return False
        
        logger.info("数据库结构验证通过")
        return True

    def test_data_access(self):
        """测试数据访问"""
        logger.info("测试数据访问...")
        
        try:
            # 测试公司数据
            companies = self.supabase.table('companies').select('*').limit(5).execute()
            logger.info(f"公司数据查询成功: {len(companies.data)} 条记录")
            
            # 测试财务数据
            financial = self.supabase.table('financial_data').select('*').limit(5).execute()
            logger.info(f"财务数据查询成功: {len(financial.data)} 条记录")
            
            # 测试产品线数据
            product_line = self.supabase.table('product_line_revenue').select('*').limit(5).execute()
            logger.info(f"产品线数据查询成功: {len(product_line.data)} 条记录")
            
            return True
            
        except Exception as e:
            logger.error(f"数据访问测试失败: {e}")
            return False

def main():
    """主函数"""
    logger.info("开始数据库更新流程...")
    
    try:
        updater = DatabaseUpdater()
        
        # 执行迁移
        if not updater.run_migration():
            logger.error("数据库迁移失败，停止流程")
            sys.exit(1)
        
        # 插入种子数据
        if not updater.run_seed_data():
            logger.error("种子数据插入失败，停止流程")
            sys.exit(1)
        
        # 验证结构
        if not updater.verify_database_structure():
            logger.error("数据库结构验证失败")
            sys.exit(1)
        
        # 测试访问
        if not updater.test_data_access():
            logger.error("数据访问测试失败")
            sys.exit(1)
        
        logger.info("数据库更新流程全部完成!")
        
    except Exception as e:
        logger.error(f"数据库更新流程异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()