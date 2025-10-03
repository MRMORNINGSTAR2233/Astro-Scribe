#!/usr/bin/env node

/**
 * PDF Text & Structure Extractor Script
 * Extracts text from PDFs and identifies key sections
 */

import fs from 'fs'
import path from 'path'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import pdfParse from 'pdf-parse'
import { pool } from '../lib/database'

interface ExtractedSection {
  type: 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'other'
  content: string
  startIndex: number
  endIndex: number
}

interface ExtractedPaper {
  paperId: string
  title: string
  fullText: string
  sections: ExtractedSection[]
  metadata: {
    pageCount: number
    wordCount: number
    extractionQuality: number
  }
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

class PDFExtractor {
  private readonly bucket = process.env.AWS_S3_BUCKET || 'bio-nexus-documents'
  private readonly sectionPatterns = {
    abstract: /(?:^|\n)\s*(?:abstract|summary)\s*(?:\n|$)/i,
    introduction: /(?:^|\n)\s*(?:introduction|background)\s*(?:\n|$)/i,
    methods: /(?:^|\n)\s*(?:methods|methodology|materials\s+and\s+methods|experimental\s+design)\s*(?:\n|$)/i,
    results: /(?:^|\n)\s*(?:results|findings|observations)\s*(?:\n|$)/i,
    discussion: /(?:^|\n)\s*(?:discussion|analysis|interpretation)\s*(?:\n|$)/i,
    conclusion: /(?:^|\n)\s*(?:conclusion|conclusions|summary|final\s+remarks)\s*(?:\n|$)/i
  }

  async extractAllPapers(): Promise<void> {
    console.log('Starting PDF text extraction process...')
    
    // Get list of papers from database
    const papers = await this.getPapersFromDatabase()
    console.log(`Found ${papers.length} papers to process`)

    let processed = 0
    let failed = 0

    for (const paper of papers) {
      try {
        console.log(`Processing: ${paper.title}`)
        const extracted = await this.extractPaper(paper.id, paper.s3_url)
        await this.storeExtractedText(extracted)
        processed++
        console.log(`✓ Extracted ${extracted.sections.length} sections`)
      } catch (error) {
        console.error(`✗ Failed to extract ${paper.title}:`, error)
        failed++
      }

      // Progress update every 10 papers
      if ((processed + failed) % 10 === 0) {
        console.log(`Progress: ${processed + failed}/${papers.length} (${processed} success, ${failed} failed)`)
      }
    }

    console.log(`\nExtraction complete: ${processed} success, ${failed} failed`)
  }

  async extractPaper(paperId: string, s3Key: string): Promise<ExtractedPaper> {
    try {
      // Download PDF from S3
      const pdfBuffer = await this.downloadFromS3(s3Key)
      
      // Extract text using pdf-parse
      const pdfData = await pdfParse(pdfBuffer)
      
      // Clean and structure the text
      const cleanedText = this.cleanText(pdfData.text)
      
      // Identify sections
      const sections = this.identifySections(cleanedText)
      
      // Calculate quality metrics
      const metadata = {
        pageCount: pdfData.numpages,
        wordCount: cleanedText.split(/\s+/).length,
        extractionQuality: this.calculateQuality(cleanedText, sections)
      }

      return {
        paperId,
        title: '', // Will be filled from database
        fullText: cleanedText,
        sections,
        metadata
      }
    } catch (error) {
      throw new Error(`PDF extraction failed for ${paperId}: ${error}`)
    }
  }

  private async downloadFromS3(s3Key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key
      })

      const response = await s3Client.send(command)
      
      if (!response.Body) {
        throw new Error('No body in S3 response')
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      const readable = response.Body as Readable
      
      for await (const chunk of readable) {
        chunks.push(chunk)
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      throw new Error(`S3 download failed: ${error}`)
    }
  }

