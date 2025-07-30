#!/usr/bin/env python3
"""
增强版财务数据爬虫运行脚本
自动更新数据库和增强数据
"""

import os
import sys
import logging
from datetime import datetime

# 尝试导入增强版爬虫
try:
    from enhanced_crawler import EnhancedFinancialCrawler
    ENHANCED_AVAILABLE = True
except ImportError:
    ENHANCED_AVAILABLE = False
    print("❌ 增强版爬虫不可用，请检查 enhanced_crawler.py")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('enhanced_crawler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

def main():
    """主函数"""
    logger = logging.getLogger(__name__)
    
    if not ENHANCED_AVAILABLE:
        logger.error("增强版爬虫不可用")
        sys.exit(1)
    
    logger.info("开始运行增强版财务数据爬虫...")
    logger.info(f"运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 初始化并运行爬虫
        crawler = EnhancedFinancialCrawler()
        success = crawler.run_full_update()
        
        if success:
            logger.info("🎉 增强版数据更新成功完成!")
            logger.info("数据库已更新，前端应用将显示最新数据")
            sys.exit(0)
        else:
            logger.error("❌ 增强版数据更新失败")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"增强版爬虫运行异常: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()