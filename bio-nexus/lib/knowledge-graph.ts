import neo4j, { Driver, Session } from 'neo4j-driver'
import { AIServices } from './ai-services'

export interface Paper {
  id: string
  title: string
  authors: string[]
  year?: number
  abstract?: string
  keywords?: string[]
  source?: string
  content: string
  chunks: PaperChunk[]
  metadata: {
    fileSize?: number
    pageCount?: number
    processingMethod?: string
    uploadedAt: string
    fileName: string
  }
}

export interface PaperChunk {
  id: string
  content: string
  embedding: number[]
  chunkIndex: number
  metadata: {
    startIndex: number
    endIndex: number
    paperId: string
  }
}

export interface ResearchConcept {
  id: string
  name: string
  description: string
  category: string
}

export interface Connection {
  type: 'CITES' | 'RELATED_TO' | 'STUDIES' | 'CONTRADICTS' | 'SUPPORTS'
  weight: number
  description?: string
}

class Neo4jKnowledgeGraph {
  private driver: Driver | null = null
  private static instance: Neo4jKnowledgeGraph

  constructor() {
    this.initializeDriver()
  }

  static getInstance(): Neo4jKnowledgeGraph {
    if (!Neo4jKnowledgeGraph.instance) {
      Neo4jKnowledgeGraph.instance = new Neo4jKnowledgeGraph()
    }
    return Neo4jKnowledgeGraph.instance
  }

  private initializeDriver() {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
      const username = process.env.NEO4J_USERNAME || 'neo4j'
      const password = process.env.NEO4J_PASSWORD || 'password'

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
      
      // Test connection
      this.driver.verifyConnectivity()
        .then(() => console.log('Neo4j connection verified'))
        .catch(err => console.error('Neo4j connection failed:', err))
        
    } catch (error) {
      console.error('Failed to initialize Neo4j driver:', error)
    }
  }

  async getSession(): Promise<Session> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized')
    }
    return this.driver.session()
  }

  async close() {
    if (this.driver) {
      await this.driver.close()
    }
  }
}

const knowledgeGraph = Neo4jKnowledgeGraph.getInstance()

/**
 * Add a paper to the knowledge graph with all its relationships
 */
export async function addPaperToKnowledgeGraph(paper: Paper): Promise<void> {
  const session = await knowledgeGraph.getSession()
  
  try {
    await session.executeWrite(async (tx) => {
      // Create the main paper node
      await tx.run(
        `
        CREATE (p:Paper {
          id: $id,
          title: $title,
          abstract: $abstract,
          year: $year,
          source: $source,
          content: $content,
          uploadedAt: $uploadedAt,
          fileName: $fileName,
          fileSize: $fileSize,
          pageCount: $pageCount,
          processingMethod: $processingMethod
        })
        `,
        {
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract || '',
          year: paper.year || 0,
          source: paper.source || '',
          content: paper.content,
          uploadedAt: paper.metadata.uploadedAt,
          fileName: paper.metadata.fileName,
          fileSize: paper.metadata.fileSize || 0,
          pageCount: paper.metadata.pageCount || 0,
          processingMethod: paper.metadata.processingMethod || ''
        }
      )

      // Add authors
      for (const author of paper.authors) {
        await tx.run(
          `
          MERGE (a:Author {name: $authorName})
          WITH a
          MATCH (p:Paper {id: $paperId})
          CREATE (a)-[:AUTHORED]->(p)
          `,
          { authorName: author, paperId: paper.id }
        )
      }

      // Add keywords as concepts
      if (paper.keywords) {
        for (const keyword of paper.keywords) {
          await tx.run(
            `
            MERGE (c:Concept {name: $keyword, category: 'keyword'})
            WITH c
            MATCH (p:Paper {id: $paperId})
            CREATE (p)-[:RELATES_TO]->(c)
            `,
            { keyword, paperId: paper.id }
          )
        }
      }

      // Add chunks
      for (const chunk of paper.chunks) {
        await tx.run(
          `
          MATCH (p:Paper {id: $paperId})
          CREATE (p)-[:HAS_CHUNK]->(c:Chunk {
            id: $chunkId,
            content: $content,
            chunkIndex: $chunkIndex,
            startIndex: $startIndex,
            endIndex: $endIndex
          })
          `,
          {
            paperId: paper.id,
            chunkId: chunk.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            startIndex: chunk.metadata.startIndex,
            endIndex: chunk.metadata.endIndex
          }
        )
      }
    })

    // Extract and connect research concepts
    await extractAndConnectConcepts(paper.id, paper.content)
    
    // Find and create relationships with existing papers
    await findAndCreateRelationships(paper.id)

    console.log(`Successfully added paper ${paper.id} to knowledge graph`)

  } catch (error) {
    console.error('Error adding paper to knowledge graph:', error)
    throw error
  } finally {
    await session.close()
  }
}

/**
 * Extract research concepts from paper content and create connections
 */
