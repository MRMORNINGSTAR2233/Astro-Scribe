import neo4j from 'neo4j-driver'

// Interface for paper results from Neo4j
interface PaperResult {
  id: string
  title: string
  authors: string[]
  publication_year: number
  source: string
  abstract: string
  keywords: string[]
  connections: {
    related_concepts: string[]
    relationship_types: string[]
    connection_strength: number
  }
  relevance_score: number
}

// Neo4j connection for knowledge graph
let driver: any = null

function getDriver() {
  if (!driver) {
    try {
      driver = neo4j.driver(
        process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4j.auth.basic(
          process.env.NEO4J_USER || 'neo4j',
          process.env.NEO4J_PASSWORD || 'password'
        )
      )
    } catch (error) {
      console.warn('Neo4j connection failed:', error)
      // Return a mock driver that doesn't try to connect
      driver = {
        session: () => ({
          run: () => Promise.resolve({ records: [] }),
          close: () => Promise.resolve()
        }),
        close: () => Promise.resolve()
      }
    }
  }
  return driver
}

/**
 * Search for papers using knowledge graph relationships
 */
export async function searchKnowledgeGraph(query: string, entities: string[]): Promise<PaperResult[]> {
  const session = getDriver().session()
  try {
    let results: PaperResult[] = []
    
    // Search for papers related to the entities
    for (const entity of entities.slice(0, 5)) { // Limit to prevent too many queries
      const graphQuery = `
        MATCH (p:Paper)-[r]->(c:Concept {name: $entity})
        OPTIONAL MATCH (p)-[r2]->(other:Concept)
        RETURN p, collect(DISTINCT other.name) as related_concepts, 
               collect(DISTINCT type(r)) as relationship_types,
               count(r) as connection_strength
        ORDER BY connection_strength DESC
        LIMIT 10
      `
      
      const result = await session.run(graphQuery, { entity })
      
    interface PaperProperties {
        id: string;
        title: string;
        authors: string[] | null;
        publication_year: number;
        source: string;
        abstract: string;
        keywords: string[] | null;
    }

    interface Neo4jRecord {
        get(key: string): any;
    }

                results.push(...result.records.map((record: Neo4jRecord) => {
                    const paper: PaperProperties = record.get('p').properties;
                    return {
                        id: paper.id,
                        title: paper.title,
                        authors: paper.authors || [],
                        publication_year: paper.publication_year,
                        source: paper.source,
                        abstract: paper.abstract,
                        keywords: paper.keywords || [],
                        connections: {
                            related_concepts: record.get('related_concepts') as string[],
                            relationship_types: record.get('relationship_types') as string[],
                            connection_strength: record.get('connection_strength') as number
                        },
                        relevance_score: Math.min(record.get('connection_strength') as number / 10, 1.0)
                    }
                }))
    }
    
    // Deduplicate by paper ID
    const uniqueResults = results.reduce((acc: PaperResult[], paper: PaperResult) => {
      if (!acc.find((p: PaperResult) => p.id === paper.id)) {
        acc.push(paper)
      }
      return acc
    }, [] as PaperResult[])
    
    return uniqueResults.sort((a: PaperResult, b: PaperResult) => b.relevance_score - a.relevance_score)
    
  } finally {
    await session.close()
  }
}
export async function initializeNeo4j() {
  const session = getDriver().session()
  try {
    // Create constraints for unique identifiers
    await session.run(`
      CREATE CONSTRAINT paper_id_unique IF NOT EXISTS
      FOR (p:Paper) REQUIRE p.id IS UNIQUE
    `)

    await session.run(`
      CREATE CONSTRAINT entity_name_unique IF NOT EXISTS  
      FOR (e:Entity) REQUIRE (e.name, e.type) IS UNIQUE
    `)

    // Create indexes for better query performance
    await session.run(`
      CREATE INDEX paper_year_idx IF NOT EXISTS
      FOR (p:Paper) ON (p.publication_year)
    `)

    await session.run(`
      CREATE INDEX entity_type_idx IF NOT EXISTS
      FOR (e:Entity) ON (e.type)
    `)

    console.log('Neo4j initialized successfully')
  } catch (error) {
    console.error('Neo4j initialization error:', error)
    throw error
  } finally {
    await session.close()
  }
}

