# Netgear Financial Monitor

一个专业的财务监控仪表板，用于监控和分析Netgear及其竞争对手的财务表现。

## 功能特性

### 📊 财务仪表板
- **核心KPI指标**: 营收、毛利率、净利率、每股收益等关键财务指标
- **实时数据更新**: 通过Alpha Vantage API获取最新财务数据
- **趋势分析**: 支持同比、环比增长率分析

### 📈 营收分析
- **多维度图表**: 折线图、柱状图、面积图展示营收趋势
- **产品线分析**: 不同产品线的营收占比分析
- **地区分布**: 全球不同地区的营收贡献分析
- **利润率分析**: 毛利率和净利率的趋势变化

### 🔍 竞争对比
- **主要竞争对手**: Cisco、HP Enterprise、Ubiquiti等
- **多维度对比**: 营收、利润率、市场份额、ROE/ROA对比
- **雷达图分析**: 综合竞争力可视化分析
- **详细排名表**: 各项指标的详细排名和数据

## 技术架构

### 前端技术栈
- **Next.js 14**: React框架，支持SSR和API路由
- **TypeScript**: 类型安全的JavaScript
- **Tailwind CSS**: 现代化CSS框架
- **Recharts**: 专业的React图表库
- **Lucide React**: 现代化图标库

### 后端服务
- **Supabase**: PostgreSQL数据库服务
- **Alpha Vantage API**: 财务数据源
- **Python爬虫**: 数据采集和处理

### 部署和自动化
- **Vercel**: 前端部署平台
- **GitHub Actions**: 自动化数据更新和部署
- **定时任务**: 每日自动更新财务数据

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd netgear-financial-monitor

# 安装依赖
npm install
```

### 2. 环境配置

创建 `.env.local` 文件：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

### 3. 数据库设置

在Supabase中执行 `database/schema.sql` 创建数据表。

### 4. 运行项目

```bash
# 开发模式运行
npm run dev

# 构建生产版本
npm run build
npm start
```

### 5. 数据爬取

```bash
# 安装Python依赖
cd scripts
pip install -r requirements.txt

# 运行爬虫
python financial_data_crawler.py
```

## 下一步

1. 配置Supabase数据库和API密钥
2. 获取Alpha Vantage API密钥
3. 运行Python爬虫获取数据
4. 启动前端应用查看仪表板

项目已成功创建！
