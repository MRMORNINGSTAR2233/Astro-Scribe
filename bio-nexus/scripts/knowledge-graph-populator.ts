#!/usr/bin/env node

/**
 * Knowledge Graph Population Script
 * Uses LLM to extract entities and relationships, then populates Neo4j
 */

import { pool } from '../lib/database'
import { driver } from '../lib/neo4j'
import { llm } from '../lib/ai-services'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

interface ExtractedEntity {
  name: string
  type: 'biological_process' | 'anatomical_structure' | 'chemical' | 'environment' | 'device' | 'measurement' | 'organism'
  description?: string
  confidence: number
}

interface ExtractedRelationship {
  source: string
  target: string
  relationship: string
  confidence: number
  evidence: string
}

interface PaperData {
  id: string
  title: string
  abstract: string
  sections: Array<{ content: string; section_type: string }>
}

class KnowledgeGraphPopulator {
  private readonly batchSize = 20
  private readonly maxRetries = 3

  async populateKnowledgeGraph(): Promise<void> {
    console.log('Starting knowledge graph population...')
    
    try {
      // Get papers that haven't been processed for graph extraction
      const papers = await this.getUnprocessedPapers()
      console.log(`Found ${papers.length} papers to process`)

      if (papers.length === 0) {
        console.log('No papers to process')
        return
      }

      let processed = 0
      let failed = 0

      for (const paper of papers) {
        try {
          console.log(`Processing: ${paper.title}`)
          
          // Extract entities and relationships
          const extraction = await this.extractKnowledgeFromPaper(paper)
          
          // Store in Neo4j
          await this.storeInNeo4j(paper, extraction)
          
          // Mark as processed
          await this.markAsProcessed(paper.id)
          
          processed++
          console.log(`✓ Extracted ${extraction.entities.length} entities, ${extraction.relationships.length} relationships`)
          
        } catch (error) {
          console.error(`✗ Failed to process ${paper.title}:`, error)
          failed++
        }

        // Progress update
        if ((processed + failed) % 10 === 0) {
          console.log(`Progress: ${processed + failed}/${papers.length} (${processed} success, ${failed} failed)`)
        }
      }

      // Create cross-paper relationships
      console.log('\nCreating cross-paper relationships...')
      await this.createCrossReferences()

      console.log(`\nKnowledge graph population complete: ${processed} success, ${failed} failed`)
      
    } catch (error) {
      console.error('Knowledge graph population failed:', error)
      throw error
    }
  }

