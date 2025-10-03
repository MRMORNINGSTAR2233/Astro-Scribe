import { Pool } from 'pg'

// PostgreSQL connection with pgvector support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bionexus'}`,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Initialize database with required extensions and tables
export async function initializeDatabase() {
  const client = await pool.connect()
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')
    
    // Create papers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS papers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        authors TEXT[] NOT NULL,
        publication_year INTEGER NOT NULL,
        source TEXT NOT NULL,
        abstract TEXT,
        doi TEXT,
        keywords TEXT[],
        s3_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create text chunks table with vector embeddings
    await client.query(`
      CREATE TABLE IF NOT EXISTS text_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        section_type TEXT, -- introduction, methods, results, conclusion, etc.
        chunk_index INTEGER NOT NULL,
        embedding vector(384), -- All-MiniLM-L6-v2 embedding dimension
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create vector similarity search index
    await client.query(`
      CREATE INDEX IF NOT EXISTS text_chunks_embedding_idx 
      ON text_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `)

    // Create hypotheses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hypotheses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        statement TEXT NOT NULL,
        confidence_score FLOAT NOT NULL,
        supporting_papers UUID[],
        created_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'generated' -- generated, validated, rejected
      )
    `)

    // Create search queries log for analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL,
        user_session TEXT,
        results_count INTEGER,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  } finally {
    client.release()
  }
}

export { pool }