#!/usr/bin/env node

/**
 * Automated Document Retriever Script
 * Downloads NASA bioscience PDFs and uploads to S3
 */

import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import axios from 'axios'

interface PaperMetadata {
  id: string
  title: string
  authors: string[]
  doi?: string
  url: string
  year: number
  source: string
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

class DocumentRetriever {
  private readonly downloadDir = './downloads'
  private readonly bucket = process.env.AWS_S3_BUCKET || 'bio-nexus-documents'
  private readonly batchSize = 10
  private readonly delayMs = 2000 // Rate limiting

  constructor() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true })
    }
  }

  async retrieveDocuments(papersList: PaperMetadata[]) {
    console.log(`Starting download of ${papersList.length} documents...`)
    
    const batches = this.createBatches(papersList, this.batchSize)
    let processedCount = 0

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`)
      
      const promises = batch.map(paper => this.processPaper(paper))
      const results = await Promise.allSettled(promises)
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedCount++
          console.log(`✓ Successfully processed: ${batch[index].title}`)
        } else {
          console.error(`✗ Failed to process: ${batch[index].title}`, result.reason)
        }
      })

      // Rate limiting delay between batches
      if (batchIndex < batches.length - 1) {
        await this.delay(this.delayMs)
      }
    }

    console.log(`\nCompleted: ${processedCount}/${papersList.length} documents processed`)
    return processedCount
  }

  private async processPaper(paper: PaperMetadata): Promise<string> {
    try {
      // Download PDF
      const filePath = await this.downloadPDF(paper)
      
      // Upload to S3
      const s3Key = await this.uploadToS3(filePath, paper)
      
      // Clean up local file
      fs.unlinkSync(filePath)
      
      // Store metadata in database
      await this.storeMetadata(paper, s3Key)
      
      return s3Key
    } catch (error) {
      throw new Error(`Failed to process ${paper.title}: ${error}`)
    }
  }

  private async downloadPDF(paper: PaperMetadata): Promise<string> {
    const fileName = `${paper.id}.pdf`
    const filePath = path.join(this.downloadDir, fileName)

    try {
      const response = await axios({
        method: 'GET',
        url: paper.url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Bio-Nexus Research Tool (academic use)'
        }
      })

      const writer = fs.createWriteStream(filePath)
      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath))
        writer.on('error', reject)
      })
    } catch (error) {
      throw new Error(`Download failed for ${paper.url}: ${error}`)
    }
  }

  private async uploadToS3(filePath: string, paper: PaperMetadata): Promise<string> {
    const fileContent = fs.readFileSync(filePath)
    const s3Key = `papers/${paper.year}/${paper.id}.pdf`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/pdf',
      Metadata: {
        title: paper.title,
        authors: paper.authors.join(';'),
        year: paper.year.toString(),
        source: paper.source,
        doi: paper.doi || ''
      }
    })

    await s3Client.send(command)
    return s3Key
  }

  private async storeMetadata(paper: PaperMetadata, s3Url: string) {
    // This would integrate with your database
    // For now, just log the metadata
    console.log(`Metadata stored for ${paper.id}: ${s3Url}`)
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
}

// Sample NASA bioscience papers data
const samplePapers: PaperMetadata[] = [
  {
    id: 'nasa_bio_001',
    title: 'Effects of Microgravity on Bone Density in Long-Duration Spaceflight',
    authors: ['Smith, J.', 'Johnson, K.', 'Williams, M.'],
    year: 2023,
    source: 'NASA',
    url: 'https://example.com/paper1.pdf'
  },
  {
    id: 'nasa_bio_002', 
    title: 'Cardiovascular Adaptation During Mars Mission Simulation',
    authors: ['Chen, L.', 'Rodriguez, A.'],
    year: 2022,
    source: 'NASA',
    url: 'https://example.com/paper2.pdf'
  }
  // Add remaining 606 papers...
]

// Main execution
async function main() {
  try {
    const retriever = new DocumentRetriever()
    await retriever.retrieveDocuments(samplePapers)
  } catch (error) {
    console.error('Document retrieval failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { DocumentRetriever }