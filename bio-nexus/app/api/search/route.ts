import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { AIServices } from '@/lib/ai-services';

export async function POST(request: NextRequest) {
  try {
    const { query, type = 'research', filters = {} } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('Processing search query:', query);

    // Use simplified query classification
    const classification = await AIServices.classifyQuery(query);
    console.log('Classification:', classification);

    let vectorResults: any[] = [];
    let textResults: any[] = [];

    // Text search using PostgreSQL full-text search
    const client = await pool.connect();
    try {
      // Basic text search
      const textQuery = `
        SELECT 
          p.id,
          p.title,
          p.authors,
          p.publication_year,
          p.source,
          p.abstract,
          p.keywords,
          p.file_name,
          ts_rank(
            to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '') || ' ' || COALESCE(p.content, '')),
            plainto_tsquery('english', $1)
          ) as relevance_score
        FROM papers p
        WHERE to_tsvector('english', p.title || ' ' || COALESCE(p.abstract, '') || ' ' || COALESCE(p.content, ''))
          @@ plainto_tsquery('english', $1)
        ORDER BY relevance_score DESC
        LIMIT 20
      `;
      
      const textResult = await client.query(textQuery, [query]);
      textResults = textResult.rows;

      // Vector search if embeddings are available
      try {
        const queryEmbedding = await AIServices.generateEmbedding(query);
        
        const vectorQuery = `
          SELECT 
            p.id,
            p.title,
            p.authors,
            p.publication_year,
            p.source,
            p.abstract,
            p.keywords,
            tc.content,
            tc.chunk_index,
            1 - (tc.embedding <=> $1::vector) AS similarity_score
          FROM text_chunks tc
          JOIN papers p ON tc.paper_id = p.id
          WHERE tc.embedding IS NOT NULL
            AND 1 - (tc.embedding <=> $1::vector) > 0.3
          ORDER BY similarity_score DESC
          LIMIT 15
        `;
        
        const vectorResult = await client.query(vectorQuery, [
          `[${queryEmbedding.join(',')}]`
        ]);
        
        vectorResults = vectorResult.rows;
      } catch (embeddingError) {
        console.warn('Vector search failed, using text search only:', embeddingError);
      }

    } finally {
      client.release();
    }

    // Combine results
    const combinedResults = combineSearchResults(textResults, vectorResults);

    console.log(`Found ${combinedResults.length} results`);

    return NextResponse.json({
      results: combinedResults.slice(0, 50),
      metadata: {
        query,
        intent: classification.intent,
        total_results: combinedResults.length,
        search_methods: ['text_search', vectorResults.length > 0 ? 'vector_search' : null].filter(Boolean),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Support GET requests for backward compatibility
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter q is required' },
      { status: 400 }
    );
  }

  // Convert GET to POST format
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  return POST(mockRequest as NextRequest);
}

function combineSearchResults(textResults: any[], vectorResults: any[]): any[] {
  const resultsMap = new Map();
  
  // Add text search results
  textResults.forEach(result => {
    const key = `${result.id}-text`;
    resultsMap.set(key, {
      ...result,
      search_type: 'text',
      score: result.relevance_score || 0
    });
  });
  
  // Add vector search results
  vectorResults.forEach(result => {
    const key = `${result.id}-vector`;
    if (!resultsMap.has(key)) {
      resultsMap.set(key, {
        ...result,
        search_type: 'vector',
        score: result.similarity_score || 0
      });
    }
  });
  
  // Convert to array and sort by score
  return Array.from(resultsMap.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(result => ({
      id: result.id,
      title: result.title,
      authors: result.authors,
      publication_year: result.publication_year,
      source: result.source,
      abstract: result.abstract,
      keywords: result.keywords,
      file_name: result.file_name,
      content_snippet: result.content ? result.content.slice(0, 300) + '...' : result.abstract?.slice(0, 300) + '...',
      search_type: result.search_type,
      relevance_score: result.score,
      chunk_index: result.chunk_index
    }));
}
