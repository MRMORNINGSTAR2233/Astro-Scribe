import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = params.id

    // Get paper details
    const paperQuery = `
      SELECT 
        id,
        title,
        authors,
        publication_year,
        source,
        abstract,
        keywords,
        file_name,
        content,
        file_size,
        created_at
      FROM papers 
      WHERE id = $1
    `
    
    const paperResult = await pool.query(paperQuery, [paperId])
    
    if (paperResult.rows.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    const paper = paperResult.rows[0]

    // Get related papers using vector similarity
    const relatedQuery = `
      SELECT DISTINCT
        p.id,
        p.title,
        AVG(1 - (tc1.embedding <=> tc2.embedding)) as similarity_score
      FROM papers p
      JOIN text_chunks tc1 ON p.id = tc1.paper_id
      JOIN text_chunks tc2 ON tc2.paper_id = $1
      WHERE p.id != $1
      GROUP BY p.id, p.title
      HAVING AVG(1 - (tc1.embedding <=> tc2.embedding)) > 0.7
      ORDER BY similarity_score DESC
      LIMIT 5
    `
    
    const relatedResult = await pool.query(relatedQuery, [paperId]).catch(() => ({ rows: [] }))

    // Get knowledge graph data (simplified version)
    const graphQuery = `
      SELECT 
        'paper' as node_type,
        title as label,
        id::text as node_id,
        json_build_object(
          'authors', authors,
          'year', publication_year,
          'source', source
        ) as properties
      FROM papers WHERE id = $1
      
      UNION ALL
      
      SELECT 
        'keyword' as node_type,
        keyword as label,
        'kw_' || encode(digest(keyword, 'md5'), 'hex') as node_id,
        json_build_object('type', 'keyword') as properties
      FROM (
        SELECT unnest(keywords) as keyword 
        FROM papers WHERE id = $1
        LIMIT 10
      ) k
    `
    
    const graphResult = await pool.query(graphQuery, [paperId])

    // Transform graph data
    const nodes = graphResult.rows.map(row => ({
      id: row.node_id,
      label: row.label,
      type: row.node_type,
      properties: row.properties
    }))

    // Create edges between paper and keywords
    const edges = graphResult.rows
      .filter(row => row.node_type === 'keyword')
      .map(row => ({
        source: paperId,
        target: row.node_id,
        relationship: 'HAS_KEYWORD'
      }))

    const knowledgeGraph = {
      nodes,
      edges
    }

    return NextResponse.json({
      paper,
      relatedPapers: relatedResult.rows,
      knowledgeGraph
    })

  } catch (error) {
    console.error('Error fetching paper details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch paper details' },
      { status: 500 }
    )
  }
}