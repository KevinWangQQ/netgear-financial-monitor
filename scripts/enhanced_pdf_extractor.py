#!/usr/bin/env python3
"""
增强版NETGEAR PDF财报数据提取器
修复期间解析问题，提升数据提取准确性，支持更多财务指标
"""

import os
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from supabase import create_client
from dotenv import load_dotenv
import pdfplumber
from pathlib import Path

# 加载环境变量
load_dotenv()

class EnhancedPDFExtractor:
    def __init__(self):
        self.setup_logging()
        self.setup_supabase()
        self.netgear_company_id = None
        self.pdf_directory = "database/releases"
        
    def setup_logging(self):
        """设置日志"""
        log_filename = f'enhanced_pdf_extractor_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
        for pdf in sorted(pdf_files):
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
        """从文件名解析财报期间 - 增强版"""
        # 改进的匹配模式，支持更多格式
        patterns = [
            # 标准格式: "First Quarter 2025", etc.
            r'(First|Second|Third|Fourth)\s+Quarter\s+(\d{4})',
            # 年报格式: "Fourth Quarter and Full Year 2024" 
            r'Fourth\s+Quarter\s+and\s+Full\s+Year\s+(\d{4})',
            # 其他可能格式
            r'Q([1-4])\s+(\d{4})',
            r'Quarter\s+([1-4])\s+(\d{4})'
        ]
        
        quarter_map = {
            'First': 1, 'Second': 2, 'Third': 3, 'Fourth': 4,
            '1': 1, '2': 2, '3': 3, '4': 4
        }
        
        for pattern in patterns:
            match = re.search(pattern, filename, re.IGNORECASE)
            if match:
                if 'Full Year' in pattern:
                    # 年报文件，提取Q4数据
                    year = int(match.group(1))
                    return {
                        'fiscal_year': year,
                        'fiscal_quarter': 4,
                        'period': f'Q4-{year}',
                        'is_full_year': True
                    }
                else:
                    # 标准季度报告
                    quarter_name = match.group(1)
                    year = int(match.group(2))
                    quarter = quarter_map.get(quarter_name, 0)
                    
                    if quarter > 0:
                        return {
                            'fiscal_year': year,
                            'fiscal_quarter': quarter,
                            'period': f'Q{quarter}-{year}',
                            'is_full_year': False
                        }
        
        self.logger.warning(f"无法解析期间信息: {filename}")
        return None
    
    def extract_segment_data_2025(self, text: str) -> List[Dict[str, Any]]:
        """提取2025年三分段业务数据"""
        segments = []
        
        # 2025年分段模式
        segment_patterns = {
            'NETGEAR for Business': [
                r'NETGEAR for Business.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'NFB.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Business.*?segment.*?[\$]?([\d,]+\.?\d*)\s*million'
            ],
            'Home Networking': [
                r'Home Networking.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Home.*?networking.*?[\$]?([\d,]+\.?\d*)\s*million'
            ],
            'Mobile': [
                r'Mobile.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Mobile.*?segment.*?[\$]?([\d,]+\.?\d*)\s*million'
            ]
        }
        
        for segment_name, patterns in segment_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    revenue_str = match.group(1).replace(',', '')
                    try:
                        revenue = float(revenue_str) * 1000000
                        
                        # 合理性检查 - NETGEAR单个分段收入通常在10M-100M范围
                        if 10000000 <= revenue <= 200000000:  # 10M-200M range
                            
                            # 提取增长率和毛利率
                            segment_context = self.get_segment_context(text, segment_name, match.start(), match.end())
                            growth_rate = self.extract_growth_rate_from_context(segment_context)
                            margin = self.extract_margin_from_context(segment_context)
                            
                            segment_data = {
                                'category_name': segment_name,
                                'revenue': revenue,
                                'growth_rate': growth_rate,
                                'gross_margin': margin
                            }
                            
                            segments.append(segment_data)
                            self.logger.info(f"📈 {segment_name}: ${revenue/1000000:.1f}M" + 
                                           (f" ({growth_rate:+.1f}%)" if growth_rate else ""))
                            break
                    except ValueError:
                        continue
        
        return segments
    
    def extract_segment_data_2024(self, text: str) -> List[Dict[str, Any]]:
        """提取2024年分段业务数据（过渡期，可能是2分段或3分段）"""
        segments = []
        
        # 先尝试3分段模式
        three_segment_data = self.extract_segment_data_2025(text)
        if len(three_segment_data) >= 2:
            return three_segment_data
        
        # 如果3分段数据不足，尝试2分段模式
        segment_patterns = {
            'Connected Home': [
                r'Connected Home.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Consumer.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million'
            ],
            'NETGEAR for Business': [
                r'NETGEAR for Business.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Business.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million'
            ]
        }
        
        for segment_name, patterns in segment_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    revenue_str = match.group(1).replace(',', '')
                    try:
                        revenue = float(revenue_str) * 1000000
                        
                        if 10000000 <= revenue <= 200000000:
                            segment_context = self.get_segment_context(text, segment_name, match.start(), match.end())
                            growth_rate = self.extract_growth_rate_from_context(segment_context)
                            margin = self.extract_margin_from_context(segment_context)
                            
                            segment_data = {
                                'category_name': segment_name,
                                'revenue': revenue,
                                'growth_rate': growth_rate,
                                'gross_margin': margin
                            }
                            
                            segments.append(segment_data)
                            self.logger.info(f"📈 {segment_name}: ${revenue/1000000:.1f}M" + 
                                           (f" ({growth_rate:+.1f}%)" if growth_rate else ""))
                            break
                    except ValueError:
                        continue
        
        return segments
    
    def extract_segment_data_2023(self, text: str) -> List[Dict[str, Any]]:
        """提取2023年二分段业务数据"""
        segments = []
        
        segment_patterns = {
            'Connected Home': [
                r'Connected Home.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million'
            ],
            'NETGEAR for Business': [
                r'NETGEAR for Business.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million',
                r'Business.*?segment.*?revenues?\s+(?:of\s+)?[\$]?([\d,]+\.?\d*)\s*million'
            ]
        }
        
        for segment_name, patterns in segment_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    revenue_str = match.group(1).replace(',', '')
                    try:
                        revenue = float(revenue_str) * 1000000
                        
                        if 10000000 <= revenue <= 300000000:  # 2023年收入可能更高
                            segment_context = self.get_segment_context(text, segment_name, match.start(), match.end())
                            growth_rate = self.extract_growth_rate_from_context(segment_context)
                            margin = self.extract_margin_from_context(segment_context)
                            
                            segment_data = {
                                'category_name': segment_name,
                                'revenue': revenue,
                                'growth_rate': growth_rate,
                                'gross_margin': margin
                            }
                            
                            segments.append(segment_data)
                            self.logger.info(f"📈 {segment_name}: ${revenue/1000000:.1f}M" + 
                                           (f" ({growth_rate:+.1f}%)" if growth_rate else ""))
                            break
                    except ValueError:
                        continue
        
        return segments
    
    def get_segment_context(self, text: str, segment_name: str, start_pos: int, end_pos: int) -> str:
        """获取分段周围的上下文"""
        # 取匹配位置前后500个字符作为上下文
        context_start = max(0, start_pos - 500)
        context_end = min(len(text), end_pos + 500)
        return text[context_start:context_end]
    
    def extract_growth_rate_from_context(self, context: str) -> Optional[float]:
        """从上下文中提取增长率"""
        patterns = [
            r'(?:increased|grew).*?by\s+([\d,]+\.?\d*)(?:%|\s*percent)',
            r'(?:decreased|declined).*?by\s+([\d,]+\.?\d*)(?:%|\s*percent)',
            r'([\d,]+\.?\d*)%.*?(?:increase|growth|higher)',
            r'([\d,]+\.?\d*)%.*?(?:decrease|decline|lower)',
            r'(?:\+|\-)([\d,]+\.?\d*)%'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, context, re.IGNORECASE)
            if match:
                try:
                    growth = float(match.group(1).replace(',', ''))
                    
                    # 判断正负
                    if 'decreased' in context.lower() or 'declined' in context.lower() or 'lower' in context.lower():
                        growth = -growth
                    elif match.group(0).startswith('-'):
                        growth = -growth
                    
                    # 合理性检查：增长率通常在-50%到+100%之间
                    if -50 <= growth <= 100:
                        return growth
                except ValueError:
                    continue
        
        return None
    
    def extract_margin_from_context(self, context: str) -> Optional[float]:
        """从上下文中提取毛利率"""
        patterns = [
            r'gross margin.*?([\d,]+\.?\d*)(?:%|\s*percent)',
            r'margin.*?([\d,]+\.?\d*)(?:%|\s*percent)',
            r'([\d,]+\.?\d*)%.*?margin'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, context, re.IGNORECASE)
            if match:
                try:
                    margin = float(match.group(1).replace(',', ''))
                    # 合理性检查：毛利率通常在5%-60%之间
                    if 5 <= margin <= 60:
                        return margin
                except ValueError:
                    continue
        
        return None
    
    def extract_total_revenue(self, text: str) -> Optional[float]:
        """提取总收入"""
        patterns = [
            r'Net revenues?\s+(?:of\s+|were\s+)?[\$]?([\d,]+\.?\d*)\s*million',
            r'Total\s+net\s+revenues?\s+[\$]?([\d,]+\.?\d*)\s*million',
            r'revenues?\s+[\$]?([\d,]+\.?\d*)\s*million'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    revenue = float(match.group(1).replace(',', '')) * 1000000
                    # 合理性检查：NETGEAR季度收入通常在100M-300M范围
                    if 50000000 <= revenue <= 500000000:  # 50M-500M range
                        return revenue
                except ValueError:
                    continue
        
        return None
    
    def save_enhanced_data(self, period_info: Dict, total_revenue: float, segments: List[Dict]) -> Tuple[bool, int]:
        """保存增强的财务和分段数据"""
        company_id = self.get_company_id()
        
        # 保存/更新财务数据
        financial_saved = False
        try:
            # 检查是否存在来源为官方PDF的数据
            existing = self.supabase.table('financial_data').select('id').eq(
                'company_id', company_id
            ).eq('period', period_info['period']).eq('data_source', 'official_pdf_report').execute()
            
            if not existing.data:
                financial_record = {
                    'company_id': company_id,
                    'period': period_info['period'],
                    'fiscal_year': period_info['fiscal_year'],
                    'fiscal_quarter': period_info['fiscal_quarter'],
                    'revenue': int(total_revenue),  # 确保为整数
                    'data_source': 'official_pdf_report'
                }
                
                result = self.supabase.table('financial_data').insert(financial_record).execute()
                if result.data:
                    financial_saved = True
                    self.logger.info(f"✅ 保存财务数据: {period_info['period']} - ${total_revenue/1000000:.1f}M")
        except Exception as e:
            self.logger.error(f"保存财务数据失败: {e}")
        
        # 保存分段数据
        segments_saved = 0
        for segment in segments:
            try:
                # 检查是否存在来源为官方PDF的分段数据
                existing = self.supabase.table('product_line_revenue').select('id').eq(
                    'company_id', company_id
                ).eq('period', period_info['period']).eq(
                    'category_name', segment['category_name']
                ).eq('data_source', 'official_pdf_report').execute()
                
                if not existing.data:
                    # 计算收入占比
                    revenue_percentage = (segment['revenue'] / total_revenue * 100) if total_revenue > 0 else 0
                    
                    segment_record = {
                        'company_id': company_id,
                        'period': period_info['period'],
                        'fiscal_year': period_info['fiscal_year'],
                        'fiscal_quarter': period_info['fiscal_quarter'],
                        'category_level': 1,
                        'category_name': segment['category_name'],
                        'revenue': int(segment['revenue']),  # 确保为整数
                        'revenue_percentage': revenue_percentage,
                        'data_source': 'official_pdf_report',
                        'estimation_method': 'enhanced_pdf_extraction'
                    }
                    
                    # 添加可选字段
                    if segment.get('growth_rate') is not None:
                        segment_record['yoy_growth'] = segment['growth_rate']
                    if segment.get('gross_margin') is not None:
                        segment_record['gross_margin'] = segment['gross_margin']
                    
                    result = self.supabase.table('product_line_revenue').insert(segment_record).execute()
                    if result.data:
                        segments_saved += 1
                        revenue_m = segment['revenue'] / 1000000
                        self.logger.info(f"✅ 保存分段: {segment['category_name']} - ${revenue_m:.1f}M")
                
            except Exception as e:
                self.logger.error(f"保存分段数据失败 {segment['category_name']}: {e}")
        
        return financial_saved, segments_saved
    
    def process_pdf_file(self, pdf_path: str) -> Dict[str, Any]:
        """处理单个PDF文件"""
        filename = os.path.basename(pdf_path)
        self.logger.info(f"📄 处理PDF文件: {filename}")
        
        # 解析期间信息
        period_info = self.parse_period_from_filename(filename)
        if not period_info:
            return {'success': False, 'reason': 'period_parse_failed'}
        
        self.logger.info(f"📅 解析期间: {period_info['period']}")
        
        # 提取PDF文本
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return {'success': False, 'reason': 'text_extraction_failed'}
        
        # 提取总收入
        total_revenue = self.extract_total_revenue(text)
        if not total_revenue:
            self.logger.warning(f"无法提取总收入: {filename}")
            return {'success': False, 'reason': 'revenue_extraction_failed'}
        
        self.logger.info(f"📊 总收入: ${total_revenue/1000000:.1f}M")
        
        # 根据年份选择分段提取方法
        year = period_info['fiscal_year']
        if year >= 2025:
            segments = self.extract_segment_data_2025(text)
        elif year >= 2024:
            segments = self.extract_segment_data_2024(text)
        else:
            segments = self.extract_segment_data_2023(text)
        
        # 保存数据
        financial_saved, segments_saved = self.save_enhanced_data(period_info, total_revenue, segments)
        
        return {
            'success': True,
            'period': period_info['period'],
            'total_revenue': total_revenue,
            'segments_count': len(segments),
            'financial_saved': financial_saved,
            'segments_saved': segments_saved
        }
    
    def run_extraction(self) -> bool:
        """运行完整的增强PDF数据提取流程"""
        self.logger.info("🚀 启动增强版PDF财报数据提取")
        self.logger.info("=" * 60)
        
        pdf_files = self.find_pdf_files()
        if not pdf_files:
            self.logger.error(f"在 {self.pdf_directory} 目录中未找到PDF文件")
            return False
        
        processed_count = 0
        successful_count = 0
        total_financial_saved = 0
        total_segments_saved = 0
        
        for pdf_path in pdf_files:
            try:
                result = self.process_pdf_file(pdf_path)
                processed_count += 1
                
                if result['success']:
                    successful_count += 1
                    if result['financial_saved']:
                        total_financial_saved += 1
                    total_segments_saved += result['segments_saved']
                    
                    revenue_m = (result.get('total_revenue') or 0) / 1000000
                    self.logger.info(f"✅ {result['period']}: ${revenue_m:.1f}M, {result['segments_count']}个分段, 保存{result['segments_saved']}条")
                else:
                    self.logger.warning(f"❌ 处理失败: {os.path.basename(pdf_path)} - {result.get('reason')}")
                    
            except Exception as e:
                self.logger.error(f"处理PDF文件出错 {pdf_path}: {e}")
                processed_count += 1
        
        # 总结报告
        self.logger.info("=" * 60)
        self.logger.info(f"🎯 增强版PDF数据提取完成")
        self.logger.info(f"   - 处理文件: {processed_count}/{len(pdf_files)}")
        self.logger.info(f"   - 成功提取: {successful_count}")
        self.logger.info(f"   - 新增财务记录: {total_financial_saved}")
        self.logger.info(f"   - 新增分段记录: {total_segments_saved}")
        
        if successful_count > 0:
            self.logger.info("✅ NETGEAR官方财报数据提取完成!")
            if total_segments_saved > 0:
                self.logger.info(f"📈 新增 {total_segments_saved} 条高质量业务分段数据")
            self.logger.info("📊 数据库现在包含更准确的官方财报数据")
        
        return successful_count > 0

def main():
    """主函数"""
    try:
        extractor = EnhancedPDFExtractor()
        success = extractor.run_extraction()
        exit(0 if success else 1)
    except Exception as e:
        logging.error(f"脚本执行失败: {e}")
        exit(1)

if __name__ == "__main__":
    main()