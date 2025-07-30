# 数据库完整设置指南

## 概述

本指南将帮助您完成NETGEAR财务监控系统的数据库设置，包括：
1. 扩展现有数据库结构
2. 插入基础种子数据
3. 验证数据库设置

## 当前状态

✅ **已完成：**
- 基础表（companies, financial_data）
- Supabase连接配置

❌ **待完成：**
- 产品线营收表（product_line_revenue）
- 地理分布表（geographic_revenue）
- 里程碑事件表（milestone_events）
- 竞争对手数据表（competitor_data）
- 市场指标表（market_metrics）

## 步骤1: 执行数据库结构迁移

### 方法1: 通过Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 SQL Editor
4. 复制并执行以下SQL脚本：

```sql
-- 从 database/migration_to_complete_schema.sql 复制完整内容
-- 这个脚本包含：
-- - 更新现有表结构
-- - 创建新表
-- - 添加索引和视图
-- - 设置触发器
-- - 更新基础数据
```

### 方法2: 使用命令行工具

如果您有Supabase CLI：

```bash
# 安装Supabase CLI
npm install -g supabase

# 登录并链接项目
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 执行迁移
supabase db push database/migration_to_complete_schema.sql
```

## 步骤2: 插入种子数据

执行完结构迁移后，运行种子数据脚本：

### 方法1: 通过SQL Editor

在Supabase SQL Editor中执行：

```sql
-- 从 database/seed_data.sql 复制完整内容
-- 这包含：
-- - 产品线营收数据（Q1-2025）
-- - 地理分布数据
-- - 里程碑事件数据
-- - 竞争对手样本数据
-- - 市场指标数据
```

### 方法2: 使用Python脚本

```bash
cd scripts
source venv/bin/activate
python init_database_data.py
```

## 步骤3: 验证设置

运行验证脚本：

```bash
cd scripts
source venv/bin/activate
python check_tables.py
```

期望输出：
```
✅ companies            - 存在
✅ financial_data       - 存在  
✅ product_line_revenue - 存在
✅ geographic_revenue   - 存在
✅ milestone_events     - 存在
✅ competitor_data      - 存在
✅ market_metrics       - 存在
```

## 步骤4: 测试应用程序集成

1. 启动开发服务器：
```bash
npm run dev
```

2. 访问 http://localhost:3000
3. 检查以下功能：
   - 产品线营收分析显示真实数据
   - 地理分布图显示真实分布
   - 里程碑事件时间轴有内容
   - 数据来源标注为"数据库数据"

## 数据库架构说明

### 核心表结构

1. **companies** - 公司基本信息
2. **financial_data** - 季度财务数据
3. **product_line_revenue** - 产品线营收分析
4. **geographic_revenue** - 地理分布数据
5. **milestone_events** - 重要事件时间轴
6. **competitor_data** - 竞争对手数据
7. **market_metrics** - 市场指标数据

### 数据关系

```
companies (1) → (N) financial_data
companies (1) → (N) product_line_revenue  
companies (1) → (N) geographic_revenue
companies (1) → (N) milestone_events
companies (1) → (N) competitor_data
```

### 索引优化

- 按公司和时间段的复合索引
- 按年份和季度的时间索引
- 按地区和产品分类的分析索引

## 故障排除

### 常见问题

**Q: 权限错误 "RLS policy violation"**
A: 确保使用了正确的API Key，或在Supabase中禁用了RLS

**Q: 表不存在错误**
A: 确认已执行完整的迁移脚本

**Q: 数据插入失败**
A: 检查外键约束，确保companies表有NTGR记录

### 检查清单

- [ ] 环境变量正确设置
- [ ] Supabase项目活跃
- [ ] 网络连接正常
- [ ] 所有表成功创建
- [ ] 种子数据插入成功
- [ ] 应用程序能正常访问数据

## 数据更新策略

### 自动更新

系统支持：
- Alpha Vantage API财务数据自动抓取
- 产品线数据基于真实财务数据推算
- 地理分布数据定期更新

### 手动更新

可通过以下方式更新数据：
1. Supabase Dashboard直接编辑
2. Python脚本批量更新
3. API接口数据同步

## 监控和维护

### 数据质量监控

- data_update_log表记录所有数据变更
- 数据源和置信度标记
- 自动验证和异常检测

### 性能优化

- 定期更新表统计信息
- 监控查询性能
- 必要时添加额外索引

## 下一步

数据库设置完成后，您可以：

1. 配置自动数据抓取任务
2. 设置数据备份策略
3. 集成更多数据源
4. 扩展分析功能

## 支持

如遇问题，请检查：
1. 本项目的README.md
2. Supabase官方文档
3. 项目issues页面

---

*最后更新：2025年7月*