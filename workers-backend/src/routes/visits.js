/**
 * 访问统计路由模块
 * 
 * 功能：
 * - POST /api/visits - 记录访问
 * - GET /api/visits/stats - 获取访问统计（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, getClientIp } from '../auth.js'

const visitsRouter = new Hono()

/**
 * POST /api/visits
 * 记录页面访问（公开接口，无需认证）
 * 请求体：{ page_path }
 */
visitsRouter.post('/', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const body = await c.req.json()
    const pagePath = body.page_path || c.req.query('page') || '/'
    const visitorIp = getClientIp(c)

    await db.insert('site_visits', {
      page_path: pagePath,
      visitor_ip: visitorIp,
      visit_time: new Date().toISOString()
    })

    return c.json({
      code: 200,
      message: '记录成功'
    })
  } catch (error) {
    // 访问记录失败不影响主流程
    console.error('Record visit error:', error)
    return c.json({
      code: 200,
      message: 'ok'
    })
  }
})

/**
 * GET /api/visits/stats
 * 获取访问统计（管理员）
 * 查询参数：days - 统计天数（默认7天）
 */
visitsRouter.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const days = parseInt(c.req.query('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await db.supabase
      .from('site_visits')
      .select('page_path, visit_time, visitor_ip')
      .gte('visit_time', startDate.toISOString())

    if (error) {
      return c.json({
        code: 500,
        message: '查询失败'
      }, 500)
    }

    // 按天聚合
    const dailyStats = {}
    const pageStats = {}

    for (const visit of data || []) {
      const date = new Date(visit.visit_time).toISOString().split('T')[0]
      
      // 每日访问数（按 IP 去重）
      if (!dailyStats[date]) {
        dailyStats[date] = new Set()
      }
      dailyStats[date].add(visit.visitor_ip)

      // 页面访问数
      if (!pageStats[visit.page_path]) {
        pageStats[visit.page_path] = 0
      }
      pageStats[visit.page_path]++
    }

    // 转换为数组
    const daily = Object.entries(dailyStats).map(([date, ips]) => ({
      date,
      uniqueVisitors: ips.size
    })).sort((a, b) => a.date.localeCompare(b.date))

    const pages = Object.entries(pageStats).map(([path, count]) => ({
      path,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 20)

    return c.json({
      code: 200,
      data: {
        days,
        daily,
        topPages: pages,
        totalVisits: (data || []).length
      }
    })
  } catch (error) {
    console.error('Get visit stats error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default visitsRouter
