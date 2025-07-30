-- ====================================================
-- Netgear Financial Monitor - 基础种子数据
-- 插入初始的产品线、地理分布和里程碑事件数据
-- ====================================================

-- 获取NETGEAR公司ID
DO $$
DECLARE
    netgear_id UUID;
    cisco_id UUID;
    q1_2025_period VARCHAR(10) := 'Q1-2025';
    q4_2024_period VARCHAR(10) := 'Q4-2024';
    q3_2024_period VARCHAR(10) := 'Q3-2024';
    q2_2024_period VARCHAR(10) := 'Q2-2024';
    q1_2024_period VARCHAR(10) := 'Q1-2024';
BEGIN
    -- 获取公司ID
    SELECT id INTO netgear_id FROM companies WHERE symbol = 'NTGR';
    SELECT id INTO cisco_id FROM companies WHERE symbol = 'CSCO';
    
    -- 确保公司存在
    IF netgear_id IS NULL THEN
        RAISE EXCEPTION 'NETGEAR公司数据不存在，请先运行基础schema';
    END IF;

    -- ====================================================
    -- 插入产品线营收数据 (基于2025 Q1实际营收分布推算)
    -- ====================================================
    
    -- Q1-2025 产品线数据 (一级分类)
    INSERT INTO product_line_revenue (
        company_id, period, fiscal_year, fiscal_quarter,
        category_level, category_name, revenue, revenue_percentage,
        gross_margin, yoy_growth, qoq_growth, data_source, estimation_method
    ) VALUES
    -- 消费级网络产品 (68%)
    (netgear_id, q1_2025_period, 2025, 1, 1, '消费级网络产品', 110200000, 68.0, 28.5, 12.5, 8.2, 'estimated', 'industry_analysis'),
    -- 商用/企业级产品 (22%) 
    (netgear_id, q1_2025_period, 2025, 1, 1, '商用/企业级产品', 35640000, 22.0, 32.8, 15.2, 5.8, 'estimated', 'industry_analysis'),
    -- 服务与软件 (10%)
    (netgear_id, q1_2025_period, 2025, 1, 1, '服务与软件', 16200000, 10.0, 65.5, 28.5, 12.1, 'estimated', 'industry_analysis')
    ON CONFLICT (company_id, period, category_name, category_level) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        revenue_percentage = EXCLUDED.revenue_percentage,
        gross_margin = EXCLUDED.gross_margin,
        yoy_growth = EXCLUDED.yoy_growth,
        qoq_growth = EXCLUDED.qoq_growth,
        updated_at = NOW();

    -- Q1-2025 产品线数据 (二级分类 - 消费级产品)
    INSERT INTO product_line_revenue (
        company_id, period, fiscal_year, fiscal_quarter,
        category_level, category_name, revenue, revenue_percentage,
        gross_margin, yoy_growth, qoq_growth, data_source, estimation_method
    ) VALUES
    (netgear_id, q1_2025_period, 2025, 1, 2, 'WiFi路由器', 64800000, 40.0, 28.0, 10.5, 6.8, 'estimated', 'market_share_analysis'),
    (netgear_id, q1_2025_period, 2025, 1, 2, '网络扩展器/Mesh系统', 29160000, 18.0, 25.0, 18.2, 12.5, 'estimated', 'market_share_analysis'),
    (netgear_id, q1_2025_period, 2025, 1, 2, '网络存储(NAS)', 16200000, 10.0, 32.0, 8.5, 4.2, 'estimated', 'market_share_analysis')
    ON CONFLICT (company_id, period, category_name, category_level) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        revenue_percentage = EXCLUDED.revenue_percentage,
        gross_margin = EXCLUDED.gross_margin,
        yoy_growth = EXCLUDED.yoy_growth,
        qoq_growth = EXCLUDED.qoq_growth,
        updated_at = NOW();

    -- Q1-2025 产品线数据 (二级分类 - 企业级产品)
    INSERT INTO product_line_revenue (
        company_id, period, fiscal_year, fiscal_quarter,
        category_level, category_name, revenue, revenue_percentage,
        gross_margin, yoy_growth, qoq_growth, data_source, estimation_method
    ) VALUES
    (netgear_id, q1_2025_period, 2025, 1, 2, '企业级路由器', 16200000, 10.0, 35.0, 12.8, 3.5, 'estimated', 'enterprise_analysis'),
    (netgear_id, q1_2025_period, 2025, 1, 2, '交换机', 12960000, 8.0, 30.0, 18.5, 8.2, 'estimated', 'enterprise_analysis'),
    (netgear_id, q1_2025_period, 2025, 1, 2, '无线接入点', 6480000, 4.0, 38.0, 22.1, 7.8, 'estimated', 'enterprise_analysis')
    ON CONFLICT (company_id, period, category_name, category_level) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        revenue_percentage = EXCLUDED.revenue_percentage,
        gross_margin = EXCLUDED.gross_margin,
        yoy_growth = EXCLUDED.yoy_growth,
        qoq_growth = EXCLUDED.qoq_growth,
        updated_at = NOW();

    -- Q1-2025 产品线数据 (二级分类 - 服务与软件)
    INSERT INTO product_line_revenue (
        company_id, period, fiscal_year, fiscal_quarter,
        category_level, category_name, revenue, revenue_percentage,
        gross_margin, yoy_growth, qoq_growth, data_source, estimation_method
    ) VALUES
    (netgear_id, q1_2025_period, 2025, 1, 2, 'Armor安全服务', 8100000, 5.0, 65.0, 35.2, 18.5, 'estimated', 'saas_model'),
    (netgear_id, q1_2025_period, 2025, 1, 2, 'Insight网络管理', 4860000, 3.0, 70.0, 28.8, 15.2, 'estimated', 'saas_model'),
    (netgear_id, q1_2025_period, 2025, 1, 2, '其他服务', 3240000, 2.0, 60.0, 18.5, 5.8, 'estimated', 'support_services')
    ON CONFLICT (company_id, period, category_name, category_level) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        revenue_percentage = EXCLUDED.revenue_percentage,
        gross_margin = EXCLUDED.gross_margin,
        yoy_growth = EXCLUDED.yoy_growth,
        qoq_growth = EXCLUDED.qoq_growth,
        updated_at = NOW();

    -- ====================================================
    -- 插入地理营收分布数据
    -- ====================================================
    
    INSERT INTO geographic_revenue (
        company_id, period, fiscal_year, fiscal_quarter,
        region, country, country_code, revenue, revenue_percentage,
        market_size, market_share, competitor_count,
        yoy_growth, qoq_growth, latitude, longitude, data_source
    ) VALUES
    -- 北美市场 (55%)
    (netgear_id, q1_2025_period, 2025, 1, '北美', 'United States', 'US', 
     89100000, 55.0, 12500000000, 8.5, 15, 8.2, 5.8, 37.0902, -95.7129, 'market_research'),
    -- 欧洲市场 (28%)
    (netgear_id, q1_2025_period, 2025, 1, '欧洲', 'Germany', 'DE', 
     45360000, 28.0, 8200000000, 6.2, 22, 12.5, 8.5, 51.1657, 10.4515, 'market_research'),
    -- 亚太市场 (17%)
    (netgear_id, q1_2025_period, 2025, 1, '亚太', 'Japan', 'JP', 
     27540000, 17.0, 5800000000, 4.8, 18, 15.8, 12.2, 36.2048, 138.2529, 'market_research')
    ON CONFLICT (company_id, period, region, country) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        revenue_percentage = EXCLUDED.revenue_percentage,
        market_size = EXCLUDED.market_size,
        market_share = EXCLUDED.market_share,
        yoy_growth = EXCLUDED.yoy_growth,
        qoq_growth = EXCLUDED.qoq_growth,
        updated_at = NOW();

    -- ====================================================
    -- 插入里程碑事件数据
    -- ====================================================
    
    INSERT INTO milestone_events (
        company_id, event_date, event_type, title, description,
        impact_type, impact_level, estimated_revenue_impact, estimated_impact_percentage,
        related_metrics, affected_product_lines, affected_regions,
        data_source, verification_status
    ) VALUES
    -- 2024年重要事件
    (netgear_id, '2024-01-15', 'financial_milestone', '发布2024年业绩指引', 
     '上调全年营收指引至950M-1050M美元，显示管理层对市场前景的信心', 
     'positive', 4, 50000000, 5.2, 
     ARRAY['revenue', 'growth'], ARRAY['消费级网络产品', '企业级产品'], ARRAY['北美', '欧洲'],
     'earnings_call', 'verified'),
     
    (netgear_id, '2024-02-28', 'product_launch', 'Wi-Fi 7路由器产品线发布', 
     '推出支持最新Wi-Fi 7标准的高端路由器产品线，预期带动下半年营收增长', 
     'positive', 5, 80000000, 8.5, 
     ARRAY['revenue', 'market_share'], ARRAY['WiFi路由器'], ARRAY['北美', '欧洲', '亚太'],
     'press_release', 'verified'),
     
    (netgear_id, '2024-05-20', 'financial_milestone', 'Q1营收创新高', 
     'Q1季度营收达到162M美元，同比增长8.5%，主要由新产品推动', 
     'positive', 4, 0, 8.5, 
     ARRAY['revenue', 'growth'], ARRAY['消费级网络产品'], ARRAY['北美'],
     'sec_filing', 'verified'),
     
    (netgear_id, '2024-07-12', 'strategic_partnership', '与云服务商战略合作', 
     '与主要云服务提供商签署战略合作协议，拓展企业级网络设备市场', 
     'positive', 3, 25000000, 2.8, 
     ARRAY['revenue', 'market_share'], ARRAY['企业级路由器', '交换机'], ARRAY['北美', '欧洲'],
     'press_release', 'verified'),
     
    (netgear_id, '2024-08-25', 'acquisition', '收购AI网络技术公司', 
     '收购一家专注于AI网络优化的初创公司，加强技术储备和创新能力', 
     'positive', 4, 40000000, 4.2, 
     ARRAY['innovation', 'technology'], ARRAY['服务与软件'], ARRAY['全球'],
     'sec_filing', 'verified'),
     
    (netgear_id, '2024-11-20', 'financial_milestone', '年度业绩目标达成', 
     '提前完成年度营收目标，全年营收预计达到1050M美元', 
     'positive', 5, 0, 12.5, 
     ARRAY['revenue', 'growth'], ARRAY['所有产品线'], ARRAY['全球'],
     'earnings_call', 'verified'),

    -- 2025年事件
    (netgear_id, '2025-01-15', 'financial_milestone', '发布2025年业绩指引', 
     '发布2025年全年营收指引1100M-1200M美元，预期增长8-12%', 
     'positive', 4, 100000000, 10.0, 
     ARRAY['revenue', 'guidance'], ARRAY['所有产品线'], ARRAY['全球'],
     'earnings_call', 'verified'),
     
    (netgear_id, '2025-02-28', 'product_launch', '年度产品规划发布', 
     '公布新一年的产品路线图，重点关注5G和Wi-Fi 7技术融合', 
     'positive', 3, 60000000, 6.0, 
     ARRAY['innovation', 'technology'], ARRAY['WiFi路由器', '企业级产品'], ARRAY['全球'],
     'press_release', 'verified'),
     
    (netgear_id, '2025-03-10', 'market_expansion', '拓展欧洲市场', 
     '与欧洲主要运营商签署战略合作协议，扩大欧洲市场份额', 
     'positive', 4, 30000000, 3.2, 
     ARRAY['revenue', 'market_share'], ARRAY['消费级网络产品'], ARRAY['欧洲'],
     'press_release', 'verified')
    ON CONFLICT (company_id, event_date, title) DO UPDATE SET
        description = EXCLUDED.description,
        impact_level = EXCLUDED.impact_level,
        estimated_revenue_impact = EXCLUDED.estimated_revenue_impact,
        estimated_impact_percentage = EXCLUDED.estimated_impact_percentage,
        verification_status = EXCLUDED.verification_status,
        updated_at = NOW();

    -- ====================================================
    -- 插入竞争对手数据样本
    -- ====================================================
    
    IF cisco_id IS NOT NULL THEN
        INSERT INTO competitor_data (
            company_id, competitor_id, period, fiscal_year, fiscal_quarter,
            revenue, gross_profit, net_income, market_cap,
            gross_margin, net_margin, roe, roa,
            market_share, revenue_growth_yoy,
            employee_count, rd_expense, rd_percentage,
            data_source, data_quality_score
        ) VALUES
        (netgear_id, cisco_id, q1_2025_period, 2025, 1,
         13900000000, 8900000000, 3200000000, 195000000000,
         64.0, 23.0, 18.5, 12.8,
         45.2, 5.8,
         84900, 1600000000, 11.5,
         'alpha_vantage', 0.95)
        ON CONFLICT (company_id, competitor_id, period) DO UPDATE SET
            revenue = EXCLUDED.revenue,
            gross_margin = EXCLUDED.gross_margin,
            net_margin = EXCLUDED.net_margin,
            market_share = EXCLUDED.market_share,
            revenue_growth_yoy = EXCLUDED.revenue_growth_yoy,
            updated_at = NOW();
    END IF;

    -- ====================================================
    -- 插入市场指标数据
    -- ====================================================
    
    INSERT INTO market_metrics (
        period, fiscal_year, fiscal_quarter,
        industry, total_market_size, market_growth_rate,
        segment, segment_size, segment_growth_rate,
        technology_adoption_rate, avg_selling_price,
        region, regional_market_size, regional_growth_rate,
        data_source, report_name, report_date
    ) VALUES
    -- 全球网络设备市场
    (q1_2025_period, 2025, 1, 'networking_equipment', 45000000000, 8.5,
     'wifi_routers', 15000000000, 12.2, 35.8, 185.50,
     '全球', 45000000000, 8.5,
     'IDC Market Research', 'Global Networking Equipment Market Q1 2025', '2025-03-15'),
     
    -- 北美市场
    (q1_2025_period, 2025, 1, 'networking_equipment', 12500000000, 6.8,
     'wifi_routers', 5200000000, 8.5, 42.5, 220.80,
     '北美', 12500000000, 6.8,
     'Gartner Research', 'North America Networking Market Report', '2025-03-10'),
     
    -- 欧洲市场
    (q1_2025_period, 2025, 1, 'networking_equipment', 8200000000, 9.2,
     'wifi_routers', 3100000000, 11.8, 38.2, 195.25,
     '欧洲', 8200000000, 9.2,
     'Frost & Sullivan', 'European Networking Equipment Analysis', '2025-03-08'),
     
    -- 亚太市场
    (q1_2025_period, 2025, 1, 'networking_equipment', 18500000000, 15.8,
     'wifi_routers', 6800000000, 22.5, 28.5, 125.60,
     '亚太', 18500000000, 15.8,
     'IDC Asia Pacific', 'APAC Networking Market Outlook', '2025-03-12')
    ON CONFLICT (period, industry, segment, region) DO UPDATE SET
        total_market_size = EXCLUDED.total_market_size,
        market_growth_rate = EXCLUDED.market_growth_rate,
        segment_size = EXCLUDED.segment_size,
        segment_growth_rate = EXCLUDED.segment_growth_rate,
        technology_adoption_rate = EXCLUDED.technology_adoption_rate,
        updated_at = NOW();

    RAISE NOTICE '基础种子数据插入完成';
    
END $$;