async function extractAndConnectConcepts(paperId: string, content: string): Promise<void> {
  const session = await knowledgeGraph.getSession()
  
  try {
    // Extract scientific terms and concepts using simple heuristics
    const concepts = extractScientificConcepts(content)
    
    for (const concept of concepts) {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MERGE (c:Concept {name: $conceptName, category: $category})
          WITH c
          MATCH (p:Paper {id: $paperId})
          MERGE (p)-[:STUDIES {weight: $weight}]->(c)
          `,
          {
            conceptName: concept.name,
            category: concept.category,
            paperId,
            weight: concept.weight
          }
        )
      })
    }
  } finally {
    await session.close()
  }
}

/**
 * Find relationships between papers based on content similarity and citations
 */
async function findAndCreateRelationships(paperId: string): Promise<void> {
  const session = await knowledgeGraph.getSession()
  
  try {
    // Find papers with similar concepts
    const result = await session.executeRead(async (tx) => {
      return await tx.run(
        `
        MATCH (p1:Paper {id: $paperId})-[:STUDIES]->(c:Concept)<-[:STUDIES]-(p2:Paper)
        WHERE p1 <> p2
        WITH p1, p2, count(c) as sharedConcepts, collect(c.name) as concepts
        WHERE sharedConcepts >= 2
        RETURN p2.id as relatedPaperId, sharedConcepts, concepts
        ORDER BY sharedConcepts DESC
        LIMIT 10
        `,
        { paperId }
      )
    })

    // Create similarity relationships
    for (const record of result.records) {
      const relatedPaperId = record.get('relatedPaperId')
      const sharedConcepts = record.get('sharedConcepts')
      
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (p1:Paper {id: $paperId}), (p2:Paper {id: $relatedPaperId})
          MERGE (p1)-[:RELATED_TO {
            weight: $weight,
            sharedConcepts: $sharedConcepts,
            type: 'content_similarity'
          }]->(p2)
          `,
          {
            paperId,
            relatedPaperId,
            weight: Math.min(sharedConcepts / 10, 1.0),
            sharedConcepts
          }
        )
      })
    }

    // Find citation relationships (simple text matching)
    await findCitationRelationships(paperId)

  } finally {
    await session.close()
  }
}

/**
 * Find potential citation relationships by matching author names and years
 */
async function findCitationRelationships(paperId: string): Promise<void> {
  const session = await knowledgeGraph.getSession()
  
  try {
    // Get the current paper's content
    const paperResult = await session.executeRead(async (tx) => {
      return await tx.run(
        'MATCH (p:Paper {id: $paperId}) RETURN p.content as content',
        { paperId }
      )
    })

    if (paperResult.records.length === 0) return

    const content = paperResult.records[0].get('content')
    
    // Get all other papers with their authors and years
    const othersResult = await session.executeRead(async (tx) => {
      return await tx.run(
        `
        MATCH (p:Paper)-[:AUTHORED]-(a:Author)
        WHERE p.id <> $paperId AND p.year IS NOT NULL
        WITH p, collect(a.name) as authors
        RETURN p.id as id, p.year as year, authors
        `,
        { paperId }
      )
    })

    // Check for potential citations
    for (const record of othersResult.records) {
      const otherPaperId = record.get('id')
      const year = record.get('year')
      const authors = record.get('authors')

      if (authors && authors.length > 0) {
        const firstAuthor = authors[0].split(' ').pop() // Get last name
        const citationPattern = new RegExp(`${firstAuthor}.*${year}`, 'i')
        
        if (content.match(citationPattern)) {
          await session.executeWrite(async (tx) => {
            await tx.run(
              `
              MATCH (p1:Paper {id: $paperId}), (p2:Paper {id: $otherPaperId})
              MERGE (p1)-[:CITES {
                weight: 1.0,
                confidence: 0.7,
                method: 'text_matching'
              }]->(p2)
              `,
              { paperId, otherPaperId }
            )
          })
        }
      }
    }

  } finally {
    await session.close()
  }
}

/**
 * Extract scientific concepts from text using heuristics
 */
