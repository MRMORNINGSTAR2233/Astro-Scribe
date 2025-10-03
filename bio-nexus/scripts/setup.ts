#!/usr/bin/env node

/**
 * Setup Script for Bio-Nexus Backend
 * Initializes databases, runs migrations, and sets up the complete backend
 */

import { initializeDatabase } from '../lib/database'
import { initializeNeo4j } from '../lib/neo4j'

class BioNexusSetup {
  async runFullSetup(): Promise<void> {
    console.log('🚀 Starting Bio-Nexus Backend Setup...\n')

    try {
      // Step 1: Initialize PostgreSQL
      console.log('📊 Initializing PostgreSQL database...')
      await initializeDatabase()
      console.log('✅ PostgreSQL initialized successfully\n')

      // Step 2: Initialize Neo4j
      console.log('🔗 Initializing Neo4j knowledge graph...')
      await initializeNeo4j()
      console.log('✅ Neo4j initialized successfully\n')

      // Step 3: Verify connections
      console.log('🔍 Verifying database connections...')
      await this.verifyConnections()
      console.log('✅ All database connections verified\n')

      console.log('🎉 Bio-Nexus backend setup completed successfully!')
      console.log('\nNext steps:')
      console.log('1. Run document retrieval: npm run scripts:retrieve-docs')
      console.log('2. Extract PDF text: npm run scripts:extract-pdfs') 
      console.log('3. Generate embeddings: npm run scripts:generate-embeddings')
      console.log('4. Populate knowledge graph: npm run scripts:populate-graph')
      console.log('5. Start the application: npm run dev')

    } catch (error) {
      console.error('❌ Setup failed:', error)
      process.exit(1)
    }
  }

  async verifyConnections(): Promise<void> {
    const { pool } = await import('../lib/database')
    const { driver } = await import('../lib/neo4j')

    // Test PostgreSQL
    const pgClient = await pool.connect()
    try {
      await pgClient.query('SELECT NOW()')
      console.log('  ✓ PostgreSQL connection working')
    } finally {
      pgClient.release()
    }

    // Test Neo4j
    const neo4jSession = driver().session()
    try {
      await neo4jSession.run('RETURN 1')
      console.log('  ✓ Neo4j connection working')
    } finally {
      await neo4jSession.close()
    }
  }

  async createSampleData(): Promise<void> {
    console.log('📝 Creating sample data...')
    
    const { pool } = await import('../lib/database')
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Insert sample papers
      const samplePapers = [
        {
          title: 'Effects of Microgravity on Bone Density in Long-Duration Spaceflight',
          authors: ['Smith, J.', 'Johnson, K.', 'Williams, M.'],
          year: 2023,
          source: 'NASA',
          abstract: 'This study examines the impact of prolonged microgravity exposure on astronaut bone density during missions exceeding 6 months.'
        },
        {
          title: 'Cardiovascular Adaptation Mechanisms in Mars Simulation Studies',
          authors: ['Chen, L.', 'Rodriguez, A.', 'Patel, S.'],
          year: 2022,
          source: 'ESA',
          abstract: 'Research on cardiovascular system changes during extended Mars mission simulations with focus on adaptation mechanisms.'
        },
        {
          title: 'Radiation Effects on Plant Growth in Space Environments',
          authors: ['Green, R.', 'Foster, T.'],
          year: 2023,
          source: 'JAXA',
          abstract: 'Investigation of how cosmic radiation affects plant development and growth patterns in controlled space environments.'
        }
      ]

      for (const paper of samplePapers) {
        await client.query(`
          INSERT INTO papers (title, authors, publication_year, source, abstract)
          VALUES ($1, $2, $3, $4, $5)
        `, [paper.title, paper.authors, paper.year, paper.source, paper.abstract])
      }

      await client.query('COMMIT')
      console.log('✅ Sample data created successfully')
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('⚠️  Resetting all databases...')
    
    const { pool } = await import('../lib/database')
    const { driver } = await import('../lib/neo4j')

    // Reset PostgreSQL
    const client = await pool.connect()
    try {
      await client.query('DROP TABLE IF EXISTS search_queries CASCADE')
      await client.query('DROP TABLE IF EXISTS hypotheses CASCADE')
      await client.query('DROP TABLE IF EXISTS text_chunks CASCADE')
      await client.query('DROP TABLE IF EXISTS papers CASCADE')
      await client.query('DROP TABLE IF EXISTS neo4j_processed_papers CASCADE')
      console.log('  ✓ PostgreSQL tables dropped')
    } finally {
      client.release()
    }

    // Reset Neo4j
    const session = driver().session()
    try {
      await session.run('MATCH (n) DETACH DELETE n')
      console.log('  ✓ Neo4j database cleared')
    } finally {
      await session.close()
    }

    // Reinitialize
    await initializeDatabase()
    await initializeNeo4j()
    console.log('✅ Databases reset and reinitialized')
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'setup'

  const setup = new BioNexusSetup()

  try {
    switch (command) {
      case 'setup':
        await setup.runFullSetup()
        break
        
      case 'sample-data':
        await setup.createSampleData()
        break
        
      case 'reset':
        await setup.resetDatabase()
        break
        
      case 'verify':
        await setup.verifyConnections()
        break
        
      default:
        console.log('Usage: node setup.js [setup|sample-data|reset|verify]')
        console.log('')
        console.log('Commands:')
        console.log('  setup       - Full backend initialization')
        console.log('  sample-data - Create sample data for testing')
        console.log('  reset       - Reset all databases (DESTRUCTIVE)')
        console.log('  verify      - Test database connections')
        process.exit(1)
    }
  } catch (error) {
    console.error('Setup command failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { BioNexusSetup }