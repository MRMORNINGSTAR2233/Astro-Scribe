import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('Chat query request received')
    const { message, sessionId, messageHistory } = await request.json()
    console.log('Request data:', { message, sessionId })
    
    // Perform RAG search to find relevant papers
    console.log('Starting RAG search...')
    const relevantPapers = await performRAGSearch(message)
    console.log('RAG search completed, found papers:', relevantPapers.length)
    
    // Generate response using RAG
    console.log('Generating response...')
    const response = await generateRAGResponse(message, relevantPapers, messageHistory)
    console.log('Response generated')
    
    // Fact-check the response
    console.log('Fact checking...')
    const isFactChecked = await factCheckResponse(response, relevantPapers)
    console.log('Fact check completed:', isFactChecked)
    
    // Save user message
    if (sessionId) {
      console.log('Saving message to database...')
      await saveMessage(sessionId, message, response, relevantPapers, isFactChecked)
      await updateSessionTimestamp(sessionId)
      console.log('Message saved successfully')
    }
    
    return NextResponse.json({
      response,
      sources: relevantPapers,
      isFactChecked
    })

  } catch (error) {
    console.error('Error processing chat query:', error)
    return NextResponse.json(
      { error: 'Failed to process query', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function performRAGSearch(query: string) {
  const client = await pool.connect()
  
  try {
    // Use text search for now (since AI services might not be available)
    const textQuery = `
      SELECT 
        p.id as paper_id,
        p.title,
        p.abstract,
        p.authors,
        p.publication_year,
        tc.content,
        ts_rank(
          to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '') || ' ' || COALESCE(tc.content, '')),
          plainto_tsquery('english', $1)
        ) as relevance_score
      FROM papers p
      LEFT JOIN text_chunks tc ON p.id = tc.paper_id
      WHERE 
        to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '') || ' ' || COALESCE(tc.content, ''))
        @@ plainto_tsquery('english', $1)
      ORDER BY relevance_score DESC
      LIMIT 5
    `
    
    const result = await client.query(textQuery, [query])
    
    return result.rows.map((row: any) => ({
      paperId: row.paper_id,
      title: row.title,
      abstract: row.abstract || '',
      authors: row.authors,
      year: row.publication_year,
      snippet: (row.content || row.abstract || '').substring(0, 200) + '...',
      relevanceScore: parseFloat(row.relevance_score) || 0.5
    }))
    
  } catch (error) {
    console.error('Error in text search:', error)
    return []
  } finally {
    client.release()
  }
}

async function generateRAGResponse(query: string, relevantPapers: any[], messageHistory: any[]) {
  // Simple RAG response generation
  // In production, this would use an LLM like OpenAI GPT
  
  if (relevantPapers.length === 0) {
    return "I couldn't find specific papers related to your question in our database. Could you try rephrasing your question or ask about a different topic in space biology?"
  }
  
  const context = relevantPapers.map(paper => 
    `Paper: "${paper.title}" by ${paper.authors} (${paper.year})\nContent: ${paper.snippet}\n`
  ).join('\n')
  
  // Generate a contextual response based on the papers
  const response = generateContextualResponse(query, relevantPapers)
  
  return response
}

function generateContextualResponse(query: string, papers: any[]): string {
  const lowerQuery = query.toLowerCase()
  
  // Extract key topics from query
  const topics = {
    microgravity: lowerQuery.includes('microgravity') || lowerQuery.includes('weightless'),
    radiation: lowerQuery.includes('radiation') || lowerQuery.includes('cosmic ray'),
    bone: lowerQuery.includes('bone') || lowerQuery.includes('skeletal'),
    muscle: lowerQuery.includes('muscle') || lowerQuery.includes('muscular'),
    cardiovascular: lowerQuery.includes('cardiovascular') || lowerQuery.includes('heart'),
    effects: lowerQuery.includes('effect') || lowerQuery.includes('impact'),
    astronaut: lowerQuery.includes('astronaut') || lowerQuery.includes('crew'),
    countermeasure: lowerQuery.includes('countermeasure') || lowerQuery.includes('prevention')
  }
  
  let response = "Based on the research papers in our database, here's what I found:\n\n"
  
  // Generate response based on detected topics
  if (topics.microgravity && topics.bone) {
    response += "Research shows that microgravity exposure leads to significant bone density loss in astronauts. "
  }
  if (topics.radiation) {
    response += "Space radiation poses serious health risks including increased cancer risk and cellular damage. "
  }
  if (topics.countermeasure) {
    response += "Various countermeasures have been developed including exercise protocols and pharmaceutical interventions. "
  }
  
  // Add paper-specific information
  const relevantPapers = papers.slice(0, 3)
  if (relevantPapers.length > 0) {
    response += "\n\nRelevant research includes:\n"
    relevantPapers.forEach((paper, index) => {
      response += `${index + 1}. "${paper.title}" (${paper.year}) - ${paper.snippet.substring(0, 100)}...\n`
    })
  }
  
  response += "\n\nWould you like me to provide more specific information about any of these studies?"
  
  return response
}

async function factCheckResponse(response: string, relevantPapers: any[]): Promise<boolean> {
  // Simple fact-checking logic
  // In production, this would use more sophisticated methods
  
  // Check if response is grounded in the provided papers
  const responseTerms = response.toLowerCase().split(/\s+/)
  
  let groundedTerms = 0
  let totalTerms = responseTerms.length
  
  for (const paper of relevantPapers) {
    const paperText = (paper.title + ' ' + paper.abstract + ' ' + paper.snippet).toLowerCase()
    
    for (const term of responseTerms) {
      if (term.length > 3 && paperText.includes(term)) {
        groundedTerms++
      }
    }
  }
  
  // If more than 30% of terms are grounded in papers, consider it fact-checked
  return (groundedTerms / totalTerms) > 0.3
}

async function saveMessage(sessionId: string, userMessage: string, assistantResponse: string, sources?: any[], isFactChecked?: boolean) {
  const client = await pool.connect()
  try {
    // Ensure session exists
    await ensureSessionExists(sessionId)
    
    const query = `
      INSERT INTO chat_messages (session_id, message, response, sources, query_type)
      VALUES ($1, $2, $3, $4, $5)
    `
    
    await client.query(query, [
      sessionId, 
      userMessage, 
      assistantResponse,
      sources ? JSON.stringify(sources) : null,
      'rag_search'
    ])
  } finally {
    client.release()
  }
}

async function ensureSessionExists(sessionId: string) {
  const client = await pool.connect()
  try {
    const checkQuery = `SELECT id FROM chat_sessions WHERE id = $1`
    const result = await client.query(checkQuery, [sessionId])
    
    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO chat_sessions (id, title)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
      `
      await client.query(insertQuery, [sessionId, 'New Chat Session'])
    }
  } finally {
    client.release()
  }
}

async function updateSessionTimestamp(sessionId: string) {
  const client = await pool.connect()
  try {
    const query = `
      UPDATE chat_sessions 
      SET updated_at = NOW() 
      WHERE id = $1
    `
    
    await client.query(query, [sessionId])
  } finally {
    client.release()
  }
}