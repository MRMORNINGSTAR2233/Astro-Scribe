import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = params.id

    // Get paper details
    const paperQuery = `
      SELECT title, abstract, content
      FROM papers 
      WHERE id = $1
    `
    
    const paperResult = await pool.query(paperQuery, [paperId])
    
    if (paperResult.rows.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const paper = paperResult.rows[0]

    // Generate AI summary (simplified version - in production, use OpenAI/LLM)
    const summary = await generateAISummary(paper)

    return NextResponse.json({ summary })

  } catch (error) {
    console.error('Error generating paper summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

async function generateAISummary(paper: any) {
  // Simplified AI summary generation
  // In production, this would call OpenAI API or local LLM
  
  const abstract = paper.abstract || ''
  const content = paper.content || ''
  
  // Extract key information using simple text processing
  const summary = {
    summary: generateOverallSummary(abstract, content),
    key_findings: extractKeyFindings(abstract, content),
    methodology: extractMethodology(abstract, content),
    conclusions: extractConclusions(abstract, content)
  }

  return summary
}

function generateOverallSummary(abstract: string, content: string): string {
  // Simple summary generation based on abstract
  if (abstract.length > 200) {
    return abstract.substring(0, 200) + '...'
  }
  return abstract || 'Summary not available for this paper.'
}

function extractKeyFindings(abstract: string, content: string): string[] {
  const findings = []
  
  // Look for common research finding indicators
  const findingIndicators = [
    'results show', 'findings indicate', 'demonstrated that', 'evidence suggests',
    'study reveals', 'analysis shows', 'data indicate', 'research demonstrates'
  ]
  
  const text = (abstract + ' ' + content).toLowerCase()
  
  findingIndicators.forEach(indicator => {
    if (text.includes(indicator)) {
      findings.push(`Research ${indicator.replace('results show', 'shows').replace('findings indicate', 'indicates')} significant biological responses to space environment`)
    }
  })
  
  if (findings.length === 0) {
    findings.push('Biological adaptation mechanisms in space environment')
    findings.push('Physiological changes observed during spaceflight')
    findings.push('Potential countermeasures for space-related health effects')
  }
  
  return findings.slice(0, 5)
}

function extractMethodology(abstract: string, content: string): string {
  const text = (abstract + ' ' + content).toLowerCase()
  
  if (text.includes('experiment') || text.includes('trial')) {
    return 'Experimental study design with controlled conditions to assess biological responses to space environment factors.'
  } else if (text.includes('review') || text.includes('meta-analysis')) {
    return 'Systematic review and analysis of existing literature on space biology and human spaceflight effects.'
  } else if (text.includes('observational') || text.includes('cohort')) {
    return 'Observational study analyzing data from space missions and astronaut health records.'
  } else if (text.includes('simulation') || text.includes('model')) {
    return 'Computational modeling and simulation of biological processes in space environment conditions.'
  }
  
  return 'Mixed methodology approach combining experimental and observational techniques to study space biology.'
}

function extractConclusions(abstract: string, content: string): string[] {
  const conclusions = []
  
  const text = (abstract + ' ' + content).toLowerCase()
  
  if (text.includes('microgravity')) {
    conclusions.push('Microgravity environment significantly affects biological systems')
  }
  if (text.includes('radiation')) {
    conclusions.push('Space radiation poses challenges for long-term space missions')
  }
  if (text.includes('countermeasure') || text.includes('intervention')) {
    conclusions.push('Effective countermeasures are essential for crew health maintenance')
  }
  if (text.includes('adaptation') || text.includes('adaptive')) {
    conclusions.push('Biological systems show adaptive responses to space environment')
  }
  
  if (conclusions.length === 0) {
    conclusions.push('Further research needed to understand long-term effects of space environment')
    conclusions.push('Findings contribute to development of space medicine protocols')
    conclusions.push('Results inform future mission planning and crew health strategies')
  }
  
  return conclusions.slice(0, 4)
}