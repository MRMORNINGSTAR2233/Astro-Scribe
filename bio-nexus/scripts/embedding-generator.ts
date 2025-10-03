#!/usr/bin/env node

/**
 * Vector Embedding Generation Script
 * Generates embeddings for text chunks and stores them in PostgreSQL
 */

import { pool } from '../lib/database'
import { AIServices } from '../lib/ai-services'

interface TextChunk {
  id: string
  paper_id: string
  content: string
  section_type: string
  chunk_index: number
}

class EmbeddingGenerator {
  private readonly batchSize = 50
  private readonly maxRetries = 3
  private readonly delayMs = 1000

  async generateAllEmbeddings(): Promise<void> {
    console.log('Starting embedding generation process...')
    
    // Get text chunks without embeddings
    const chunks = await this.getUnprocessedChunks()
    console.log(`Found ${chunks.length} chunks to process`)

    if (chunks.length === 0) {
      console.log('No chunks to process')
      return
    }

    const batches = this.createBatches(chunks, this.batchSize)
    let processed = 0
    let failed = 0

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`)
      
      try {
        await this.processBatch(batch)
        processed += batch.length
        console.log(`✓ Batch completed: ${batch.length} embeddings generated`)
      } catch (error) {
        console.error(`✗ Batch failed:`, error)
        failed += batch.length
      }

      // Rate limiting delay
      if (batchIndex < batches.length - 1) {
        await this.delay(this.delayMs)
      }

      // Progress update
      if ((batchIndex + 1) % 5 === 0) {
        console.log(`Progress: ${processed + failed}/${chunks.length} chunks processed`)
      }
    }

    console.log(`\nEmbedding generation complete: ${processed} success, ${failed} failed`)
  }

  async generateEmbeddingForText(text: string): Promise<number[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Clean and prepare text for embedding
        const cleanedText = this.prepareTextForEmbedding(text)
        
        // Generate embedding using Hugging Face All-MiniLM
        const embedding = await AIServices.generateEmbedding(cleanedText)
        
        return embedding
      } catch (error) {
        console.error(`Embedding attempt ${attempt} failed:`, error)
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to generate embedding after ${this.maxRetries} attempts: ${error}`)
        }
        
        // Exponential backoff
        await this.delay(this.delayMs * Math.pow(2, attempt - 1))
      }
    }
    
    throw new Error('Unexpected error in embedding generation')
  }

  private async getUnprocessedChunks(): Promise<TextChunk[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, paper_id, content, section_type, chunk_index
        FROM text_chunks 
        WHERE embedding IS NULL
        AND length(content) > 50
        ORDER BY paper_id, chunk_index
      `)
      return result.rows
    } finally {
      client.release()
    }
  }

  private async processBatch(chunks: TextChunk[]): Promise<void> {
    // Generate embeddings for all chunks in parallel
    const embeddingPromises = chunks.map(chunk => 
      this.generateEmbeddingForText(chunk.content)
        .then(embedding => ({ chunk, embedding, success: true }))
        .catch(error => ({ chunk, error, success: false }))
    )

    const results = await Promise.allSettled(embeddingPromises)
    
    // Process successful embeddings
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{ chunk: TextChunk; embedding: number[]; success: true }> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value)

    if (successfulResults.length > 0) {
      await this.storeEmbeddings(successfulResults.map(r => ({
        chunkId: r.chunk.id,
        embedding: r.embedding
      })))
    }

    // Log failed embeddings
    const failedResults = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    )

    if (failedResults.length > 0) {
      console.error(`Failed to generate ${failedResults.length} embeddings in batch`)
    }
  }

  private async storeEmbeddings(embeddings: Array<{ chunkId: string; embedding: number[] }>): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      for (const { chunkId, embedding } of embeddings) {
        await client.query(`
          UPDATE text_chunks 
          SET embedding = $1::vector
          WHERE id = $2
        `, [JSON.stringify(embedding), chunkId])
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Failed to store embeddings: ${error}`)
    } finally {
      client.release()
    }
  }

  private prepareTextForEmbedding(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere
      .replace(/[^\w\s.,;:!?()-]/g, ' ')
      // Truncate if too long (Hugging Face has token limits)
      .substring(0, 8000) // ~2000 tokens approx
      .trim()
  }

  private createBatches<T>(array: T[], size: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size))
    }
    return batches
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Quality assurance methods
  async validateEmbeddings(): Promise<void> {
    console.log('Validating embedding quality...')
    
    const client = await pool.connect()
    try {
      // Check for null embeddings
      const nullEmbeddings = await client.query(`
        SELECT COUNT(*) as null_count
        FROM text_chunks 
        WHERE embedding IS NULL AND length(content) > 50
      `)
      
      // Check embedding dimensions
      const dimensionCheck = await client.query(`
        SELECT 
          vector_dims(embedding) as dimensions,
          COUNT(*) as count
        FROM text_chunks 
        WHERE embedding IS NOT NULL
        GROUP BY vector_dims(embedding)
      `)

      // Check for duplicate embeddings (might indicate processing errors)
      const duplicateCheck = await client.query(`
        SELECT embedding, COUNT(*) as count
        FROM text_chunks 
        WHERE embedding IS NOT NULL
        GROUP BY embedding
        HAVING COUNT(*) > 1
        LIMIT 10
      `)

      console.log(`Validation Results:`)
      console.log(`- Null embeddings: ${nullEmbeddings.rows[0]?.null_count || 0}`)
      console.log(`- Embedding dimensions:`, dimensionCheck.rows)
      console.log(`- Duplicate embeddings found: ${duplicateCheck.rows.length}`)
      
      if (duplicateCheck.rows.length > 0) {
        console.warn('Warning: Duplicate embeddings detected, review processing logic')
      }

    } finally {
      client.release()
    }
  }

  async generateTestSimilaritySearch(query: string, limit = 5): Promise<void> {
    console.log(`\nTesting similarity search for: "${query}"`)
    
    try {
      const queryEmbedding = await this.generateEmbeddingForText(query)
      
      const client = await pool.connect()
      try {
        const result = await client.query(`
          SELECT 
            tc.content,
            tc.section_type,
            p.title,
            (tc.embedding <=> $1::vector) as distance
          FROM text_chunks tc
          JOIN papers p ON tc.paper_id = p.id
          WHERE tc.embedding IS NOT NULL
          ORDER BY tc.embedding <=> $1::vector
          LIMIT $2
        `, [JSON.stringify(queryEmbedding), limit])

        console.log('Top similar chunks:')
        result.rows.forEach((row, index) => {
          console.log(`${index + 1}. Distance: ${row.distance.toFixed(4)}`)
          console.log(`   Paper: ${row.title}`)
          console.log(`   Section: ${row.section_type}`)
          console.log(`   Content: ${row.content.substring(0, 100)}...`)
          console.log()
        })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Test search failed:', error)
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'generate'

  try {
    const generator = new EmbeddingGenerator()
    
    switch (command) {
      case 'generate':
        await generator.generateAllEmbeddings()
        break
        
      case 'validate':
        await generator.validateEmbeddings()
        break
        
      case 'test':
        const query = args[1] || 'microgravity bone density'
        await generator.generateTestSimilaritySearch(query)
        break
        
      default:
        console.log('Usage: node embedding-generator.js [generate|validate|test] [query]')
        process.exit(1)
    }
  } catch (error) {
    console.error('Embedding generation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { EmbeddingGenerator }