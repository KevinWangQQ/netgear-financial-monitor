-- 创建公司表
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建财务数据表
CREATE TABLE IF NOT EXISTS financial_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(10) NOT NULL, -- 格式: Q1-2024
    revenue BIGINT,
    gross_profit BIGINT,
    net_income BIGINT,
    total_assets BIGINT,
    operating_expenses BIGINT,
    cash_and_equivalents BIGINT,
    total_debt BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, period)
);

-- 插入初始公司数据
INSERT INTO companies (symbol, name, sector) VALUES
('NTGR', 'NETGEAR Inc', 'Technology'),
('CSCO', 'Cisco Systems Inc', 'Technology'),
('ASUS', 'ASUSTeK Computer Inc', 'Technology'),
('HPE', 'Hewlett Packard Enterprise', 'Technology')
ON CONFLICT (symbol) DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_financial_data_company_period ON financial_data(company_id, period);
CREATE INDEX IF NOT EXISTS idx_financial_data_period ON financial_data(period);
CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);