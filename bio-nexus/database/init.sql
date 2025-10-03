-- Database initialization script for Bio-Nexus Knowledge Base
-- PostgreSQL database schema with pgvector extension
-- Run this script to create the required tables for PDF upload functionality

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT[] DEFAULT '{}',
    abstract TEXT,
    keywords TEXT[] DEFAULT '{}',
    publication_year INTEGER,
    source TEXT,
    content TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    page_count INTEGER,
    processing_method TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create text_chunks table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS text_chunks (
    id SERIAL PRIMARY KEY,
    paper_id INTEGER REFERENCES papers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_char INTEGER,
    end_char INTEGER,
    embedding vector(384), -- All-MiniLM-L6-v2 embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_papers_content ON papers USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_papers_authors ON papers USING gin(authors);
CREATE INDEX IF NOT EXISTS idx_papers_keywords ON papers USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(publication_year);
CREATE INDEX IF NOT EXISTS idx_papers_uploaded_at ON papers(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_text_chunks_paper_id ON text_chunks(paper_id);
CREATE INDEX IF NOT EXISTS idx_text_chunks_chunk_index ON text_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_text_chunks_content ON text_chunks USING gin(to_tsvector('english', content));

-- Create vector similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_cosine ON text_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for paper statistics
CREATE OR REPLACE VIEW paper_stats AS
SELECT 
    COUNT(*) as total_papers,
    COUNT(DISTINCT unnest(authors)) as unique_authors,
    AVG(publication_year) as avg_year,
    SUM(file_size) as total_file_size,
    SUM(page_count) as total_pages,
    COUNT(*) FILTER (WHERE uploaded_at >= NOW() - INTERVAL '30 days') as papers_last_30_days,
    COUNT(*) FILTER (WHERE uploaded_at >= NOW() - INTERVAL '7 days') as papers_last_7_days
FROM papers;

-- Create view for chunk statistics
CREATE OR REPLACE VIEW chunk_stats AS
SELECT 
    p.id as paper_id,
    p.title,
    p.file_name,
    COUNT(c.id) as chunk_count,
    AVG(LENGTH(c.content)) as avg_chunk_length,
    MIN(c.chunk_index) as first_chunk,
    MAX(c.chunk_index) as last_chunk
FROM papers p
LEFT JOIN text_chunks c ON p.id = c.paper_id
GROUP BY p.id, p.title, p.file_name;

-- Insert sample search functions (PostgreSQL stored procedures)

-- Function to search papers by content similarity
CREATE OR REPLACE FUNCTION search_papers_by_content(
    search_query TEXT,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    authors TEXT[],
    relevance_score REAL,
    snippet TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.authors,
        ts_rank(to_tsvector('english', p.content), plainto_tsquery('english', search_query)) as relevance_score,
        ts_headline('english', p.content, plainto_tsquery('english', search_query), 
                   'MaxWords=50, MinWords=20, ShortWord=3, HighlightAll=false') as snippet
    FROM papers p
    WHERE to_tsvector('english', p.content) @@ plainto_tsquery('english', search_query)
    ORDER BY relevance_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar papers using vector embeddings
CREATE OR REPLACE FUNCTION find_similar_papers(
    target_embedding vector(384),
    result_limit INTEGER DEFAULT 5,
    similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    authors TEXT[],
    similarity_score REAL,
    chunk_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        p.title,
        p.authors,
        1 - (c.embedding <=> target_embedding) as similarity_score,
        c.content
    FROM text_chunks c
    JOIN papers p ON c.paper_id = p.id
    WHERE 1 - (c.embedding <=> target_embedding) > similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get paper recommendations based on keywords
CREATE OR REPLACE FUNCTION get_paper_recommendations(
    target_keywords TEXT[],
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    authors TEXT[],
    shared_keywords INTEGER,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.authors,
        cardinality(p.keywords & target_keywords) as shared_keywords,
        (cardinality(p.keywords & target_keywords)::REAL / GREATEST(cardinality(p.keywords), cardinality(target_keywords), 1)) as relevance_score
    FROM papers p
    WHERE p.keywords && target_keywords
    ORDER BY shared_keywords DESC, relevance_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for search optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS paper_search_index AS
SELECT 
    p.id,
    p.title,
    p.authors,
    p.keywords,
    p.abstract,
    p.publication_year,
    p.source,
    to_tsvector('english', 
        COALESCE(p.title, '') || ' ' || 
        COALESCE(p.abstract, '') || ' ' || 
        COALESCE(array_to_string(p.authors, ' '), '') || ' ' ||
        COALESCE(array_to_string(p.keywords, ' '), '')
    ) as search_vector
FROM papers p;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_paper_search_vector ON paper_search_index USING gin(search_vector);

-- Create function to refresh the search index
CREATE OR REPLACE FUNCTION refresh_paper_search_index()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY paper_search_index;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- Uncomment to insert sample papers

/*
INSERT INTO papers (
    title, 
    authors, 
    abstract, 
    keywords, 
    publication_year, 
    source, 
    content,
    file_name,
    file_size,
    page_count,
    processing_method
) VALUES 
(
    'Microgravity Effects on Plant Growth in Space Environments',
    ARRAY['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Elena Rodriguez'],
    'This study investigates the impact of microgravity conditions on plant growth patterns and cellular development in controlled space environments.',
    ARRAY['microgravity', 'plant biology', 'space research', 'cellular development', 'ISS'],
    2023,
    'Journal of Space Biology',
    'Detailed analysis of plant growth experiments conducted on the International Space Station over a 6-month period...',
    'microgravity_plant_study_2023.pdf',
    2456789,
    42,
    'pdf-parse'
),
(
    'Astrobiology Potential of Europa: Ice Shell Analysis',
    ARRAY['Dr. James Patterson', 'Dr. Lisa Wang'],
    'Comprehensive analysis of Europa''s ice shell composition and its potential for harboring microbial life forms.',
    ARRAY['astrobiology', 'Europa', 'ice composition', 'extraterrestrial life', 'Jupiter moons'],
    2024,
    'Astrobiology Research Quarterly',
    'Europa, one of Jupiter''s largest moons, presents unique opportunities for astrobiological research...',
    'europa_astrobiology_2024.pdf',
    3567890,
    67,
    'pdf-parse'
);
*/

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON papers TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON text_chunks TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE papers_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE text_chunks_id_seq TO your_app_user;

COMMIT;