import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function GET() {
  try {
    const query = `
      SELECT 
        id,
        title,
        created_at,
        last_message_at,
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) as message_count
      FROM chat_sessions
      ORDER BY last_message_at DESC
      LIMIT 20
    `
    
    const result = await pool.query(query)
    
    const sessions = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      messageCount: parseInt(row.message_count)
    }))

    return NextResponse.json(sessions)

  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()
    
    const query = `
      INSERT INTO chat_sessions (title, created_at, last_message_at)
      VALUES ($1, NOW(), NOW())
      RETURNING id, title, created_at, last_message_at
    `
    
    const result = await pool.query(query, [title])
    const session = result.rows[0]

    return NextResponse.json({
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      lastMessageAt: session.last_message_at,
      messageCount: 0
    })

  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}