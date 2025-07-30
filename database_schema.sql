-- ====================================================
-- Netgear Financial Monitor - 完整数据库结构设计
-- ====================================================

-- 公司信息表（已存在，保持不变）
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    industry VARCHAR(100),
    market_cap BIGINT,
    employees INTEGER,
    founded_year INTEGER,
    headquarters VARCHAR(100),
    website VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 基础财务数据表（已存在，扩展字段）
CREATE TABLE IF NOT EXISTS financial_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL, -- 格式：Q1-2025
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- 收入数据
    revenue BIGINT,
    gross_profit BIGINT,
    net_income BIGINT,
    operating_income BIGINT,
    operating_expenses BIGINT,
    
    -- 资产负债数据
    total_assets BIGINT,
    current_assets BIGINT,
    cash_and_equivalents BIGINT,
    total_debt BIGINT,
    current_liabilities BIGINT,
    shareholders_equity BIGINT,
    
    -- 现金流数据
    operating_cash_flow BIGINT,
    investing_cash_flow BIGINT,
    financing_cash_flow BIGINT,
    free_cash_flow BIGINT,
    
    -- 其他财务指标
    shares_outstanding BIGINT,
    eps DECIMAL(10,4),
    
    -- 元数据
    data_source VARCHAR(50) DEFAULT 'alpha_vantage',
    confidence_level DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, period)
);

-- 产品线营收数据表
CREATE TABLE IF NOT EXISTS product_line_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- 产品线层级
    category_level INTEGER NOT NULL, -- 1=一级分类, 2=二级分类
    parent_category_id UUID REFERENCES product_line_revenue(id),
    category_name VARCHAR(100) NOT NULL,
    
    -- 营收数据
    revenue BIGINT NOT NULL,
    revenue_percentage DECIMAL(5,2), -- 占总营收百分比
    cost_of_goods_sold BIGINT,
    gross_profit BIGINT,
    gross_margin DECIMAL(5,2),
    
    -- 增长数据
    yoy_growth DECIMAL(5,2), -- 同比增长
    qoq_growth DECIMAL(5,2), -- 环比增长
    
    -- 元数据
    data_source VARCHAR(50) DEFAULT 'estimated', -- 'official', 'estimated', 'industry_analysis'
    estimation_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, period, category_name, category_level)
);

-- 地理营收分布数据表
CREATE TABLE IF NOT EXISTS geographic_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- 地理信息
    region VARCHAR(50) NOT NULL, -- 北美、欧洲、亚太等
    country VARCHAR(50),
    country_code VARCHAR(3),
    
    -- 营收数据
    revenue BIGINT NOT NULL,
    revenue_percentage DECIMAL(5,2),
    
    -- 市场数据
    market_size BIGINT,
    market_share DECIMAL(5,2),
    competitor_count INTEGER,
    
    -- 增长数据
    yoy_growth DECIMAL(5,2),
    qoq_growth DECIMAL(5,2),
    
    -- 地理坐标（用于地图展示）
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- 元数据
    data_source VARCHAR(50) DEFAULT 'estimated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, period, region, country)
);

-- 里程碑事件表
CREATE TABLE IF NOT EXISTS milestone_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- 事件基本信息
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'product_launch', 'acquisition', 'financial_milestone', etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 影响评估
    impact_type VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
    impact_level INTEGER NOT NULL CHECK (impact_level >= 1 AND impact_level <= 5),
    
    -- 财务影响
    estimated_revenue_impact BIGINT,
    estimated_impact_percentage DECIMAL(5,2),
    
    -- 相关指标
    related_metrics TEXT[], -- JSON array of related metric names
    affected_product_lines TEXT[],
    affected_regions TEXT[],
    
    -- 数据来源
    data_source VARCHAR(50) DEFAULT 'manual', -- 'news', 'earnings_call', 'sec_filing', 'manual'
    source_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'unverified', -- 'verified', 'unverified', 'disputed'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 竞争对手数据表
CREATE TABLE IF NOT EXISTS competitor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- 主公司（NETGEAR）
    competitor_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- 竞争对手
    period VARCHAR(10) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- 财务对比数据
    revenue BIGINT,
    gross_profit BIGINT,
    net_income BIGINT,
    market_cap BIGINT,
    
    -- 财务比率
    gross_margin DECIMAL(5,2),
    net_margin DECIMAL(5,2),
    roe DECIMAL(5,2),
    roa DECIMAL(5,2),
    
    -- 市场数据
    market_share DECIMAL(5,2),
    revenue_growth_yoy DECIMAL(5,2),
    
    -- 业务指标
    employee_count INTEGER,
    rd_expense BIGINT,
    rd_percentage DECIMAL(5,2),
    
    -- 元数据
    data_source VARCHAR(50) DEFAULT 'alpha_vantage',
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, competitor_id, period)
);

-- 市场指标表
CREATE TABLE IF NOT EXISTS market_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period VARCHAR(10) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- 行业指标
    industry VARCHAR(50) NOT NULL, -- 'networking_equipment', 'consumer_electronics'
    total_market_size BIGINT,
    market_growth_rate DECIMAL(5,2),
    
    -- 细分市场
    segment VARCHAR(50), -- 'wifi_routers', 'switches', 'enterprise_equipment'
    segment_size BIGINT,
    segment_growth_rate DECIMAL(5,2),
    
    -- 技术趋势
    technology_adoption_rate DECIMAL(5,2), -- WiFi 6/7 adoption rate
    avg_selling_price DECIMAL(10,2),
    
    -- 地理市场
    region VARCHAR(50),
    regional_market_size BIGINT,
    regional_growth_rate DECIMAL(5,2),
    
    -- 数据来源
    data_source VARCHAR(100),
    report_name VARCHAR(200),
    report_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(period, industry, segment, region)
);

