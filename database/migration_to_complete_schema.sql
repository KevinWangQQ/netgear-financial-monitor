-- ====================================================
-- Netgear Financial Monitor - 数据库结构扩展迁移
-- 从基础schema迁移到完整的数据库结构
-- ====================================================

-- 首先更新现有的companies表，添加缺失的字段
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS market_cap BIGINT,
ADD COLUMN IF NOT EXISTS employees INTEGER,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS headquarters VARCHAR(100),
ADD COLUMN IF NOT EXISTS website VARCHAR(200),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 更新现有的financial_data表，添加缺失的字段
ALTER TABLE financial_data
ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
ADD COLUMN IF NOT EXISTS fiscal_quarter INTEGER,
ADD COLUMN IF NOT EXISTS operating_income BIGINT,
ADD COLUMN IF NOT EXISTS current_assets BIGINT,
ADD COLUMN IF NOT EXISTS current_liabilities BIGINT,
ADD COLUMN IF NOT EXISTS shareholders_equity BIGINT,
ADD COLUMN IF NOT EXISTS operating_cash_flow BIGINT,
ADD COLUMN IF NOT EXISTS investing_cash_flow BIGINT,
ADD COLUMN IF NOT EXISTS financing_cash_flow BIGINT,
ADD COLUMN IF NOT EXISTS free_cash_flow BIGINT,
ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT,
ADD COLUMN IF NOT EXISTS eps DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'alpha_vantage',
ADD COLUMN IF NOT EXISTS confidence_level DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 创建产品线营收数据表
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

-- 创建地理营收分布数据表
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

-- 创建里程碑事件表
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

-- 创建竞争对手数据表
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

-- 创建市场指标表
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

-- 创建数据更新日志表
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

-- 更新现有索引
DROP INDEX IF EXISTS idx_financial_data_company_period;
CREATE INDEX idx_financial_data_company_period ON financial_data(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_financial_data_year_quarter ON financial_data(fiscal_year DESC, fiscal_quarter DESC);

-- 产品线数据索引
CREATE INDEX IF NOT EXISTS idx_product_line_company_period ON product_line_revenue(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_product_line_category ON product_line_revenue(category_level, category_name);

-- 地理数据索引
CREATE INDEX IF NOT EXISTS idx_geographic_revenue_company_period ON geographic_revenue(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_revenue_region ON geographic_revenue(region, country);

-- 事件数据索引
CREATE INDEX IF NOT EXISTS idx_milestone_events_company_date ON milestone_events(company_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_events_type_impact ON milestone_events(event_type, impact_type, impact_level);

-- 竞争对手数据索引
CREATE INDEX IF NOT EXISTS idx_competitor_data_period ON competitor_data(company_id, period DESC);

-- 市场指标索引
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
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_data_updated_at ON financial_data;
CREATE TRIGGER update_financial_data_updated_at BEFORE UPDATE ON financial_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_line_revenue_updated_at ON product_line_revenue;
CREATE TRIGGER update_product_line_revenue_updated_at BEFORE UPDATE ON product_line_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geographic_revenue_updated_at ON geographic_revenue;
CREATE TRIGGER update_geographic_revenue_updated_at BEFORE UPDATE ON geographic_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestone_events_updated_at ON milestone_events;
CREATE TRIGGER update_milestone_events_updated_at BEFORE UPDATE ON milestone_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competitor_data_updated_at ON competitor_data;
CREATE TRIGGER update_competitor_data_updated_at BEFORE UPDATE ON competitor_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_market_metrics_updated_at ON market_metrics;
CREATE TRIGGER update_market_metrics_updated_at BEFORE UPDATE ON market_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================
-- 更新现有公司数据
-- ====================================================

-- 更新NETGEAR公司信息
UPDATE companies SET
    industry = 'Networking Equipment',
    founded_year = 1996,
    headquarters = 'San Jose, CA, USA',
    website = 'https://www.netgear.com',
    updated_at = NOW()
WHERE symbol = 'NTGR';

-- 更新其他公司信息
UPDATE companies SET
    industry = 'Networking Equipment',
    headquarters = 'San Jose, CA, USA',
    website = 'https://www.cisco.com',
    updated_at = NOW()
WHERE symbol = 'CSCO';

UPDATE companies SET
    industry = 'Consumer Electronics',
    headquarters = 'Taipei, Taiwan',
    website = 'https://www.asus.com',
    updated_at = NOW()
WHERE symbol = 'ASUS';

UPDATE companies SET
    industry = 'Networking Equipment',
    headquarters = 'Spring, TX, USA',
    website = 'https://www.hpe.com',
    updated_at = NOW()
WHERE symbol = 'HPE';

-- 插入Juniper Networks（主要竞争对手）
INSERT INTO companies (symbol, name, sector, industry, headquarters, website) VALUES
    ('JNPR', 'Juniper Networks Inc', 'Technology', 'Networking Equipment', 'Sunnyvale, CA, USA', 'https://www.juniper.net')
ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry,
    headquarters = EXCLUDED.headquarters,
    website = EXCLUDED.website,
    updated_at = NOW();

-- ====================================================
-- 更新现有财务数据，添加年份和季度信息
-- ====================================================

-- 解析现有的period字段，添加fiscal_year和fiscal_quarter
UPDATE financial_data 
SET 
    fiscal_quarter = CAST(SUBSTRING(period FROM 2 FOR 1) AS INTEGER),
    fiscal_year = CAST(SUBSTRING(period FROM 4) AS INTEGER),
    updated_at = NOW()
WHERE fiscal_year IS NULL OR fiscal_quarter IS NULL;

-- 添加表注释
COMMENT ON TABLE companies IS '公司基本信息表';
COMMENT ON TABLE financial_data IS '财务数据表 - 存储季度财务报表数据';
COMMENT ON TABLE product_line_revenue IS '产品线营收数据表 - 支持层级结构';
COMMENT ON TABLE geographic_revenue IS '地理营收分布表 - 用于地图展示';
COMMENT ON TABLE milestone_events IS '里程碑事件表 - 重要事件时间轴';
COMMENT ON TABLE competitor_data IS '竞争对手数据表 - 用于竞争分析';
COMMENT ON TABLE market_metrics IS '市场指标表 - 行业和市场数据';
COMMENT ON TABLE data_update_log IS '数据更新日志表 - 追踪数据变更';