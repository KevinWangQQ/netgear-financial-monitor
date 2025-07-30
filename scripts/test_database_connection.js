/**
 * 测试数据库连接脚本
 * 验证数据库服务是否正常工作
 */

const { databaseService } = require('../src/lib/database-service')

async function testDatabaseConnection() {
  console.log('开始测试数据库连接...')
  
  try {
    // 1. 测试基本连接
    const isConnected = await databaseService.checkDatabaseConnection()
    console.log('数据库连接状态:', isConnected ? '✅ 成功' : '❌ 失败')
    
    if (!isConnected) {
      console.error('数据库连接失败，请检查环境变量和网络连接')
      process.exit(1)
    }
    
    // 2. 测试获取公司信息
    console.log('\n测试获取公司信息...')
    const company = await databaseService.getCompany('NTGR')
    if (company) {
      console.log('✅ 公司信息获取成功:', company.name)
    } else {
      console.log('⚠️  未找到NETGEAR公司信息')
    }
    
    // 3. 测试获取财务数据
    console.log('\n测试获取财务数据...')
    try {
      const financialData = await databaseService.getFinancialData('NTGR', 5)
      console.log(`✅ 财务数据获取成功: ${financialData.length} 条记录`)
      
      if (financialData.length > 0) {
        const latest = financialData[0]
        console.log(`   最新数据: ${latest.period}, 营收: $${(latest.revenue / 1e6).toFixed(1)}M`)
      }
    } catch (error) {
      console.log('⚠️  财务数据获取失败:', error.message)
    }
    
    // 4. 测试获取产品线数据
    console.log('\n测试获取产品线数据...')
    try {
      const productData = await databaseService.getProductLineRevenue('NTGR', 2025)
      console.log(`✅ 产品线数据获取成功: ${productData.length} 条记录`)
      
      if (productData.length > 0) {
        console.log('   产品分类:')
        productData.forEach(item => {
          console.log(`   - ${item.category_name}: $${(item.revenue / 1e6).toFixed(1)}M`)
        })
      }
    } catch (error) {
      console.log('⚠️  产品线数据获取失败:', error.message)
    }
    
    // 5. 测试获取地理分布数据
    console.log('\n测试获取地理分布数据...')
    try {
      const geoData = await databaseService.getGeographicRevenue('NTGR', 2025)
      console.log(`✅ 地理分布数据获取成功: ${geoData.length} 条记录`)
      
      if (geoData.length > 0) {
        console.log('   地区分布:')
        geoData.forEach(item => {
          console.log(`   - ${item.region}: $${(item.revenue / 1e6).toFixed(1)}M (${item.revenue_percentage}%)`)
        })
      }
    } catch (error) {
      console.log('⚠️  地理分布数据获取失败:', error.message)
    }
    
    // 6. 测试获取里程碑事件
    console.log('\n测试获取里程碑事件...')
    try {
      const events = await databaseService.getMilestoneEvents('NTGR', undefined, undefined, 5)
      console.log(`✅ 里程碑事件获取成功: ${events.length} 条记录`)
      
      if (events.length > 0) {
        console.log('   近期事件:')
        events.slice(0, 3).forEach(event => {
          console.log(`   - ${event.event_date}: ${event.title}`)
        })
      }
    } catch (error) {
      console.log('⚠️  里程碑事件获取失败:', error.message)
    }
    
    console.log('\n🎉 数据库连接测试完成!')
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('测试结束')
      process.exit(0)
    })
    .catch(error => {
      console.error('测试异常:', error)
      process.exit(1)
    })
}

module.exports = { testDatabaseConnection }