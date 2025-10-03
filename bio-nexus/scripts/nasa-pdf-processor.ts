#!/usr/bin/env node

/**
 * NASA PDF Knowledge Base Processor
 * Processes NASA PDFs from local directory and builds graph-based knowledge base
 */

import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import { pool } from '../lib/database'
import { driver } from '../lib/neo4j'
import { AIServices } from '../lib/ai-services'

interface ProcessedPaper {
  id: number
  title: string
  authors: string[]
  abstract: string
  keywords: string[]
  fullText: string
  sections: ExtractedSection[]
  metadata: PaperMetadata
}

interface ExtractedSection {
  type: 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'other'
  content: string
  startIndex: number
  endIndex: number
}

interface PaperMetadata {
  fileName: string
  fileSize: number
  pageCount: number
  wordCount: number
  processingDate: string
}

interface Chunk {
  content: string
  index: number
  embedding?: number[]
}

class NASAPDFProcessor {
  private readonly nasaPdfDir = '/Users/akshaykumar/Documents/Projects/Astro-Scribe/nasa-pdf'
  private readonly chunkSize = 1000 // characters per chunk
  private readonly chunkOverlap = 200 // overlap between chunks
  
  private readonly sectionPatterns = {
    abstract: /(?:^|\n)\s*(?:abstract|summary)\s*(?:\n|$)/i,
    introduction: /(?:^|\n)\s*(?:1\.|introduction|background)\s*(?:\n|$)/i,
    methods: /(?:^|\n)\s*(?:2\.|methods|methodology|materials\s+and\s+methods|experimental\s+design)\s*(?:\n|$)/i,
    results: /(?:^|\n)\s*(?:3\.|results|findings|observations)\s*(?:\n|$)/i,
    discussion: /(?:^|\n)\s*(?:4\.|discussion|analysis|interpretation)\s*(?:\n|$)/i,
    conclusion: /(?:^|\n)\s*(?:5\.|conclusion|conclusions|summary|final\s+remarks)\s*(?:\n|$)/i
  }

  async processAllNASAPDFs(): Promise<void> {
    console.log('🚀 Starting NASA PDF Knowledge Base Processing...\n')

    try {
      // Verify NASA PDF directory exists
      if (!fs.existsSync(this.nasaPdfDir)) {
        throw new Error(`NASA PDF directory not found: ${this.nasaPdfDir}`)
      }

      // Get list of PDF files
      const pdfFiles = fs.readdirSync(this.nasaPdfDir)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .sort()

      console.log(`📁 Found ${pdfFiles.length} PDF files to process`)

      if (pdfFiles.length === 0) {
        console.log('No PDF files found in the NASA directory')
        return
      }

      let processed = 0
      let failed = 0

      // Process each PDF
      for (const pdfFile of pdfFiles) {
        console.log(`\n📄 Processing: ${pdfFile}`)
        
        try {
          const processedPaper = await this.processPDF(pdfFile)
          const chunks = await this.createTextChunks(processedPaper)
          await this.storeInDatabase(processedPaper, chunks)
          await this.buildKnowledgeGraph(processedPaper)
          
          processed++
          console.log(`✅ Successfully processed ${pdfFile}`)
          
        } catch (error) {
          console.error(`❌ Failed to process ${pdfFile}:`, error)
          failed++
        }

        // Progress update
        if ((processed + failed) % 10 === 0) {
          console.log(`\n📊 Progress: ${processed + failed}/${pdfFiles.length} (${processed} success, ${failed} failed)`)
        }
      }

      // Final statistics
      console.log(`\n🎉 NASA PDF Processing Complete!`)
      console.log(`📈 Results: ${processed} successful, ${failed} failed`)
      console.log(`💾 Total papers in knowledge base: ${await this.getTotalPaperCount()}`)

      // Generate final insights
      await this.generateKnowledgeInsights()

    } catch (error) {
      console.error('❌ NASA PDF processing failed:', error)
      process.exit(1)
    }
  }

  async processPDF(fileName: string): Promise<ProcessedPaper> {
    const filePath = path.join(this.nasaPdfDir, fileName)
    
    // Read PDF file
    const pdfBuffer = fs.readFileSync(filePath)
    const fileStats = fs.statSync(filePath)
    
    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer)
    
    // Clean and process text
    const fullText = this.cleanText(pdfData.text)
    
    // Extract metadata from filename and content
    const title = this.extractTitle(fileName, fullText)
    const authors = this.extractAuthors(fullText)
    const abstract = this.extractAbstract(fullText)
    const keywords = this.extractKeywords(fullText, title)
    const sections = this.identifySections(fullText)
    
    return {
      id: 0, // Will be set after database insertion
      title,
      authors,
      abstract,
      keywords,
      fullText,
      sections,
      metadata: {
        fileName,
        fileSize: fileStats.size,
        pageCount: pdfData.numpages,
        wordCount: fullText.split(/\s+/).length,
        processingDate: new Date().toISOString()
      }
    }
  }

  private cleanText(rawText: string): string {
    return rawText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers
      .replace(/^\d+\s*$/gm, '')
      // Remove URLs and DOIs
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/doi:[^\s]+/gi, '')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      // Remove excessive punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[-]{2,}/g, '-')
      // Clean up spacing around punctuation
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])\s+/g, '$1 ')
      .trim()
  }

  private extractTitle(fileName: string, text: string): string {
    // Try to extract from filename first
    const cleanFileName = fileName
      .replace(/^\d+_/, '') // Remove number prefix
      .replace(/\.pdf$/i, '') // Remove extension
      .replace(/_/g, ' ') // Replace underscores with spaces
      .trim()

    // Try to find title in first few lines of text
    const lines = text.split('\n').slice(0, 10)
    const potentialTitle = lines.find(line => 
      line.length > 20 && 
      line.length < 200 && 
      !line.toLowerCase().includes('abstract') &&
      !line.toLowerCase().includes('introduction')
    )

    return potentialTitle || cleanFileName
  }

  private extractAuthors(text: string): string[] {
    const authorPatterns = [
      /authors?:?\s*([^.\n]+)/i,
      /by\s+([^.\n]+)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?)(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?))*)/m
    ]

    for (const pattern of authorPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1]
          .split(/[,;]/)
          .map(author => author.trim())
          .filter(author => author.length > 2 && author.length < 50)
          .slice(0, 10) // Maximum 10 authors
      }
    }

    return ['Unknown Author']
  }

  private extractAbstract(text: string): string {
    const abstractPattern = /abstract\s*:?\s*([\s\S]*?)(?:\n\s*(?:keywords?|introduction|1\.|background)|$)/i
    const match = text.match(abstractPattern)
    
    if (match) {
      return match[1]
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000) // Limit length
    }
    
    // Fallback: use first paragraph if no abstract found
    const firstParagraph = text.split('\n\n')[0]
    return firstParagraph?.slice(0, 500) || 'No abstract available'
  }

  private extractKeywords(text: string, title: string): string[] {
    // Extract explicit keywords
    const keywordPattern = /keywords?:?\s*([^.\n]+)/i
    const keywordMatch = text.match(keywordPattern)
    
    let keywords: string[] = []
    
    if (keywordMatch) {
      keywords = keywordMatch[1]
        .split(/[,;]/)
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 2)
    }
    
    // Extract domain-specific terms from title and text
    const spaceTerms = this.extractSpaceTerms(title + ' ' + text)
    keywords.push(...spaceTerms)
    
    // Remove duplicates and limit
    return [...new Set(keywords)].slice(0, 15)
  }

  private extractSpaceTerms(text: string): string[] {
    const spaceKeywords = [
      'microgravity', 'spaceflight', 'astronaut', 'space station', 'ISS',
      'radiation', 'cosmic rays', 'bone loss', 'muscle atrophy',
      'cardiovascular', 'immune system', 'oxidative stress',
      'plant growth', 'biofilm', 'mars', 'lunar', 'orbital',
      'zero gravity', 'weightlessness', 'space medicine',
      'astrobiology', 'space biology', 'life sciences',
      'mission planning', 'crew health', 'countermeasures'
    ]
    
    const foundTerms = spaceKeywords.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    )
    
    return foundTerms
  }

  private identifySections(text: string): ExtractedSection[] {
    const sections: ExtractedSection[] = []
    
    for (const [sectionType, pattern] of Object.entries(this.sectionPatterns)) {
      const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gi')))
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const startIndex = match.index
          const endIndex = this.findSectionEnd(text, startIndex)
          const content = text.slice(startIndex, endIndex).trim()
          
          if (content.length > 100) { // Only include substantial sections
            sections.push({
              type: sectionType as ExtractedSection['type'],
              content,
              startIndex,
              endIndex
            })
          }
        }
      }
    }
    
    // If no sections found, create one general section
    if (sections.length === 0) {
      sections.push({
        type: 'other',
        content: text,
        startIndex: 0,
        endIndex: text.length
      })
    }
    
    return sections
  }

  private findSectionEnd(text: string, startIndex: number): number {
    const nextSectionPattern = /(?:\n\s*(?:\d+\.|abstract|introduction|methods|results|discussion|conclusion))/gi
    nextSectionPattern.lastIndex = startIndex + 100 // Skip immediate match
    
    const nextMatch = nextSectionPattern.exec(text)
    return nextMatch ? nextMatch.index : text.length
  }

  private async createTextChunks(paper: ProcessedPaper): Promise<Chunk[]> {
    const chunks: Chunk[] = []
    const text = paper.fullText
    
    let index = 0
    let position = 0
    
    while (position < text.length) {
      const endPosition = Math.min(position + this.chunkSize, text.length)
      const chunk = text.slice(position, endPosition)
      
      if (chunk.trim().length > 50) { // Only include substantial chunks
        chunks.push({
          content: chunk.trim(),
          index: index++
        })
      }
      
      position += this.chunkSize - this.chunkOverlap
    }
    
    // Generate embeddings for chunks
    for (const chunk of chunks) {
      try {
        chunk.embedding = await AIServices.generateEmbedding(chunk.content)
      } catch (error) {
        console.warn(`Failed to generate embedding for chunk ${chunk.index}:`, error)
      }
    }
    
    return chunks
  }

  private async storeInDatabase(paper: ProcessedPaper, chunks: Chunk[]): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insert paper
      const paperResult = await client.query(`
        INSERT INTO papers (
          title, authors, abstract, keywords, 
          content, file_name, file_size, page_count,
          publication_year, source, processing_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        paper.title,
        paper.authors,
        paper.abstract,
        paper.keywords,
        paper.fullText,
        paper.metadata.fileName,
        paper.metadata.fileSize,
        paper.metadata.pageCount,
        this.extractYear(paper.metadata.fileName) || 2024,
        'NASA',
        'nasa-pdf-processor'
      ])
      
      const paperId = paperResult.rows[0].id
      paper.id = paperId
      
      // Insert text chunks
      for (const chunk of chunks) {
        await client.query(`
          INSERT INTO text_chunks (
            paper_id, content, chunk_index, embedding
          ) VALUES ($1, $2, $3, $4)
        `, [
          paperId,
          chunk.content,
          chunk.index,
          chunk.embedding ? `[${chunk.embedding.join(',')}]` : null
        ])
      }
      
      await client.query('COMMIT')
      console.log(`  💾 Stored paper with ${chunks.length} chunks`)
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async buildKnowledgeGraph(paper: ProcessedPaper): Promise<void> {
    const session = driver().session()
    
    try {
      // Create paper node
      await session.run(`
        MERGE (p:Paper {id: $paperId})
        SET p.title = $title,
            p.abstract = $abstract,
            p.fileName = $fileName,
            p.source = "NASA",
            p.wordCount = $wordCount,
            p.pageCount = $pageCount,
            p.processingDate = $processingDate
      `, {
        paperId: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        fileName: paper.metadata.fileName,
        wordCount: paper.metadata.wordCount,
        pageCount: paper.metadata.pageCount,
        processingDate: paper.metadata.processingDate
      })
      
      // Create author nodes and relationships
      for (const author of paper.authors) {
        await session.run(`
          MERGE (a:Author {name: $authorName})
          WITH a
          MATCH (p:Paper {id: $paperId})
          MERGE (a)-[:AUTHORED]->(p)
        `, {
          authorName: author,
          paperId: paper.id
        })
      }
      
      // Create keyword nodes and relationships
      for (const keyword of paper.keywords) {
        await session.run(`
          MERGE (k:Keyword {name: $keywordName})
          WITH k
          MATCH (p:Paper {id: $paperId})
          MERGE (p)-[:HAS_KEYWORD]->(k)
        `, {
          keywordName: keyword.toLowerCase(),
          paperId: paper.id
        })
      }
      
      // Create section nodes
      for (const section of paper.sections) {
        await session.run(`
          MATCH (p:Paper {id: $paperId})
          CREATE (s:Section {
            type: $sectionType,
            content: $content,
            startIndex: $startIndex,
            endIndex: $endIndex
          })
          CREATE (p)-[:HAS_SECTION]->(s)
        `, {
          paperId: paper.id,
          sectionType: section.type,
          content: section.content.slice(0, 10000), // Limit content size
          startIndex: section.startIndex,
          endIndex: section.endIndex
        })
      }
      
      console.log(`  🔗 Added to knowledge graph`)
      
    } catch (error) {
      console.error('Failed to build knowledge graph:', error)
    } finally {
      await session.close()
    }
  }

  private extractYear(fileName: string): number | null {
    const yearMatch = fileName.match(/20\d{2}/)
    return yearMatch ? parseInt(yearMatch[0]) : null
  }

  private async getTotalPaperCount(): Promise<number> {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT COUNT(*) FROM papers')
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }

  private async generateKnowledgeInsights(): Promise<void> {
    console.log('\n📊 Generating Knowledge Base Insights...')
    
    const session = driver().session()
    
    try {
      // Get top keywords
      const keywordResult = await session.run(`
        MATCH (k:Keyword)<-[:HAS_KEYWORD]-(p:Paper)
        RETURN k.name as keyword, count(p) as papers
        ORDER BY papers DESC
        LIMIT 10
      `)
      
      console.log('\n🔝 Top Keywords:')
      keywordResult.records.forEach((record: any, index: number) => {
        console.log(`  ${index + 1}. ${record.get('keyword')} (${record.get('papers')} papers)`)
      })
      
      // Get top authors
      const authorResult = await session.run(`
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        RETURN a.name as author, count(p) as papers
        ORDER BY papers DESC
        LIMIT 10
      `)
      
      console.log('\n👥 Top Authors:')
      authorResult.records.forEach((record: any, index: number) => {
        console.log(`  ${index + 1}. ${record.get('author')} (${record.get('papers')} papers)`)
      })
      
      // Get research domains
      const domainResult = await session.run(`
        MATCH (k:Keyword)<-[:HAS_KEYWORD]-(p:Paper)
        WHERE k.name IN ['microgravity', 'spaceflight', 'radiation', 'bone loss', 'immune system', 'plant growth']
        RETURN k.name as domain, count(p) as papers
        ORDER BY papers DESC
      `)
      
      console.log('\n🔬 Research Domains:')
      domainResult.records.forEach((record: any, index: number) => {
        console.log(`  ${index + 1}. ${record.get('domain')} (${record.get('papers')} papers)`)
      })
      
    } finally {
      await session.close()
    }
  }
}

// Main execution
async function main() {
  const processor = new NASAPDFProcessor()
  await processor.processAllNASAPDFs()
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export { NASAPDFProcessor }