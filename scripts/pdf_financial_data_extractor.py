#!/usr/bin/env python3
"""
NETGEAR官方PDF财报数据提取器
从database/releases目录中的PDF文件提取详细的财务数据
包括业务分段、收入、毛利率、增长率等关键指标
"""

import os
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from supabase import create_client
from dotenv import load_dotenv
import PyPDF2
import pdfplumber
from pathlib import Path

# 加载环境变量
load_dotenv()

class PDFFinancialDataExtractor:
    def __init__(self):
        self.setup_logging()
        self.setup_supabase()
        self.netgear_company_id = None
        self.pdf_directory = "database/releases"
        
    def setup_logging(self):
        """设置日志"""
        log_filename = f'pdf_financial_extractor_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_supabase(self):
        """初始化Supabase客户端"""
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase凭据未找到")
            
        self.supabase = create_client(supabase_url, supabase_key)
        self.logger.info("✅ Supabase客户端初始化成功")
        
    def get_company_id(self) -> str:
        """获取NETGEAR公司ID"""
        if self.netgear_company_id:
            return self.netgear_company_id
            
        result = self.supabase.table('companies').select('id').eq('symbol', 'NTGR').execute()
        if not result.data:
            raise ValueError("未找到NETGEAR公司记录")
            
        self.netgear_company_id = result.data[0]['id']
        return self.netgear_company_id
    
    def find_pdf_files(self) -> List[str]:
        """查找所有PDF财报文件"""
        pdf_files = []
        if os.path.exists(self.pdf_directory):
            for file in os.listdir(self.pdf_directory):
                if file.endswith('.pdf'):
                    pdf_files.append(os.path.join(self.pdf_directory, file))
        
        self.logger.info(f"📁 发现 {len(pdf_files)} 个PDF财报文件")
        for pdf in pdf_files:
            self.logger.info(f"   - {os.path.basename(pdf)}")
        
        return sorted(pdf_files)
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """从PDF中提取文本内容"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except Exception as e:
            self.logger.error(f"从PDF提取文本失败 {pdf_path}: {e}")
            return ""
    
    def parse_period_from_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        """从文件名解析财报期间"""
        # 匹配模式: "Second Quarter 2025", "First Quarter 2025", etc.
        quarter_patterns = [
            r'First Quarter (\d{4})',
            r'Second Quarter (\d{4})',
            r'Third Quarter (\d{4})',
            r'Fourth Quarter (\d{4})',
        ]
        
        quarter_map = {
            'First': 1,
            'Second': 2, 
            'Third': 3,
            'Fourth': 4
        }
        
        for pattern in quarter_patterns:
            match = re.search(pattern, filename, re.IGNORECASE)
            if match:
                quarter_name = pattern.split()[0].replace('(', '').replace('\\', '')
                year = int(match.group(1))
                quarter = quarter_map.get(quarter_name, 0)
                
                if quarter > 0:
                    return {
                        'fiscal_year': year,
                        'fiscal_quarter': quarter,
                        'period': f'Q{quarter}-{year}'
                    }
        
        return None
    
    def extract_financial_metrics(self, text: str, period_info: Dict) -> Dict[str, Any]:
        """从文本中提取财务指标"""
        metrics = {
            'total_revenue': None,
            'segments': [],
            'growth_rates': {},
            'margins': {}
        }
        
        # 提取总收入
        revenue_patterns = [
            r'Net revenues?\s+(?:of\s+)?(?:were\s+)?[\$]?([\d,]+\.?\d*)\s*million',
            r'Total\s+net\s+revenues?\s+[\$]?([\d,]+\.?\d*)\s*million',
            r'Net\s+revenues?\s+[\$]?([\d,]+\.?\d*)\s*million'
        ]
        
        for pattern in revenue_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                revenue_str = match.group(1).replace(',', '')
                metrics['total_revenue'] = float(revenue_str) * 1000000  # 转换为美元
                self.logger.info(f"📊 总收入: ${float(revenue_str):.1f}M")
                break
        
        # 提取业务分段数据
        segments = self.extract_business_segments(text, period_info)
        metrics['segments'] = segments
        
        # 提取增长率
        growth_rates = self.extract_growth_rates(text)
        metrics['growth_rates'] = growth_rates
        
        # 提取毛利率信息
        margins = self.extract_margins(text)
        metrics['margins'] = margins
        
        return metrics
    
    def extract_business_segments(self, text: str, period_info: Dict) -> List[Dict[str, Any]]:
        """提取业务分段数据"""
        segments = []
        
        # 2025年三分段模式
        if period_info['fiscal_year'] >= 2025:
            segment_patterns = {
                'NETGEAR for Business': [
                    r'NETGEAR for Business.*?[\$]?([\d,]+\.?\d*)\s*million',
                    r'NFB.*?[\$]?([\d,]+\.?\d*)\s*million'
                ],
                'Home Networking': [
                    r'Home Networking.*?[\$]?([\d,]+\.?\d*)\s*million',
                    r'Home.*?[\$]?([\d,]+\.?\d*)\s*million'
                ],
                'Mobile': [
                    r'Mobile.*?[\$]?([\d,]+\.?\d*)\s*million'
                ]
            }
        else:
            # 2023-2024年二分段模式
            segment_patterns = {
                'Connected Home': [
                    r'Connected Home.*?[\$]?([\d,]+\.?\d*)\s*million'
                ],
                'NETGEAR for Business': [
                    r'NETGEAR for Business.*?[\$]?([\d,]+\.?\d*)\s*million',
                    r'NFB.*?[\$]?([\d,]+\.?\d*)\s*million'
                ]
            }
        
        for segment_name, patterns in segment_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    revenue_str = match.group(1).replace(',', '')
                    revenue = float(revenue_str) * 1000000
                    
                    # 尝试提取该分段的增长率和毛利率
                    segment_text = self.extract_segment_context(text, segment_name)
                    growth_rate = self.extract_segment_growth(segment_text, segment_name)
                    margin = self.extract_segment_margin(segment_text, segment_name)
                    
                    segment_data = {
                        'category_name': segment_name,
                        'revenue': revenue,
                        'growth_rate': growth_rate,
                        'gross_margin': margin
                    }
                    
                    segments.append(segment_data)
                    self.logger.info(f"📈 {segment_name}: ${float(revenue_str):.1f}M")
                    break
        
        return segments
    
    def extract_segment_context(self, text: str, segment_name: str) -> str:
        """提取特定分段周围的文本内容"""
        # 查找分段名称在文本中的位置
        pattern = rf'{re.escape(segment_name)}.*?(?=(?:[A-Z][a-z]+\s+[A-Z][a-z]+)|(?:\n\n)|$)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            return match.group(0)
        
        # 如果没找到，返回包含segment_name的段落
        lines = text.split('\n')
        context_lines = []
        found_segment = False
        
        for i, line in enumerate(lines):
            if segment_name.lower() in line.lower():
                found_segment = True
                # 取前后各3行作为上下文
                start_idx = max(0, i - 3)
                end_idx = min(len(lines), i + 4)
                context_lines = lines[start_idx:end_idx]
                break
        
        return ' '.join(context_lines) if context_lines else ""
    
    def extract_segment_growth(self, segment_text: str, segment_name: str) -> Optional[float]:
        """提取分段增长率"""
        growth_patterns = [
            r'(?:increased|decreased|grew|declined)\s+(?:by\s+)?([\d,]+\.?\d*)%',
            r'([\d,]+\.?\d*)%\s+(?:increase|decrease|growth|decline)',
            r'(?:\+|\-)([\d,]+\.?\d*)%'
        ]
        
        for pattern in growth_patterns:
            match = re.search(pattern, segment_text, re.IGNORECASE)
            if match:
                growth_str = match.group(1).replace(',', '')
                growth = float(growth_str)
                
                # 判断是增长还是下降
                if 'decreased' in segment_text.lower() or 'declined' in segment_text.lower() or segment_text.count('-') > segment_text.count('+'):
                    growth = -growth
                
                return growth
        
        return None
    
    def extract_segment_margin(self, segment_text: str, segment_name: str) -> Optional[float]:
        """提取分段毛利率"""
        margin_patterns = [
            r'gross margin.*?([\d,]+\.?\d*)%',
            r'margin.*?([\d,]+\.?\d*)%',
            r'([\d,]+\.?\d*)%.*?margin'
        ]
        
        for pattern in margin_patterns:
            match = re.search(pattern, segment_text, re.IGNORECASE)
            if match:
                margin_str = match.group(1).replace(',', '')
                return float(margin_str)
        
        return None
    
    def extract_growth_rates(self, text: str) -> Dict[str, float]:
        """提取各种增长率"""
        growth_rates = {}
        
        # 年度增长率模式
        yoy_patterns = [
            r'compared to.*?same period.*?year.*?([\+\-]?[\d,]+\.?\d*)%',
            r'year-over-year.*?([\+\-]?[\d,]+\.?\d*)%',
            r'compared to.*?prior year.*?([\+\-]?[\d,]+\.?\d*)%'
        ]
        
        for pattern in yoy_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                growth_str = match.group(1).replace(',', '')
                growth_rates['yoy'] = float(growth_str)
                break
        
        return growth_rates
    
    def extract_margins(self, text: str) -> Dict[str, float]:
        """提取毛利率信息"""
        margins = {}
        
        # 整体毛利率
        margin_patterns = [
            r'gross margin.*?([\d,]+\.?\d*)%',
            r'overall.*?margin.*?([\d,]+\.?\d*)%'
        ]
        
        for pattern in margin_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                margin_str = match.group(1).replace(',', '')
                margins['gross_margin'] = float(margin_str)
                break
        
        return margins
    
    def save_financial_data(self, period_info: Dict, metrics: Dict) -> bool:
        """保存财务数据到数据库"""
        try:
            company_id = self.get_company_id()
            
            # 检查是否已存在
            existing = self.supabase.table('financial_data').select('id').eq(
                'company_id', company_id
            ).eq('period', period_info['period']).execute()
            
            if existing.data:
                self.logger.info(f"财务数据已存在: {period_info['period']}")
                return True
            
            # 插入财务数据
            financial_record = {
                'company_id': company_id,
                'period': period_info['period'],
                'fiscal_year': period_info['fiscal_year'],
                'fiscal_quarter': period_info['fiscal_quarter'],
                'revenue': metrics.get('total_revenue'),
                'data_source': 'official_pdf_report'
            }
            
            result = self.supabase.table('financial_data').insert(financial_record).execute()
            if result.data:
                revenue_m = (metrics.get('total_revenue') or 0) / 1000000
                self.logger.info(f"✅ 保存财务数据: {period_info['period']} - ${revenue_m:.1f}M")
                return True
            
        except Exception as e:
            self.logger.error(f"保存财务数据失败: {e}")
            
        return False
    
    def save_segment_data(self, period_info: Dict, segments: List[Dict]) -> int:
        """保存业务分段数据到数据库"""
        saved_count = 0
        
        try:
            company_id = self.get_company_id()
            
            for segment in segments:
                # 检查是否已存在
                existing = self.supabase.table('product_line_revenue').select('id').eq(
                    'company_id', company_id
                ).eq('period', period_info['period']).eq(
                    'category_name', segment['category_name']
                ).execute()
                
                if existing.data:
                    self.logger.info(f"分段数据已存在: {period_info['period']} - {segment['category_name']}")
                    continue
                
                # 计算收入占比
                total_revenue = sum(s['revenue'] for s in segments)
                revenue_percentage = (segment['revenue'] / total_revenue * 100) if total_revenue > 0 else 0
                
                # 插入分段数据
                segment_record = {
                    'company_id': company_id,
                    'period': period_info['period'],
                    'fiscal_year': period_info['fiscal_year'],
                    'fiscal_quarter': period_info['fiscal_quarter'],
                    'category_level': 1,
                    'category_name': segment['category_name'],
                    'revenue': segment['revenue'],
                    'revenue_percentage': revenue_percentage,
                    'gross_margin': segment.get('gross_margin'),
                    'data_source': 'official_pdf_report',
                    'estimation_method': 'pdf_text_extraction'
                }
                
                # 添加增长率
                if segment.get('growth_rate') is not None:
                    segment_record['yoy_growth'] = segment['growth_rate']
                
                result = self.supabase.table('product_line_revenue').insert(segment_record).execute()
                if result.data:
                    saved_count += 1
                    revenue_m = segment['revenue'] / 1000000
                    growth_info = f" ({segment['growth_rate']:+.1f}%)" if segment.get('growth_rate') else ""
                    self.logger.info(f"✅ 保存分段: {segment['category_name']} - ${revenue_m:.1f}M{growth_info}")
                
        except Exception as e:
            self.logger.error(f"保存分段数据失败: {e}")
            
        return saved_count
    
    def process_pdf_file(self, pdf_path: str) -> Dict[str, Any]:
        """处理单个PDF文件"""
        filename = os.path.basename(pdf_path)
        self.logger.info(f"📄 处理PDF文件: {filename}")
        
        # 解析期间信息
        period_info = self.parse_period_from_filename(filename)
        if not period_info:
            self.logger.warning(f"无法从文件名解析期间信息: {filename}")
            return {'success': False, 'reason': 'period_parse_failed'}
        
        self.logger.info(f"📅 解析期间: {period_info['period']}")
        
        # 提取PDF文本
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            self.logger.warning(f"无法从PDF提取文本: {filename}")
            return {'success': False, 'reason': 'text_extraction_failed'}
        
        # 提取财务指标
        metrics = self.extract_financial_metrics(text, period_info)
        
        # 保存到数据库
        financial_saved = self.save_financial_data(period_info, metrics)
        segments_saved = self.save_segment_data(period_info, metrics['segments'])
        
        return {
            'success': True,
            'period': period_info['period'],
            'total_revenue': metrics.get('total_revenue'),
            'segments_count': len(metrics['segments']),
            'financial_saved': financial_saved,
            'segments_saved': segments_saved
        }
    
    def run_extraction(self) -> bool:
        """运行完整的PDF数据提取流程"""
        self.logger.info("🚀 启动PDF财报数据提取")
        self.logger.info("=" * 60)
        
        # 查找PDF文件
        pdf_files = self.find_pdf_files()
        if not pdf_files:
            self.logger.error(f"在 {self.pdf_directory} 目录中未找到PDF文件")
            return False
        
        processed_count = 0
        successful_count = 0
        total_segments_saved = 0
        
        # 处理每个PDF文件
        for pdf_path in pdf_files:
            try:
                result = self.process_pdf_file(pdf_path)
                processed_count += 1
                
                if result['success']:
                    successful_count += 1
                    total_segments_saved += result['segments_saved']
                    
                    revenue_m = (result.get('total_revenue') or 0) / 1000000
                    self.logger.info(f"✅ {result['period']}: ${revenue_m:.1f}M, {result['segments_count']}个分段")
                else:
                    self.logger.warning(f"❌ 处理失败: {os.path.basename(pdf_path)} - {result.get('reason')}")
                    
            except Exception as e:
                self.logger.error(f"处理PDF文件出错 {pdf_path}: {e}")
                processed_count += 1
        
        # 总结报告
        self.logger.info("=" * 60)
        self.logger.info(f"🎯 PDF数据提取完成")
        self.logger.info(f"   - 处理文件: {processed_count}/{len(pdf_files)}")
        self.logger.info(f"   - 成功提取: {successful_count}")
        self.logger.info(f"   - 业务分段记录: {total_segments_saved}")
        
        if successful_count > 0:
            self.logger.info("✅ NETGEAR官方财报数据已成功导入数据库!")
            self.logger.info("📊 产品线营收分析现在基于权威的官方数据")
        
        return successful_count > 0

def main():
    """主函数"""
    try:
        extractor = PDFFinancialDataExtractor()
        success = extractor.run_extraction()
        exit(0 if success else 1)
    except Exception as e:
        logging.error(f"脚本执行失败: {e}")
        exit(1)

if __name__ == "__main__":
    main()