  private async extractKnowledgeFromPaper(paper: PaperData): Promise<{
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[]
  }> {
    
    const extractionPrompt = PromptTemplate.fromTemplate(`
      Extract scientific entities and relationships from this space biology research paper.
      
      Title: {title}
      Abstract: {abstract}
      Key Sections: {sections}
      
      Extract:
      1. Biological entities (processes, structures, chemicals, organisms)
      2. Environmental factors (microgravity, radiation, etc.)
      3. Measurement devices and techniques
      4. Relationships between entities
      
      Respond with JSON:
      {{
        "entities": [{{
          "name": "entity name",
          "type": "biological_process|anatomical_structure|chemical|environment|device|measurement|organism",
          "description": "brief description",
          "confidence": 0.0-1.0
        }}],
        "relationships": [{{
          "source": "entity1 name",
          "target": "entity2 name", 
          "relationship": "affects|influences|increases|decreases|requires|produces|occurs_in",
          "confidence": 0.0-1.0,
          "evidence": "supporting text from paper"
        }}]
      }}
      
      Focus on space biology context. Include confidence scores based on evidence strength.
    `)

    const sectionsText = paper.sections
      .slice(0, 5) // Limit to avoid token limits
      .map(s => `${s.section_type}: ${s.content.substring(0, 500)}...`)
      .join('\n\n')

    const chain = extractionPrompt.pipe(llm()).pipe(new StringOutputParser())
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await chain.invoke({
          title: paper.title,
          abstract: paper.abstract || '',
          sections: sectionsText
        })

        const parsed = JSON.parse(result)
        
        // Validate and clean extracted data
        const entities = this.validateEntities(parsed.entities || [])
        const relationships = this.validateRelationships(parsed.relationships || [], entities)
        
        return { entities, relationships }
        
      } catch (error) {
        console.error(`Extraction attempt ${attempt} failed:`, error)
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to extract knowledge after ${this.maxRetries} attempts`)
        }
        
        await this.delay(1000 * attempt)
      }
    }
    
    throw new Error('Unexpected error in knowledge extraction')
  }

  private validateEntities(entities: any[]): ExtractedEntity[] {
    return entities
      .filter(e => e.name && e.type && e.confidence >= 0.3)
      .map(e => ({
        name: e.name.toLowerCase().trim(),
        type: e.type,
        description: e.description || '',
        confidence: Math.min(1.0, Math.max(0.0, e.confidence))
      }))
      .filter((entity, index, array) => 
        array.findIndex(e => e.name === entity.name && e.type === entity.type) === index
      ) // Remove duplicates
  }

  private validateRelationships(relationships: any[], entities: ExtractedEntity[]): ExtractedRelationship[] {
    const entityNames = new Set(entities.map(e => e.name))
    
    return relationships
      .filter(r => 
        r.source && r.target && r.relationship && r.confidence >= 0.3 &&
        entityNames.has(r.source.toLowerCase().trim()) &&
        entityNames.has(r.target.toLowerCase().trim())
      )
      .map(r => ({
        source: r.source.toLowerCase().trim(),
        target: r.target.toLowerCase().trim(),
        relationship: r.relationship.toUpperCase().replace(/\s+/g, '_'),
        confidence: Math.min(1.0, Math.max(0.0, r.confidence)),
        evidence: r.evidence || ''
      }))
  }

  private async storeInNeo4j(paper: PaperData, extraction: {
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[]
  }): Promise<void> {
    const session = driver().session()
    
    try {
    await session.executeWrite(async (tx: import('neo4j-driver').ManagedTransaction) => {
      // Create paper node
      await tx.run(`
        MERGE (p:Paper {id: $paperId})
        SET p.title = $title,
          p.abstract = $abstract,
          p.processed_at = datetime()
      `, {
        paperId: paper.id,
        title: paper.title,
        abstract: paper.abstract || ''
      })

      // Create entity nodes
      for (const entity of extraction.entities) {
        await tx.run(`
        MERGE (e:Entity {name: $name, type: $type})
        SET e.description = $description,
            e.confidence = $confidence,
            e.updated_at = datetime()
        `, {
        name: entity.name,
        type: entity.type,
        description: entity.description,
        confidence: entity.confidence
        })

        // Link entity to paper
        await tx.run(`
        MATCH (e:Entity {name: $entityName, type: $entityType})
        MATCH (p:Paper {id: $paperId})
        MERGE (e)-[:APPEARS_IN {confidence: $confidence}]->(p)
        `, {
        entityName: entity.name,
        entityType: entity.type,
        paperId: paper.id,
        confidence: entity.confidence
        })
      }

      // Create relationships between entities
      for (const rel of extraction.relationships) {
        await tx.run(`
        MATCH (source:Entity {name: $sourceName})
        MATCH (target:Entity {name: $targetName})
        MATCH (p:Paper {id: $paperId})
        MERGE (source)-[r:\`${rel.relationship}\`]->(target)
        SET r.confidence = $confidence,
            r.evidence = $evidence,
            r.paper_id = $paperId,
            r.updated_at = datetime()
        `, {
        sourceName: rel.source,
        targetName: rel.target,
        confidence: rel.confidence,
        evidence: rel.evidence,
        paperId: paper.id
        })
      }
    })
    } finally {
      await session.close()
    }
  }

  private async createCrossReferences(): Promise<void> {
    const session = driver().session()
    
    try {
      // Find entities that appear in multiple papers and create stronger connections
      await session.run(`
        MATCH (e:Entity)-[:APPEARS_IN]->(p:Paper)
        WITH e, count(p) as paper_count
        WHERE paper_count > 1
        SET e.cross_paper_frequency = paper_count
      `)

      // Create similarity relationships between entities of the same type
      await session.run(`
        MATCH (e1:Entity)-[:APPEARS_IN]->(p1:Paper)
        MATCH (e2:Entity)-[:APPEARS_IN]->(p2:Paper)
        WHERE e1.type = e2.type 
          AND e1.name < e2.name
          AND p1 <> p2
        WITH e1, e2, count(*) as shared_papers
        WHERE shared_papers >= 2
        MERGE (e1)-[r:SIMILAR_TO]->(e2)
        SET r.shared_papers = shared_papers,
            r.confidence = shared_papers * 0.2
      `)

      // Create field classifications
      await session.run(`
        MATCH (p:Paper)-[:APPEARS_IN]-(e:Entity)
        WHERE e.type IN ['biological_process', 'anatomical_structure']
        WITH p, collect(DISTINCT e.type) as entity_types
        SET p.primary_field = CASE 
          WHEN 'biological_process' IN entity_types THEN 'physiology'
          WHEN 'anatomical_structure' IN entity_types THEN 'anatomy'
          ELSE 'general'
        END
      `)

      console.log('Cross-references created successfully')
      
    } finally {
      await session.close()
    }
  }

  private async getUnprocessedPapers(): Promise<PaperData[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT 
          p.id, 
          p.title, 
          p.abstract,
          array_agg(
            json_build_object(
              'content', tc.content,
              'section_type', tc.section_type
            )
          ) as sections
        FROM papers p
        LEFT JOIN text_chunks tc ON p.id = tc.paper_id
        WHERE p.id NOT IN (
          SELECT DISTINCT split_part(r.paper_id, '_', 1)
          FROM neo4j_processed_papers r
        )
        AND tc.content IS NOT NULL
        GROUP BY p.id, p.title, p.abstract
        HAVING array_length(array_agg(tc.content), 1) > 0
        ORDER BY p.publication_year DESC
        LIMIT 100
      `)
      
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        abstract: row.abstract,
        sections: row.sections.filter((s: any) => s.content)
      }))
    } catch (error) {
      // Table might not exist, create it
      await client.query(`
        CREATE TABLE IF NOT EXISTS neo4j_processed_papers (
          paper_id TEXT PRIMARY KEY,
          processed_at TIMESTAMP DEFAULT NOW()
        )
      `)
      
      // Retry the query
      const result = await client.query(`
        SELECT 
          p.id, 
          p.title, 
          p.abstract,
          array_agg(
            json_build_object(
              'content', tc.content,
              'section_type', tc.section_type
            )
          ) as sections
        FROM papers p
        LEFT JOIN text_chunks tc ON p.id = tc.paper_id
        WHERE tc.content IS NOT NULL
        GROUP BY p.id, p.title, p.abstract
        HAVING array_length(array_agg(tc.content), 1) > 0
        ORDER BY p.publication_year DESC
        LIMIT 100
      `)
      
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        abstract: row.abstract,
        sections: row.sections.filter((s: any) => s.content)
      }))
    } finally {
      client.release()
    }
  }

  private async markAsProcessed(paperId: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query(`
        INSERT INTO neo4j_processed_papers (paper_id)
        VALUES ($1)
        ON CONFLICT (paper_id) DO NOTHING
      `, [paperId])
    } finally {
      client.release()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Analysis and validation methods
  async analyzeGraph(): Promise<void> {
    console.log('\nAnalyzing knowledge graph...')
    
    const session = driver().session()
    try {
      // Basic statistics
      const stats = await session.run(`
        MATCH (e:Entity) 
        RETURN count(e) as entity_count,
               collect(DISTINCT e.type) as entity_types
      `)

      const relationshipStats = await session.run(`
        MATCH ()-[r]->() 
        RETURN type(r) as relationship_type, count(r) as count
        ORDER BY count DESC
      `)

      const paperStats = await session.run(`
        MATCH (p:Paper) 
        RETURN count(p) as paper_count
      `)

      console.log('Graph Statistics:')
      console.log(`- Papers: ${paperStats.records[0]?.get('paper_count') || 0}`)
      console.log(`- Entities: ${stats.records[0]?.get('entity_count') || 0}`)
      console.log(`- Entity Types: ${stats.records[0]?.get('entity_types') || []}`)
      console.log('- Top Relationships:')
      
    relationshipStats.records.slice(0, 10).forEach((record: import('neo4j-driver').Record) => {
      console.log(`  ${record.get('relationship_type')}: ${record.get('count')}`)
    })

    } finally {
      await session.close()
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'populate'

  try {
    const populator = new KnowledgeGraphPopulator()
    
    switch (command) {
      case 'populate':
        await populator.populateKnowledgeGraph()
        break
        
      case 'analyze':
        await populator.analyzeGraph()
        break
        
      default:
        console.log('Usage: node knowledge-graph-populator.js [populate|analyze]')
        process.exit(1)
    }
  } catch (error) {
    console.error('Knowledge graph population failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { KnowledgeGraphPopulator }