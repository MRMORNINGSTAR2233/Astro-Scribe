// Health check endpoint for Docker container monitoring
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        app: 'healthy',
        database: 'unknown',
        neo4j: 'unknown',
        groq: 'unknown',
        gemini: 'unknown'
      }
    }

    // Check database connections if available
    try {
      // You can add database connectivity checks here
      // For now, we'll just check if environment variables are set
      if (process.env.DATABASE_URL) {
        healthStatus.services.database = 'configured'
      }
      if (process.env.NEO4J_URI) {
        healthStatus.services.neo4j = 'configured'
      }
      if (process.env.GROQ_API_KEY) {
        healthStatus.services.groq = 'configured'
      }
      if (process.env.GEMINI_API_KEY) {
        healthStatus.services.gemini = 'configured'
      }
    } catch (error) {
      console.error('Health check service error:', error)
    }

    return NextResponse.json(healthStatus, { status: 200 })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}