  private cleanText(rawText: string): string {
    return rawText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page headers/footers (simple heuristic)
      .replace(/^\d+\s*$/gm, '')
      // Remove URLs and DOIs
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/doi:\s*[^\s]+/gi, '[DOI]')
      // Remove reference markers like [1], (Smith et al., 2020)
      .replace(/\[\d+\]/g, '')
      .replace(/\([^)]*\d{4}[^)]*\)/g, '')
      // Clean up punctuation
      .replace(/\s+([.,;:])/g, '$1')
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  }

  private identifySections(text: string): ExtractedSection[] {
    const sections: ExtractedSection[] = []
    const lines = text.split('\n')
    
    let currentSection: ExtractedSection | null = null
    let currentContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Check if this line starts a new section
      const sectionType = this.detectSectionStart(line)
      
      if (sectionType) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim()
          currentSection.endIndex = text.indexOf(currentContent[currentContent.length - 1]) + currentContent[currentContent.length - 1].length
          sections.push(currentSection)
        }
        
        // Start new section
        currentSection = {
          type: sectionType,
          content: '',
          startIndex: text.indexOf(line),
          endIndex: 0
        }
        currentContent = []
      } else if (currentSection) {
        // Add to current section
        currentContent.push(line)
      } else {
        // No section detected yet, treat as introduction or other
        if (!currentSection) {
          currentSection = {
            type: 'other',
            content: '',
            startIndex: 0,
            endIndex: 0
          }
          currentContent = []
        }
        currentContent.push(line)
      }
    }

    // Don't forget the last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim()
      currentSection.endIndex = text.length
      sections.push(currentSection)
    }

    return sections.filter(section => section.content.length > 50) // Filter out very short sections
  }

  private detectSectionStart(line: string): ExtractedSection['type'] | null {
    for (const [sectionType, pattern] of Object.entries(this.sectionPatterns)) {
      if (pattern.test(line)) {
        return sectionType as ExtractedSection['type']
      }
    }
    return null
  }

  private calculateQuality(text: string, sections: ExtractedSection[]): number {
    let quality = 0.5 // Base quality

    // Bonus for having structured sections
    if (sections.length >= 3) quality += 0.2
    if (sections.some(s => s.type === 'abstract')) quality += 0.1
    if (sections.some(s => s.type === 'methods')) quality += 0.1
    if (sections.some(s => s.type === 'results')) quality += 0.1

    // Penalty for very short or very long text (might indicate extraction issues)
    const wordCount = text.split(/\s+/).length
    if (wordCount < 500) quality -= 0.3
    if (wordCount > 50000) quality -= 0.2

    // Bonus for readable text (low special character ratio)
    const specialCharRatio = (text.match(/[^\w\s.,;:!?-]/g) || []).length / text.length
    if (specialCharRatio < 0.05) quality += 0.1

    return Math.max(0, Math.min(1, quality))
  }

  private async getPapersFromDatabase() {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, title, s3_url 
        FROM papers 
        WHERE s3_url IS NOT NULL 
        AND id NOT IN (
          SELECT DISTINCT paper_id 
          FROM text_chunks 
          WHERE paper_id IS NOT NULL
        )
        ORDER BY publication_year DESC
      `)
      return result.rows
    } finally {
      client.release()
    }
  }

  private async storeExtractedText(extracted: ExtractedPaper): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Store each section as a separate chunk
      for (let i = 0; i < extracted.sections.length; i++) {
        const section = extracted.sections[i]
        
        await client.query(`
          INSERT INTO text_chunks (paper_id, content, section_type, chunk_index)
          VALUES ($1, $2, $3, $4)
        `, [extracted.paperId, section.content, section.type, i])
      }

      // Update paper metadata
      await client.query(`
        UPDATE papers 
        SET updated_at = NOW()
        WHERE id = $1
      `, [extracted.paperId])

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

// Main execution
async function main() {
  try {
    const extractor = new PDFExtractor()
    await extractor.extractAllPapers()
  } catch (error) {
    console.error('PDF extraction failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { PDFExtractor }