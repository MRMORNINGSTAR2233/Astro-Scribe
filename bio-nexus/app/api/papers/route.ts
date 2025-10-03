import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM papers');
    const total = parseInt(countResult.rows[0].count);

    // Get papers with pagination
    const papersResult = await pool.query(`
      SELECT 
        id,
        title,
        authors,
        publication_year,
        source,
        abstract,
        keywords,
        file_name,
        created_at
      FROM papers 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const papers = papersResult.rows.map(paper => ({
      id: paper.id,
      title: paper.title,
      authors: Array.isArray(paper.authors) ? paper.authors : [paper.authors],
      publication_year: paper.publication_year,
      source: paper.source,
      abstract: paper.abstract,
      keywords: Array.isArray(paper.keywords) ? paper.keywords : [],
      file_name: paper.file_name,
      created_at: paper.created_at
    }));

    return NextResponse.json({
      papers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Papers API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}