// Knowledge graph query helpers
export class Neo4jService {
  static async findRelatedEntities(entityName: string, relationshipTypes: string[] = []) {
    const session = getDriver().session()
    try {
      const relationshipFilter = relationshipTypes.length > 0 
        ? `WHERE type(r) IN [${relationshipTypes.map(t => `'${t}'`).join(', ')}]`
        : ''

      const result = await session.run(`
        MATCH (e1:Entity {name: $entityName})-[r]-(e2:Entity)
        ${relationshipFilter}
        RETURN e2.name as name, e2.type as type, type(r) as relationship, r.confidence as confidence
        ORDER BY r.confidence DESC
        LIMIT 50
      `, { entityName })

    // Interface for related entity results
    interface RelatedEntity {
      name: string;
      type: string;
      relationship: string;
      confidence: number;
    }

    interface Neo4jRecord {
      get(key: string): any;
    }

    return result.records.map((record: Neo4jRecord): RelatedEntity => ({
      name: record.get('name') as string,
      type: record.get('type') as string,
      relationship: record.get('relationship') as string,
      confidence: record.get('confidence') as number
    }))
    } finally {
      await session.close()
    }
  }

  static async findCrossFieldConnections(field1: string, field2: string) {
    const session = getDriver().session()
    try {
      const result = await session.run(`
        MATCH (e1:Entity)-[:APPEARS_IN]->(p1:Paper)-[:BELONGS_TO_FIELD]->(f1:Field {name: $field1})
        MATCH (e2:Entity)-[:APPEARS_IN]->(p2:Paper)-[:BELONGS_TO_FIELD]->(f2:Field {name: $field2})
        MATCH (e1)-[r:SIMILAR_TO|INFLUENCES|AFFECTS]-(e2)
        RETURN e1.name as entity1, e2.name as entity2, type(r) as relationship, 
               r.confidence as confidence, p1.title as paper1, p2.title as paper2
        ORDER BY r.confidence DESC
        LIMIT 20
      `, { field1, field2 })

      interface Neo4jRecord {
        get(key: string): any;
      }

      return result.records.map((record: Neo4jRecord) => ({
        entity1: record.get('entity1'),
        entity2: record.get('entity2'),
        relationship: record.get('relationship'),
        confidence: record.get('confidence'),
        paper1: record.get('paper1'),
        paper2: record.get('paper2')
      }))
    } finally {
      await session.close()
    }
  }

  static async getMissionRiskProfile(destination: string, duration: number) {
    const session = getDriver().session()
    try {
      const result = await session.run(`
        MATCH (risk:RiskFactor)-[:APPLIES_TO]->(env:Environment {name: $destination})
        MATCH (risk)-[:DOCUMENTED_IN]->(p:Paper)-[:HAS_FINDING]->(finding:Finding)
        WHERE finding.duration_relevance >= $duration OR finding.duration_relevance IS NULL
        WITH risk, 
             AVG(finding.severity_score) as avg_severity,
             COUNT(p) as evidence_count,
             COLLECT(DISTINCT p.title)[0..5] as sample_papers
        RETURN risk.name as risk_name, 
               risk.category as category,
               avg_severity as severity_score,
               evidence_count,
               sample_papers
        ORDER BY avg_severity DESC, evidence_count DESC
        LIMIT 15
      `, { destination, duration })

      interface Neo4jRecord {
        get(key: string): any;
      }

      return result.records.map((record: Neo4jRecord) => ({
        name: record.get('risk_name'),
        category: record.get('category'),
        severity: record.get('severity_score'),
        evidenceCount: record.get('evidence_count').toNumber(),
        samplePapers: record.get('sample_papers')
      }))
    } finally {
      await session.close()
    }
  }
}

export { getDriver as driver }