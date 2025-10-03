import { NextRequest, NextResponse } from 'next/server'
import { Neo4jService } from '@/lib/neo4j'
import { MissionRiskAnalyzer } from '@/lib/ai-services'
import { pool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { destination, durationDays, crewSize = 4, missionType = 'exploration' } = body

    if (!destination || !durationDays) {
      return NextResponse.json({
        error: 'Destination and duration are required'
      }, { status: 400 })
    }

    // Step 1: Get risk factors from Neo4j knowledge graph
    const graphRisks = await Neo4jService.getMissionRiskProfile(destination, durationDays)

    // Step 2: Get supporting research from PostgreSQL
    const supportingResearch = await getSupportingResearch(destination, durationDays)

    // Step 3: Use AI to analyze and synthesize risks
    const aiAnalysis = await MissionRiskAnalyzer.analyzeMissionRisks(
      destination,
      durationDays,
      [...graphRisks, ...supportingResearch]
    )

    // Step 4: Calculate mission-specific adjustments
    const adjustedRisks = adjustRisksForMission({
      baseRisks: aiAnalysis.rankedRisks,
      destination,
      duration: durationDays,
      crewSize,
      missionType
    })

    // Step 5: Generate countermeasures and research priorities
    const countermeasures = await generateCountermeasures(adjustedRisks)
    const researchPriorities = identifyResearchPriorities(aiAnalysis.knowledgeGaps, adjustedRisks)

    return NextResponse.json({
      missionParameters: {
        destination,
        durationDays,
        crewSize,
        missionType
      },
      riskProfile: {
        rankedRisks: adjustedRisks.slice(0, 10), // Top 10 risks
        overallRiskScore: calculateOverallRisk(adjustedRisks),
        riskDistribution: categorizeRisks(adjustedRisks)
      },
      knowledgeGaps: aiAnalysis.knowledgeGaps,
      countermeasures: countermeasures,
      researchPriorities: researchPriorities,
      evidenceBase: {
        graphInsights: graphRisks.length,
        supportingPapers: supportingResearch.length,
        confidenceLevel: calculateConfidence(graphRisks, supportingResearch)
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Mission risk forecasting error:', error)
    return NextResponse.json({
      error: 'Failed to generate mission risk profile'
    }, { status: 500 })
  }
}

async function getSupportingResearch(destination: string, duration: number) {
  const client = await pool.connect()
  try {
    // Search for papers relevant to the destination and duration
    const result = await client.query(`
      SELECT DISTINCT p.*, tc.content, tc.section_type
      FROM papers p
      JOIN text_chunks tc ON p.id = tc.paper_id
      WHERE (
        tc.content ILIKE $1 OR 
        tc.content ILIKE $2 OR
        tc.content ILIKE $3 OR
        tc.content ILIKE $4
      )
      AND (
        CASE 
          WHEN $5 > 365 THEN tc.content ILIKE '%long%duration%' OR tc.content ILIKE '%extended%'
          WHEN $5 > 180 THEN tc.content ILIKE '%medium%term%' OR tc.content ILIKE '%months%'
          ELSE tc.content ILIKE '%short%term%' OR tc.content ILIKE '%weeks%'
        END
      )
      ORDER BY p.publication_year DESC
      LIMIT 50
    `, [
      `%${destination.toLowerCase()}%`,
      `%${destination.toLowerCase()} mission%`,
      `%biological%${destination.toLowerCase()}%`,
      `%space%biology%${destination.toLowerCase()}%`,
      duration
    ])

    return result.rows
  } finally {
    client.release()
  }
}

function adjustRisksForMission({ baseRisks, destination, duration, crewSize, missionType }: {
  baseRisks: any[],
  destination: string,
  duration: number,
  crewSize: number,
  missionType: string
}) {
  return baseRisks.map(risk => {
    let adjustedScore = risk.score

    // Duration adjustments
    if (duration > 365) { // Long duration missions
      if (risk.category.includes('bone') || risk.category.includes('muscle')) {
        adjustedScore *= 1.3 // Increase bone/muscle risks
      }
      if (risk.category.includes('psychological') || risk.category.includes('behavioral')) {
        adjustedScore *= 1.4 // Increase psychological risks
      }
    }

    // Destination adjustments
    if (destination.toLowerCase() === 'mars') {
      if (risk.category.includes('radiation')) {
        adjustedScore *= 1.5 // Mars has higher radiation exposure
      }
      if (risk.category.includes('communication')) {
        adjustedScore *= 1.6 // Communication delays to Mars
      }
    }

    // Crew size adjustments
    if (crewSize <= 3) {
      if (risk.category.includes('psychological') || risk.category.includes('team')) {
        adjustedScore *= 1.2 // Smaller crews have higher psychological risks
      }
    }

    return {
      ...risk,
      score: Math.min(adjustedScore, 1.0), // Cap at 1.0
      adjustmentFactors: {
        duration: duration > 365 ? 'high' : duration > 180 ? 'medium' : 'low',
        destination: destination.toLowerCase(),
        crewSize: crewSize <= 3 ? 'small' : crewSize <= 6 ? 'medium' : 'large'
      }
    }
  }).sort((a, b) => b.score - a.score)
}

async function generateCountermeasures(risks: any[]) {
  type CountermeasureKey = 'bone density loss' | 'muscle atrophy' | 'radiation exposure' | 'cardiovascular deconditioning';
  
  const countermeasureDB: Record<CountermeasureKey, Array<{ measure: string, effectiveness: number }>> = {
    'bone density loss': [
      { measure: 'Advanced Resistive Exercise Device (ARED)', effectiveness: 0.8 },
      { measure: 'Bisphosphonate medication', effectiveness: 0.7 },
      { measure: 'Vibration therapy', effectiveness: 0.6 }
    ],
    'muscle atrophy': [
      { measure: 'Daily 2.5-hour exercise protocol', effectiveness: 0.8 },
      { measure: 'Electrical muscle stimulation', effectiveness: 0.6 },
      { measure: 'Protein supplementation', effectiveness: 0.7 }
    ],
    'radiation exposure': [
      { measure: 'Radiation shielding optimization', effectiveness: 0.9 },
      { measure: 'Pharmacological radioprotectors', effectiveness: 0.6 },
      { measure: 'Activity scheduling during solar events', effectiveness: 0.8 }
    ],
    'cardiovascular deconditioning': [
      { measure: 'Lower body negative pressure device', effectiveness: 0.7 },
      { measure: 'Cardiovascular exercise protocols', effectiveness: 0.8 },
      { measure: 'Compression garments', effectiveness: 0.6 }
    ]
  }

  return risks.slice(0, 5).map(risk => {
    const category = risk.category.toLowerCase() as string;
    const measures = countermeasureDB[category as CountermeasureKey] || [
      { measure: 'Research countermeasure protocols', effectiveness: 0.5 }
    ]
    
    return {
      risk: risk.category,
      riskScore: risk.score,
      availableCountermeasures: measures,
      recommendedApproach: measures[0]?.measure || 'Further research needed'
    }
  })
}

function identifyResearchPriorities(knowledgeGaps: string[], risks: any[]) {
  const highRisks = risks.filter(r => r.score > 0.7)
  
  return [
    ...knowledgeGaps.slice(0, 3),
    ...highRisks.slice(0, 2).map(r => `Advanced countermeasures for ${r.category.toLowerCase()}`),
    'Long-term biological adaptation mechanisms',
    'Multi-stressor interaction effects',
    'Personalized countermeasure protocols'
  ].slice(0, 8)
}

function calculateOverallRisk(risks: any[]) {
  if (risks.length === 0) return 0
  
  // Weighted average with higher weight for top risks
  const weights = risks.map((_, index) => 1 / (index + 1))
  const weightedSum = risks.reduce((sum, risk, index) => sum + (risk.score * weights[index]), 0)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  
  return Number((weightedSum / totalWeight).toFixed(3))
}

function categorizeRisks(risks: any[]) {
  const categories = {
    physiological: 0,
    psychological: 0,
    environmental: 0,
    operational: 0,
    other: 0
  }

  risks.forEach(risk => {
    const category = risk.category.toLowerCase()
    if (category.includes('bone') || category.includes('muscle') || category.includes('cardiovascular')) {
      categories.physiological++
    } else if (category.includes('psychological') || category.includes('behavioral')) {
      categories.psychological++
    } else if (category.includes('radiation') || category.includes('environment')) {
      categories.environmental++
    } else if (category.includes('operation') || category.includes('communication')) {
      categories.operational++
    } else {
      categories.other++
    }
  })

  return categories
}

function calculateConfidence(graphRisks: any[], supportingResearch: any[]) {
  const graphConfidence = graphRisks.length > 0 ? 0.4 : 0
  const researchConfidence = Math.min(supportingResearch.length / 20, 1) * 0.6
  
  return Number((graphConfidence + researchConfidence).toFixed(2))
}