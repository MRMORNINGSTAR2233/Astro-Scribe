import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'
import { missionRiskAgent } from '@/lib/langgraph-agents'

export async function POST(request: NextRequest) {
  try {
    const { missionProfile } = await request.json()

    if (!missionProfile || typeof missionProfile !== 'object') {
      return NextResponse.json(
        { error: 'Mission profile is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredFields = ['duration', 'crew_size', 'destination', 'mission_type']
    const missingFields = requiredFields.filter(field => !(field in missionProfile))
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Get relevant research data from database
    const client = await pool.connect()
    let researchData: any[] = []
    
    try {
      // Query for papers related to mission profile
      const researchQuery = `
        SELECT id, title, authors, abstract, keywords, publication_year, source
        FROM papers 
        WHERE 
          abstract ILIKE '%microgravity%' OR 
          abstract ILIKE '%space%' OR 
          abstract ILIKE '%astronaut%' OR
          abstract ILIKE '%radiation%' OR
          abstract ILIKE '%bone loss%' OR
          abstract ILIKE '%muscle atrophy%' OR
          abstract ILIKE '%cardiovascular%' OR
          abstract ILIKE '%psychology%' OR
          abstract ILIKE '%isolation%'
        ORDER BY publication_year DESC
        LIMIT 20
      `
      
      const result = await client.query(researchQuery)
      researchData = result.rows
    } finally {
      client.release()
    }

    // Use LangGraph agent for comprehensive risk analysis
    const riskAnalysis = await missionRiskAgent.process(missionProfile, researchData)

    // Store mission risk analysis for future reference
    const analysisClient = await pool.connect()
    try {
      await analysisClient.query(
        `INSERT INTO mission_risk_analyses (
          mission_profile, 
          overall_risk_score, 
          risk_categories, 
          recommendations,
          confidence_score,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          JSON.stringify(missionProfile),
          riskAnalysis.riskAssessment?.overall_score || 0.5,
          JSON.stringify(riskAnalysis.riskAssessment),
          riskAnalysis.mitigations,
          riskAnalysis.confidence
        ]
      )
    } catch (dbError) {
      // Log error but don't fail the request
      console.error('Error storing risk analysis:', dbError)
    } finally {
      analysisClient.release()
    }

    return NextResponse.json({
      mission_profile: missionProfile,
      risk_analysis: {
        overall_risk_score: calculateOverallRiskScore(riskAnalysis.riskAssessment),
        risk_categories: processRiskCategories(riskAnalysis.riskAssessment),
        recommendations: extractRecommendations(riskAnalysis.mitigations),
        confidence: riskAnalysis.confidence,
        reasoning: riskAnalysis.reasoning,
        evidence_base: {
          papers_analyzed: researchData.length,
          research_domains: extractResearchDomains(researchData)
        }
      },
      metadata: {
        analysis_method: 'LangGraph Mission Risk Agent with Groq AI',
        processing_timestamp: new Date().toISOString(),
        agent_version: '1.0.0'
      }
    })

  } catch (error) {
    console.error('Mission risk analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error during risk analysis' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateOverallRiskScore(riskAssessment: any): number {
  if (!riskAssessment || typeof riskAssessment !== 'object') return 0.5
  
  if (riskAssessment.overall_score) return riskAssessment.overall_score
  
  // Calculate from individual risks if available
  if (Array.isArray(riskAssessment.risks)) {
    const avgRisk = riskAssessment.risks.reduce((sum: number, risk: any) => {
      const riskScore = (risk.probability || 0.5) * (risk.impact || 0.5)
      return sum + riskScore
    }, 0) / riskAssessment.risks.length
    
    return Math.min(Math.max(avgRisk, 0), 1)
  }
  
  return 0.5
}

function processRiskCategories(riskAssessment: any): Array<{
  category: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact: number
  mitigation_strategies: string[]
  evidence_strength: 'low' | 'medium' | 'high'
}> {
  if (!riskAssessment) return []
  
  const categories: any[] = []
  
  // Handle different possible structures
  if (Array.isArray(riskAssessment.risks)) {
    categories.push(...riskAssessment.risks)
  } else if (Array.isArray(riskAssessment)) {
    categories.push(...riskAssessment)
  } else if (typeof riskAssessment === 'object') {
    // Convert object to array format
    Object.entries(riskAssessment).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        categories.push({ category: key, ...value })
      }
    })
  }

  return categories.map((cat: any) => ({
    category: cat.category || cat.name || 'Unknown Risk',
    risk_level: mapRiskLevel(cat.risk_score || cat.severity || 0.5),
    probability: cat.probability || 0.5,
    impact: cat.impact || cat.severity || 0.5,
    mitigation_strategies: cat.mitigations || cat.strategies || [],
    evidence_strength: cat.evidence_strength || 'medium'
  }))
}

function mapRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 0.8) return 'critical'
  if (score >= 0.6) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

function extractRecommendations(mitigations: string): string[] {
  if (!mitigations || typeof mitigations !== 'string') return []
  
  // Split by common delimiters and clean up
  return mitigations
    .split(/\n|•|\d+\.|\-/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .slice(0, 15) // Limit to top 15 recommendations
}

function extractResearchDomains(papers: any[]): string[] {
  const domains = new Set<string>()
  
  papers.forEach(paper => {
    if (paper.keywords && Array.isArray(paper.keywords)) {
      paper.keywords.forEach((keyword: string) => {
        if (keyword.length > 3) {
          domains.add(keyword.toLowerCase())
        }
      })
    }
    
    // Extract domains from abstracts using simple keyword matching
    const abstract = (paper.abstract || '').toLowerCase()
    if (abstract.includes('microgravity') || abstract.includes('space')) domains.add('space physiology')
    if (abstract.includes('radiation')) domains.add('radiation biology')
    if (abstract.includes('bone') || abstract.includes('muscle')) domains.add('musculoskeletal')
    if (abstract.includes('psychology') || abstract.includes('mental')) domains.add('space psychology')
    if (abstract.includes('cardiovascular') || abstract.includes('heart')) domains.add('cardiovascular')
  })
  
  return Array.from(domains).slice(0, 10)
}