-- 数据更新日志表
CREATE TABLE IF NOT EXISTS data_update_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    update_type VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete', 'full_refresh'
    records_affected INTEGER DEFAULT 0,
    
    -- 更新详情
    company_id UUID REFERENCES companies(id),
    period_range VARCHAR(50), -- e.g., "Q1-2024 to Q4-2024"
    data_source VARCHAR(50),
    
    -- 结果信息
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- 质量检查
    data_quality_checks JSONB,
    validation_errors JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system'
);

-- ====================================================
-- 索引创建
-- ====================================================

-- 主要查询索引
CREATE INDEX IF NOT EXISTS idx_financial_data_company_period ON financial_data(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_financial_data_year_quarter ON financial_data(fiscal_year DESC, fiscal_quarter DESC);

CREATE INDEX IF NOT EXISTS idx_product_line_company_period ON product_line_revenue(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_product_line_category ON product_line_revenue(category_level, category_name);

CREATE INDEX IF NOT EXISTS idx_geographic_revenue_company_period ON geographic_revenue(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_revenue_region ON geographic_revenue(region, country);

CREATE INDEX IF NOT EXISTS idx_milestone_events_company_date ON milestone_events(company_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_events_type_impact ON milestone_events(event_type, impact_type, impact_level);

CREATE INDEX IF NOT EXISTS idx_competitor_data_period ON competitor_data(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_market_metrics_period_industry ON market_metrics(period DESC, industry, segment);

-- ====================================================
-- 视图创建（用于常用查询）
-- ====================================================

-- 最新财务数据视图
CREATE OR REPLACE VIEW latest_financial_data AS
SELECT 
    fd.*,
    c.symbol,
    c.name as company_name,
    -- 计算财务比率
    CASE WHEN fd.revenue > 0 THEN (fd.gross_profit::DECIMAL / fd.revenue * 100) END as gross_margin_pct,
    CASE WHEN fd.revenue > 0 THEN (fd.net_income::DECIMAL / fd.revenue * 100) END as net_margin_pct,
    CASE WHEN fd.total_assets > 0 THEN (fd.net_income::DECIMAL / fd.total_assets * 100) END as roa_pct,
    CASE WHEN fd.shareholders_equity > 0 THEN (fd.net_income::DECIMAL / fd.shareholders_equity * 100) END as roe_pct
FROM financial_data fd
JOIN companies c ON fd.company_id = c.id
WHERE fd.period = (
    SELECT period 
    FROM financial_data fd2 
    WHERE fd2.company_id = fd.company_id 
    ORDER BY fiscal_year DESC, fiscal_quarter DESC 
    LIMIT 1
);

-- 产品线汇总视图
CREATE OR REPLACE VIEW product_line_summary AS
SELECT 
    plr.company_id,
    plr.period,
    plr.fiscal_year,
    plr.fiscal_quarter,
    plr.category_name,
    plr.category_level,
    plr.revenue,
    plr.revenue_percentage,
    plr.gross_margin,
    plr.yoy_growth,
    c.symbol,
    c.name as company_name
FROM product_line_revenue plr
JOIN companies c ON plr.company_id = c.id
WHERE plr.category_level = 1; -- 只显示一级分类

-- ====================================================
-- 触发器函数（自动更新时间戳）
-- ====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间戳触发器
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_data_updated_at BEFORE UPDATE ON financial_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_line_revenue_updated_at BEFORE UPDATE ON product_line_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geographic_revenue_updated_at BEFORE UPDATE ON geographic_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestone_events_updated_at BEFORE UPDATE ON milestone_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competitor_data_updated_at BEFORE UPDATE ON competitor_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_metrics_updated_at BEFORE UPDATE ON market_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================
-- 基础数据插入（NETGEAR公司信息）
-- ====================================================

INSERT INTO companies (symbol, name, sector, industry, founded_year, headquarters, website) 
VALUES (
    'NTGR', 
    'NETGEAR Inc', 
    'Technology', 
    'Networking Equipment', 
    1996, 
    'San Jose, CA, USA', 
    'https://www.netgear.com'
) ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry,
    founded_year = EXCLUDED.founded_year,
    headquarters = EXCLUDED.headquarters,
    website = EXCLUDED.website,
    updated_at = NOW();

-- 插入主要竞争对手
INSERT INTO companies (symbol, name, sector, industry, headquarters, website) VALUES
    ('CSCO', 'Cisco Systems Inc', 'Technology', 'Networking Equipment', 'San Jose, CA, USA', 'https://www.cisco.com'),
    ('HPE', 'Hewlett Packard Enterprise', 'Technology', 'Networking Equipment', 'Spring, TX, USA', 'https://www.hpe.com'),
    ('JNPR', 'Juniper Networks Inc', 'Technology', 'Networking Equipment', 'Sunnyvale, CA, USA', 'https://www.juniper.net')
ON CONFLICT (symbol) DO NOTHING;

COMMENT ON TABLE companies IS '公司基本信息表';
COMMENT ON TABLE financial_data IS '财务数据表 - 存储季度财务报表数据';
COMMENT ON TABLE product_line_revenue IS '产品线营收数据表 - 支持层级结构';
COMMENT ON TABLE geographic_revenue IS '地理营收分布表 - 用于地图展示';
COMMENT ON TABLE milestone_events IS '里程碑事件表 - 重要事件时间轴';
COMMENT ON TABLE competitor_data IS '竞争对手数据表 - 用于竞争分析';
COMMENT ON TABLE market_metrics IS '市场指标表 - 行业和市场数据';
COMMENT ON TABLE data_update_log IS '数据更新日志表 - 追踪数据变更';