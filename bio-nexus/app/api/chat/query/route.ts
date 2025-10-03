import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId, messageHistory } = await request.json()
    
    // Perform RAG search to find relevant papers
    const relevantPapers = await performRAGSearch(query)
    
    // Generate response using RAG
    const response = await generateRAGResponse(query, relevantPapers, messageHistory)
    
    // Fact-check the response
    const isFactChecked = await factCheckResponse(response, relevantPapers)
    
    // Save user message
    if (sessionId) {
      await saveMessage(sessionId, 'user', query)
      await saveMessage(sessionId, 'assistant', response, relevantPapers, isFactChecked)
      await updateSessionTimestamp(sessionId)
    }
    
    return NextResponse.json({
      response,
      sources: relevantPapers,
      isFactChecked
    })

  } catch (error) {
    console.error('Error processing chat query:', error)
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    )
  }
}

async function performRAGSearch(query: string) {
  // Vector search for relevant papers and content
  const searchQuery = `
    WITH ranked_chunks AS (
      SELECT 
        tc.content,
        p.id as paper_id,
        p.title,
        p.abstract,
        p.authors,
        p.publication_year,
        1 - (tc.embedding <=> plainto_tsquery($1)::text::vector) as similarity_score
      FROM text_chunks tc
      JOIN papers p ON tc.paper_id = p.id
      WHERE tc.embedding IS NOT NULL
      ORDER BY tc.embedding <=> plainto_tsquery($1)::text::vector
      LIMIT 10
    )
    SELECT 
      paper_id,
      title,
      abstract,
      authors,
      publication_year,
      content,
      similarity_score
    FROM ranked_chunks
    WHERE similarity_score > 0.5
    ORDER BY similarity_score DESC
    LIMIT 5
  `
  
  try {
    const result = await pool.query(searchQuery, [query])
    
    return result.rows.map(row => ({
      paperId: row.paper_id,
      title: row.title,
      abstract: row.abstract || '',
      authors: row.authors,
      year: row.publication_year,
      snippet: row.content.substring(0, 200) + '...',
      relevanceScore: parseFloat(row.similarity_score)
    }))
  } catch (error) {
    console.error('Error in vector search:', error)
    
    // Fallback to text search
    const fallbackQuery = `
      SELECT 
        p.id as paper_id,
        p.title,
        p.abstract,
        p.authors,
        p.publication_year,
        tc.content,
        0.8 as similarity_score
      FROM papers p
      LEFT JOIN text_chunks tc ON p.id = tc.paper_id
      WHERE 
        p.title ILIKE $1 OR 
        p.abstract ILIKE $1 OR
        tc.content ILIKE $1
      ORDER BY 
        CASE 
          WHEN p.title ILIKE $1 THEN 3
          WHEN p.abstract ILIKE $1 THEN 2
          ELSE 1
        END DESC
      LIMIT 5
    `
    
    const fallbackResult = await pool.query(fallbackQuery, [`%${query}%`])
    
    return fallbackResult.rows.map(row => ({
      paperId: row.paper_id,
      title: row.title,
      abstract: row.abstract || '',
      authors: row.authors,
      year: row.publication_year,
      snippet: (row.content || row.abstract || '').substring(0, 200) + '...',
      relevanceScore: 0.8
    }))
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

async function saveMessage(sessionId: string, role: string, content: string, sources?: any[], isFactChecked?: boolean) {
  const query = `
    INSERT INTO chat_messages (session_id, role, content, sources, is_fact_checked, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `
  
  await pool.query(query, [
    sessionId, 
    role, 
    content, 
    sources ? JSON.stringify(sources) : null,
    isFactChecked || false
  ])
}

async function updateSessionTimestamp(sessionId: string) {
  const query = `
    UPDATE chat_sessions 
    SET last_message_at = NOW() 
    WHERE id = $1
  `
  
  await pool.query(query, [sessionId])
}