import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { pool } from '@/lib/database'
import { AIServices } from '@/lib/ai-services'
import { addPaperToKnowledgeGraph } from '@/lib/knowledge-graph'
import { PDFProcessor } from '@/lib/pdf-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), 'uploads')
    
    // Create uploads directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const results = []
    const errors = []

    for (const file of files) {
      try {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          errors.push({
            filename: file.name,
            error: 'Only PDF files are supported'
          })
          continue
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          errors.push({
            filename: file.name,
            error: 'File size exceeds 50MB limit'
          })
          continue
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Generate unique filename
        const timestamp = Date.now()
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${timestamp}_${cleanName}`
        const filepath = path.join(uploadDir, filename)

        // Save file to disk
        await writeFile(filepath, buffer)

        // Process the PDF
        const processingResult = await processPDF(filepath, file.name)
        
        results.push({
          filename: file.name,
          size: file.size,
          processed: true,
          paperId: processingResult.paperId,
          extractedText: processingResult.extractedText.substring(0, 500) + '...',
          metadata: processingResult.metadata,
          chunksCreated: processingResult.chunksCreated,
          embeddingsGenerated: processingResult.embeddingsGenerated
        })

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processPDF(filepath: string, originalName: string) {
  // Extract text and metadata from PDF
  const pdfProcessor = new PDFProcessor()
  const extractionResult = await pdfProcessor.extractFromFile(filepath)

  // Insert paper into database
  const client = await pool.connect()
  let paperId: number
  
  try {
    await client.query('BEGIN')

    // Insert paper record
    const paperResult = await client.query(`
      INSERT INTO papers (
        title, 
        authors, 
        publication_year, 
        source, 
        abstract, 
        keywords,
        content,
        file_name,
        file_size,
        page_count,
        processing_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      extractionResult.metadata.title || originalName.replace('.pdf', ''),
      extractionResult.metadata.authors || ['Unknown'],
      extractionResult.metadata.year || new Date().getFullYear(),
      extractionResult.metadata.source || 'User Upload',
      extractionResult.metadata.abstract || extractionResult.text.substring(0, 500),
      extractionResult.metadata.keywords || [],
      extractionResult.text,
      originalName,
      extractionResult.metadata.fileSize || 0,
      extractionResult.metadata.pageCount || 1,
      extractionResult.metadata.processingMethod || 'pdf-parse'
    ])
    
    paperId = paperResult.rows[0].id

    // Create text chunks and generate embeddings
    const textChunks = await createTextChunks(extractionResult.text, 1000, 200)
    let embeddingsGenerated = 0
    const processedChunks: Array<{
      content: string
      embedding: number[]
      startIndex: number
      endIndex: number
    }> = []

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      
      try {
        // Generate embedding for the chunk
        const embedding = await AIServices.generateEmbedding(chunk)
        const startIndex = i * 800
        const endIndex = startIndex + chunk.length
        
        // Store processed chunk data
        processedChunks.push({
          content: chunk,
          embedding,
          startIndex,
          endIndex
        })
        
        // Insert chunk with embedding
        await client.query(`
          INSERT INTO text_chunks (
            paper_id,
            content,
            chunk_index,
            start_char,
            end_char,
            embedding,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          paperId,
          chunk,
          i,
          startIndex,
          endIndex,
          JSON.stringify(embedding)
        ])
        
        embeddingsGenerated++
      } catch (embeddingError) {
        console.error(`Error generating embedding for chunk ${i}:`, embeddingError)
      }
    }

    await client.query('COMMIT')

    // Add to Neo4j knowledge graph
    try {
      await addPaperToKnowledgeGraph({
        id: paperId.toString(),
        title: extractionResult.metadata.title || originalName.replace('.pdf', ''),
        authors: extractionResult.metadata.authors || ['Unknown'],
        year: extractionResult.metadata.year || new Date().getFullYear(),
        abstract: extractionResult.metadata.abstract,
        keywords: extractionResult.metadata.keywords || [],
        source: extractionResult.metadata.source || 'User Upload',
        content: extractionResult.text,
        chunks: processedChunks.map((chunk, index) => ({
          id: `${paperId}_chunk_${index}`,
          content: chunk.content,
          embedding: chunk.embedding,
          chunkIndex: index,
          metadata: {
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            paperId: paperId.toString()
          }
        })),
        metadata: {
          fileSize: extractionResult.metadata.fileSize,
          pageCount: extractionResult.metadata.pageCount,
          processingMethod: extractionResult.metadata.processingMethod,
          uploadedAt: new Date().toISOString(),
          fileName: originalName
        }
      })
    } catch (graphError) {
      console.error('Error adding to knowledge graph:', graphError)
    }

    return {
      paperId,
      extractedText: extractionResult.text,
      metadata: extractionResult.metadata,
      chunksCreated: processedChunks.length,
      embeddingsGenerated
    }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function createTextChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentence = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastSentence, lastNewline)
      
      if (breakPoint > start + chunkSize * 0.7) {
        chunk = text.slice(start, breakPoint + 1)
        start = breakPoint + 1 - overlap
      } else {
        start = end - overlap
      }
    } else {
      start = end
    }
    
    if (chunk.trim().length > 50) { // Only add substantial chunks
      chunks.push(chunk.trim())
    }
  }
  
  return chunks
}