function extractScientificConcepts(content: string): Array<{name: string, category: string, weight: number}> {
  const concepts: Array<{name: string, category: string, weight: number}> = []
  
  // Scientific term patterns
  const patterns = [
    // Biology/Medicine terms
    { pattern: /\b(protein|enzyme|gene|DNA|RNA|cell|tissue|organism|species|bacteria|virus)\b/gi, category: 'biology', weight: 0.8 },
    { pattern: /\b(metabolism|photosynthesis|respiration|mitosis|meiosis|evolution|genetics)\b/gi, category: 'biology', weight: 0.9 },
    
    // Space/Astronomy terms
    { pattern: /\b(planet|star|galaxy|orbit|spacecraft|satellite|mission|astronaut|space station)\b/gi, category: 'space', weight: 0.8 },
    { pattern: /\b(Mars|Earth|Moon|ISS|NASA|ESA|SpaceX|rocket|launch)\b/gi, category: 'space', weight: 0.9 },
    
    // Physics terms
    { pattern: /\b(energy|force|momentum|velocity|acceleration|gravity|radiation|quantum)\b/gi, category: 'physics', weight: 0.8 },
    
    // Chemistry terms
    { pattern: /\b(molecule|compound|reaction|synthesis|catalyst|polymer|solution)\b/gi, category: 'chemistry', weight: 0.8 },
    
    // Technology terms
    { pattern: /\b(algorithm|software|hardware|computer|artificial intelligence|machine learning|data)\b/gi, category: 'technology', weight: 0.7 },
    
    // Research methods
    { pattern: /\b(experiment|analysis|methodology|statistical|correlation|hypothesis|conclusion)\b/gi, category: 'methodology', weight: 0.6 }
  ]

  for (const { pattern, category, weight } of patterns) {
    const matches = content.match(pattern)
    if (matches) {
      for (const match of matches) {
        const normalized = match.toLowerCase().trim()
        if (normalized.length > 2) {
          concepts.push({
            name: normalized,
            category,
            weight
          })
        }
      }
    }
  }

  // Remove duplicates and sort by weight
  const uniqueConcepts = Array.from(
    new Map(concepts.map(c => [c.name, c])).values()
  ).sort((a, b) => b.weight - a.weight)

  return uniqueConcepts.slice(0, 50) // Limit to top 50 concepts
}

/**
 * Search papers in the knowledge graph
 */
export async function searchPapersInKnowledgeGraph(
  query: string, 
  limit: number = 10
): Promise<Array<{
  id: string
  title: string
  authors: string[]
  year?: number
  relevanceScore: number
}>> {
  const session = await knowledgeGraph.getSession()
  
  try {
    const result = await session.executeRead(async (tx) => {
      return await tx.run(
        `
        MATCH (p:Paper)
        WHERE p.title CONTAINS $query OR p.abstract CONTAINS $query OR p.content CONTAINS $query
        OPTIONAL MATCH (p)<-[:AUTHORED]-(a:Author)
        WITH p, collect(a.name) as authors,
             CASE 
               WHEN p.title CONTAINS $query THEN 1.0
               WHEN p.abstract CONTAINS $query THEN 0.8
               ELSE 0.6
             END as relevanceScore
        RETURN p.id as id, p.title as title, p.year as year, authors, relevanceScore
        ORDER BY relevanceScore DESC, p.year DESC
        LIMIT $limit
        `,
        { query, limit }
      )
    })

    return result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      authors: record.get('authors') || [],
      year: record.get('year'),
      relevanceScore: record.get('relevanceScore')
    }))

  } finally {
    await session.close()
  }
}

/**
 * Get paper recommendations based on a paper ID
 */
export async function getRecommendedPapers(
  paperId: string,
  limit: number = 5
): Promise<Array<{
  id: string
  title: string
  authors: string[]
  relationshipType: string
  weight: number
}>> {
  const session = await knowledgeGraph.getSession()
  
  try {
    const result = await session.executeRead(async (tx) => {
      return await tx.run(
        `
        MATCH (p1:Paper {id: $paperId})-[r:RELATED_TO|CITES|STUDIES]-(p2:Paper)
        OPTIONAL MATCH (p2)<-[:AUTHORED]-(a:Author)
        WITH p2, type(r) as relationshipType, r.weight as weight, collect(a.name) as authors
        RETURN p2.id as id, p2.title as title, authors, relationshipType, weight
        ORDER BY weight DESC
        LIMIT $limit
        `,
        { paperId, limit }
      )
    })

    return result.records.map(record => ({
      id: record.get('id'),
      title: record.get('title'),
      authors: record.get('authors') || [],
      relationshipType: record.get('relationshipType'),
      weight: record.get('weight') || 0
    }))

  } finally {
    await session.close()
  }
}

/**
 * Get knowledge graph statistics
 */
export async function getKnowledgeGraphStats(): Promise<{
  totalPapers: number
  totalAuthors: number
  totalConcepts: number
  totalRelationships: number
}> {
  const session = await knowledgeGraph.getSession()
  
  try {
    const result = await session.executeRead(async (tx) => {
      return await tx.run(`
        MATCH (p:Paper) WITH count(p) as totalPapers
        MATCH (a:Author) WITH totalPapers, count(a) as totalAuthors
        MATCH (c:Concept) WITH totalPapers, totalAuthors, count(c) as totalConcepts
        MATCH ()-[r]-() WITH totalPapers, totalAuthors, totalConcepts, count(r) as totalRelationships
        RETURN totalPapers, totalAuthors, totalConcepts, totalRelationships
      `)
    })

    const record = result.records[0]
    return {
      totalPapers: record.get('totalPapers').toNumber(),
      totalAuthors: record.get('totalAuthors').toNumber(),
      totalConcepts: record.get('totalConcepts').toNumber(),
      totalRelationships: record.get('totalRelationships').toNumber()
    }

  } finally {
    await session.close()
  }
}

export { knowledgeGraph }