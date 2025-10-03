import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    
    const query = `
      SELECT 
        id,
        role,
        content,
        sources,
        is_fact_checked,
        created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `
    
    const result = await pool.query(query, [sessionId])
    
    const messages = result.rows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at,
      sources: row.sources,
      isFactChecked: row.is_fact_checked
    }))

    return NextResponse.json(messages)

  } catch (error) {
    console.error('Error fetching session messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session messages' },
      { status: 500 }
    )
  }
}