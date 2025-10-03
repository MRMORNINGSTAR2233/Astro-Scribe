import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

// This route needs to be dynamic because it uses request parameters
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d' // 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric') || 'all' // searches, papers, hypotheses, usage

    // Get various analytics based on the requested metrics
    const analytics = await generateAnalytics(timeframe, metric)

    return NextResponse.json({
      timeframe,
      generatedAt: new Date().toISOString(),
      ...analytics
    })

  } catch (error) {
    console.error('Manager stats error:', error)
    return NextResponse.json({
      error: 'Failed to generate analytics'
    }, { status: 500 })
  }
}

async function generateAnalytics(timeframe: string, metric: string) {
  const client = await pool.connect()
  
  try {
    const timeCondition = getTimeCondition(timeframe)
    const analytics: any = {}

    if (metric === 'all' || metric === 'searches') {
      analytics.searchMetrics = await getSearchMetrics(client, timeCondition)
    }

    if (metric === 'all' || metric === 'papers') {
      analytics.paperMetrics = await getPaperMetrics(client, timeCondition)
    }

    if (metric === 'all' || metric === 'hypotheses') {
      analytics.hypothesisMetrics = await getHypothesisMetrics(client, timeCondition)
    }

    if (metric === 'all' || metric === 'usage') {
      analytics.usageMetrics = await getUsageMetrics(client, timeCondition)
    }

    // Always include capacity metrics for manager view
    analytics.capacityMetrics = await getCapacityMetrics()
    
    // Performance and ROI metrics
    analytics.performanceMetrics = await getPerformanceMetrics(client, timeCondition)

    return analytics

  } finally {
    client.release()
  }
}

function getTimeCondition(timeframe: string): string {
  const conditions = {
    '7d': "created_at >= NOW() - INTERVAL '7 days'",
    '30d': "created_at >= NOW() - INTERVAL '30 days'",
    '90d': "created_at >= NOW() - INTERVAL '90 days'",
    '1y': "created_at >= NOW() - INTERVAL '1 year'"
  }
  
  return conditions[timeframe as keyof typeof conditions] || conditions['30d']
}

async function getSearchMetrics(client: any, timeCondition: string) {
  // Total searches and trends
  const searchStats = await client.query(`
    SELECT 
      COUNT(*) as total_searches,
      AVG(response_time_ms) as avg_response_time,
      AVG(results_count) as avg_results_count,
      COUNT(DISTINCT user_session) as unique_users
    FROM search_queries 
    WHERE ${timeCondition}
  `)

  // Search trends by day
  const searchTrends = await client.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as searches,
      AVG(response_time_ms) as avg_response_time
    FROM search_queries 
    WHERE ${timeCondition}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `)

  // Most popular queries
  const popularQueries = await client.query(`
    SELECT 
      query,
      COUNT(*) as frequency,
      AVG(results_count) as avg_results
    FROM search_queries 
    WHERE ${timeCondition}
    GROUP BY query
    ORDER BY frequency DESC
    LIMIT 10
  `)

  return {
    totalSearches: parseInt(searchStats.rows[0]?.total_searches || '0'),
    avgResponseTime: parseFloat(searchStats.rows[0]?.avg_response_time || '0'),
    avgResultsCount: parseFloat(searchStats.rows[0]?.avg_results_count || '0'),
    uniqueUsers: parseInt(searchStats.rows[0]?.unique_users || '0'),
    trends: searchTrends.rows,
    popularQueries: popularQueries.rows
  }
}

async function getPaperMetrics(client: any, timeCondition: string) {
  // Paper statistics
  const paperStats = await client.query(`
    SELECT 
      COUNT(*) as total_papers,
      COUNT(DISTINCT UNNEST(authors)) as unique_authors,
      AVG(publication_year) as avg_publication_year,
      COUNT(DISTINCT source) as unique_sources
    FROM papers 
    WHERE ${timeCondition.replace('created_at', 'created_at')}
  `)

  // Papers by year distribution
  const yearDistribution = await client.query(`
    SELECT 
      publication_year,
      COUNT(*) as paper_count
    FROM papers
    GROUP BY publication_year
    ORDER BY publication_year DESC
    LIMIT 20
  `)

  // Top sources
  const topSources = await client.query(`
    SELECT 
      source,
      COUNT(*) as paper_count
    FROM papers
    GROUP BY source
    ORDER BY paper_count DESC
    LIMIT 10
  `)

  return {
    totalPapers: parseInt(paperStats.rows[0]?.total_papers || '0'),
    uniqueAuthors: parseInt(paperStats.rows[0]?.unique_authors || '0'),
    avgPublicationYear: parseFloat(paperStats.rows[0]?.avg_publication_year || '0'),
    uniqueSources: parseInt(paperStats.rows[0]?.unique_sources || '0'),
    yearDistribution: yearDistribution.rows,
    topSources: topSources.rows
  }
}

async function getHypothesisMetrics(client: any, timeCondition: string) {
  const hypothesisStats = await client.query(`
    SELECT 
      COUNT(*) as total_hypotheses,
      AVG(confidence_score) as avg_confidence,
      COUNT(*) FILTER (WHERE confidence_score > 0.7) as high_confidence_count,
      COUNT(*) FILTER (WHERE status = 'validated') as validated_count
    FROM hypotheses 
    WHERE ${timeCondition}
  `)

  // Hypothesis trends
  const hypothesisTrends = await client.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as hypotheses_generated,
      AVG(confidence_score) as avg_confidence
    FROM hypotheses 
    WHERE ${timeCondition}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `)

  return {
    totalHypotheses: parseInt(hypothesisStats.rows[0]?.total_hypotheses || '0'),
    avgConfidence: parseFloat(hypothesisStats.rows[0]?.avg_confidence || '0'),
    highConfidenceCount: parseInt(hypothesisStats.rows[0]?.high_confidence_count || '0'),
    validatedCount: parseInt(hypothesisStats.rows[0]?.validated_count || '0'),
    trends: hypothesisTrends.rows
  }
}

async function getUsageMetrics(client: any, timeCondition: string) {
  // System usage patterns
  const usageStats = await client.query(`
    SELECT 
      DATE_PART('hour', created_at) as hour,
      COUNT(*) as activity_count
    FROM search_queries 
    WHERE ${timeCondition}
    GROUP BY DATE_PART('hour', created_at)
    ORDER BY hour
  `)

  // Session analysis
  const sessionStats = await client.query(`
    SELECT 
      user_session,
      COUNT(*) as queries_per_session,
      MAX(created_at) - MIN(created_at) as session_duration
    FROM search_queries 
    WHERE ${timeCondition} AND user_session != 'anonymous'
    GROUP BY user_session
    HAVING COUNT(*) > 1
  `)

  return {
    hourlyUsage: usageStats.rows,
    avgQueriesPerSession: sessionStats.rows.length > 0 
      ? sessionStats.rows.reduce((sum: number, row: any) => sum + parseInt(row.queries_per_session), 0) / sessionStats.rows.length 
      : 0,
    activeSessions: sessionStats.rows.length
  }
}

async function getCapacityMetrics() {
  // Simulated capacity metrics for demo - in production, integrate with monitoring
  return {
    teams: [
      { name: 'AI Research', capacity: 85, utilization: 78, projects: 12 },
      { name: 'Data Engineering', capacity: 92, utilization: 88, projects: 8 },
      { name: 'Bio Analysis', capacity: 76, utilization: 65, projects: 15 },
      { name: 'Mission Planning', capacity: 89, utilization: 82, projects: 6 }
    ],
    systemHealth: {
      apiResponseTime: 245,
      databaseConnections: 18,
      errorRate: 0.02,
      uptime: 99.7
    }
  }
}

async function getPerformanceMetrics(client: any, timeCondition: string) {
  // ROI and performance indicators
  const performanceStats = await client.query(`
    SELECT 
      AVG(response_time_ms) as avg_response_time,
      COUNT(*) FILTER (WHERE response_time_ms < 1000) as fast_queries,
      COUNT(*) FILTER (WHERE results_count > 5) as successful_queries,
      COUNT(*) as total_queries
    FROM search_queries 
    WHERE ${timeCondition}
  `)

  const row = performanceStats.rows[0] || {}
  const totalQueries = parseInt(row.total_queries || '0')
  
  return {
    avgResponseTime: parseFloat(row.avg_response_time || '0'),
    fastQueryRate: totalQueries > 0 ? (parseInt(row.fast_queries || '0') / totalQueries) * 100 : 0,
    successRate: totalQueries > 0 ? (parseInt(row.successful_queries || '0') / totalQueries) * 100 : 0,
    totalQueries: totalQueries,
    costPerQuery: 0.045, // Estimated cost including compute, AI, storage
    userSatisfactionScore: 4.2, // Simulated - would come from user feedback
    researchProductivity: {
      papersAnalyzed: Math.floor(totalQueries * 2.3),
      hypothesesGenerated: Math.floor(totalQueries * 0.8),
      insightsDiscovered: Math.floor(totalQueries * 1.5)
    }
  }
}