import { GoogleGenerativeAI } from '@google/generative-ai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatGroq } from '@langchain/groq'
import { 
  queryClassificationAgent, 
  hypothesisGenerationAgent, 
  missionRiskAgent 
} from './langgraph-agents'

// Lazy initialization of AI clients
let gemini: GoogleGenerativeAI | null = null
let groq: ChatGroq | null = null

function getGemini(): GoogleGenerativeAI {
  if (!gemini) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('Gemini API key not found. Embeddings will use fallback method.')
      // Return null to trigger fallback embedding generation
      return null as any
    }
    gemini = new GoogleGenerativeAI(apiKey)
  }
  return gemini
}

function getGroq(): ChatGroq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('Groq API key not found. Please set the GROQ_API_KEY environment variable or provide the key into "apiKey"')
    }
    groq = new ChatGroq({
      apiKey: apiKey,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.1,
    })
  }
  return groq
}

export class AIServices {
  /**
   * Classify query intent and determine routing strategy using LangGraph agent
   */
  static async classifyQuery(query: string): Promise<{
    intent: 'research' | 'hypothesis' | 'mission_risk' | 'trending'
    entities: string[]
    routing: {
      strategy: 'vector' | 'graph' | 'hybrid' | 'ai_analysis'
      priority: 'high' | 'medium' | 'low'
      dataSources: string[]
    }
    confidence: number
    reasoning: string
  }> {
    try {
      const result = await queryClassificationAgent.process(query)
      
      // Map intent to our system categories
      const intentMapping: Record<string, 'research' | 'hypothesis' | 'mission_risk' | 'trending'> = {
        'LITERATURE_SEARCH': 'research',
        'HYPOTHESIS_GENERATION': 'hypothesis', 
        'MISSION_RISK_ANALYSIS': 'mission_risk',
        'TREND_ANALYSIS': 'trending',
        'COMPARATIVE_ANALYSIS': 'research',
        'EXPERIMENTAL_DESIGN': 'hypothesis'
      }

      const strategyMapping: Record<string, 'vector' | 'graph' | 'hybrid' | 'ai_analysis'> = {
        'VECTOR_SEARCH': 'vector',
        'GRAPH_TRAVERSAL': 'graph',
        'HYBRID_SEARCH': 'hybrid',
        'AI_ANALYSIS': 'ai_analysis',
        'DATABASE_QUERY': 'hybrid'
      }

      return {
        intent: intentMapping[result.intent] || 'research',
        entities: this.extractEntityValues(result.entities),
        routing: {
          strategy: strategyMapping[result.routing.strategy] || 'hybrid',
          priority: result.routing.priority || 'medium',
          dataSources: result.routing.dataSources || ['papers', 'embeddings']
        },
        confidence: result.confidence,
        reasoning: result.reasoning
      }
    } catch (error) {
      console.error('Query classification error:', error)
      
      // Fallback classification
      return {
        intent: 'research',
        entities: [],
        routing: {
          strategy: 'hybrid',
          priority: 'medium',
          dataSources: ['papers', 'embeddings']
        },
        confidence: 0.5,
        reasoning: 'Fallback classification due to processing error'
      }
    }
  }

  /**
   * Generate research hypotheses using LangGraph agent
   */
  static async generateHypotheses(papers: any[], context?: any): Promise<{
    hypotheses: Array<{
      hypothesis: string
      rationale: string
      experimental_design: string
      feasibility_score: number
      impact_score: number
    }>
    methodology: string
    confidence: number
    reasoning: string
  }> {
    try {
      const result = await hypothesisGenerationAgent.process(papers, context)
      
      // Process and validate hypotheses
      const processedHypotheses = Array.isArray(result.hypotheses) 
        ? result.hypotheses.map((h: any) => ({
            hypothesis: h.hypothesis || h.title || 'Hypothesis not properly formatted',
            rationale: h.rationale || h.reasoning || 'Rationale not provided',
            experimental_design: h.experimental_design || h.approach || 'Design not specified',
            feasibility_score: h.feasibility_score || 0.7,
            impact_score: h.impact_score || 0.8
          }))
        : []

      return {
        hypotheses: processedHypotheses,
        methodology: 'LangGraph-powered hypothesis generation using Groq AI analysis',
        confidence: result.confidence,
        reasoning: result.reasoning
      }
    } catch (error) {
      console.error('Hypothesis generation error:', error)
      
      return {
        hypotheses: [],
        methodology: 'Error in hypothesis generation',
        confidence: 0,
        reasoning: 'Failed to generate hypotheses due to processing error'
      }
    }
  }

  /**
   * Analyze mission risk using LangGraph agent
   */
  static async analyzeMissionRisk(missionProfile: {
    duration: number
    crew_size: number
    destination: string
    mission_type: string
  }, researchData?: any[]): Promise<{
    overall_risk_score: number
    risk_categories: Array<{
      category: string
      risk_level: 'low' | 'medium' | 'high' | 'critical'
      probability: number
      impact: number
      mitigation_strategies: string[]
      evidence_strength: 'low' | 'medium' | 'high'
    }>
    recommendations: string[]
    confidence: number
    reasoning: string
  }> {
    try {
      const result = await missionRiskAgent.process(missionProfile, researchData)
      
      // Process risk assessment data
      const riskCategories = this.processRiskAssessment(result.riskAssessment)
      const overallRiskScore = this.calculateOverallRisk(riskCategories)
      const recommendations = this.extractRecommendations(result.mitigations)

      return {
        overall_risk_score: overallRiskScore,
        risk_categories: riskCategories,
        recommendations,
        confidence: result.confidence,
        reasoning: result.reasoning
      }
    } catch (error) {
      console.error('Mission risk analysis error:', error)
      
      return {
        overall_risk_score: 0.5,
        risk_categories: [],
        recommendations: ['Unable to complete risk analysis'],
        confidence: 0,
        reasoning: 'Failed to analyze mission risk due to processing error'
      }
    }
  }

  /**
   * Generate simple hash-based embedding fallback (768 dimensions for Gemini compatibility)
   */
  private static generateFallbackEmbedding(text: string): number[] {
    // Create a deterministic embedding based on text content
    const normalized = text.toLowerCase().trim()
    const embedding = new Array(768).fill(0) // Gemini text-embedding-004 uses 768 dimensions
    
    // Simple hash-based approach for consistent embeddings
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      const index = (char + i) % 768
      embedding[index] += Math.sin(char * 0.1 + i * 0.01)
    }
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding
  }

  /**
   * Generate embeddings using Gemini's latest embedding model
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const geminiAI = getGemini()
      
      // If no API key available, use fallback
      if (!geminiAI) {
        console.warn('Using fallback embedding generation (no Gemini API key)')
        return this.generateFallbackEmbedding(text)
      }
      
      // Use Gemini's text-embedding-004 model (latest embedding model)
      const model = geminiAI.getGenerativeModel({ model: "text-embedding-004" })
      
      const result = await model.embedContent(text.substring(0, 2048)) // Gemini supports up to 2048 tokens
      
      if (result.embedding && result.embedding.values) {
        return result.embedding.values
      } else {
        throw new Error('Invalid embedding response from Gemini')
      }
    } catch (error) {
      console.error('Gemini embedding generation error:', error)
      console.warn('Falling back to simple embedding generation')
      return this.generateFallbackEmbedding(text)
    }
  }

  /**
   * Enhanced semantic search with Groq-powered analysis
   */
  static async enhancedSemanticAnalysis(query: string, results: any[]): Promise<{
    reranked_results: any[]
    semantic_insights: string[]
    confidence: number
  }> {
    try {
      const analysisPrompt = `Analyze the following search results for the query "${query}":

Results:
${JSON.stringify(results.slice(0, 10), null, 2)}

Provide:
1. Reranking based on semantic relevance
2. Key insights from the research
3. Confidence in the analysis

Format as JSON with reranked_results, semantic_insights array, and confidence score.`

      const response = await getGroq().invoke([
        { role: 'system', content: 'You are a NASA bioscience research analyst.' },
        { role: 'user', content: analysisPrompt }
      ])

      try {
        const analysis = JSON.parse(response.content as string)
        return {
          reranked_results: analysis.reranked_results || results,
          semantic_insights: analysis.semantic_insights || [],
          confidence: analysis.confidence || 0.7
        }
      } catch (parseError) {
        return {
          reranked_results: results,
          semantic_insights: [response.content as string],
          confidence: 0.6
        }
      }
    } catch (error) {
      console.error('Semantic analysis error:', error)
      return {
        reranked_results: results,
        semantic_insights: ['Analysis unavailable'],
        confidence: 0.3
      }
    }
  }

  // Helper methods
  private static extractEntityValues(entities: any): string[] {
    if (!entities || typeof entities !== 'object') return []
    
    const values: string[] = []
    Object.values(entities).forEach((category: any) => {
      if (Array.isArray(category)) {
        values.push(...category)
      } else if (typeof category === 'object' && category.entities) {
        values.push(...category.entities)
      }
    })
    
    return values.filter(v => typeof v === 'string' && v.length > 0)
  }

  private static processRiskAssessment(assessment: any): Array<{
    category: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    probability: number
    impact: number
    mitigation_strategies: string[]
    evidence_strength: 'low' | 'medium' | 'high'
  }> {
    if (!assessment || typeof assessment !== 'object') return []
    
    const categories: any[] = []
    
    // Handle different possible structures
    if (Array.isArray(assessment)) {
      categories.push(...assessment)
    } else if (assessment.risks && Array.isArray(assessment.risks)) {
      categories.push(...assessment.risks)
    } else {
      // Convert object to array format
      Object.entries(assessment).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          categories.push({ category: key, ...value })
        }
      })
    }

    return categories.map((cat: any) => ({
      category: cat.category || cat.name || 'Unknown',
      risk_level: this.mapRiskLevel(cat.risk_score || cat.severity || 0.5),
      probability: cat.probability || 0.5,
      impact: cat.impact || cat.severity || 0.5,
      mitigation_strategies: cat.mitigations || cat.strategies || [],
      evidence_strength: cat.evidence_strength || 'medium'
    }))
  }

  private static mapRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical'
    if (score >= 0.6) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  private static calculateOverallRisk(categories: any[]): number {
    if (!categories.length) return 0.5
    
    const avgRisk = categories.reduce((sum, cat) => sum + (cat.probability * cat.impact), 0) / categories.length
    return Math.min(Math.max(avgRisk, 0), 1)
  }

  private static extractRecommendations(mitigations: string): string[] {
    if (!mitigations || typeof mitigations !== 'string') return []
    
    // Simple extraction - split by bullet points, numbers, or newlines
    return mitigations
      .split(/\n|•|\d+\.|\-/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 10) // Limit to top 10 recommendations
  }
}

// Lazy getter for Groq language model
function getLLM(): ChatGroq {
  return getGroq()
}

// Query classification and routing
export class QueryRouter {
  static async classifyQuery(query: string): Promise<{
    type: 'vector_search' | 'graph_query' | 'hybrid' | 'clarification_needed',
    confidence: number,
    reasoning: string,
    suggestedParams?: any
  }> {
    const classificationPrompt = PromptTemplate.fromTemplate(`
      Analyze this user query about space biology research and classify it:
      
      Query: "{query}"
      
      Classification types:
      - vector_search: For finding papers by content similarity, keywords, concepts
      - graph_query: For exploring relationships, connections, entity interactions  
      - hybrid: For complex queries needing both approaches
      - clarification_needed: For vague or ambiguous queries
      
      Respond with JSON:
      {{
        "type": "classification_type",
        "confidence": 0.0-1.0,
        "reasoning": "brief explanation",
        "suggestedParams": {{optional_parameters}}
      }}
    `)

    const chain = classificationPrompt.pipe(getLLM()).pipe(new StringOutputParser())
    
    try {
      const result = await chain.invoke({ query })
      return JSON.parse(result)
    } catch (error) {
      console.error('Query classification error:', error)
      return {
        type: 'vector_search',
        confidence: 0.5,
        reasoning: 'Fallback to vector search due to classification error'
      }
    }
  }
}

// Hypothesis generation service
export class HypothesisGenerator {
  static async generateHypotheses(papers: any[], topic: string): Promise<Array<{
    statement: string,
    confidence: number,
    supportingPapers: string[],
    reasoning: string
  }>> {
    const hypothesisPrompt = PromptTemplate.fromTemplate(`
      Based on these research papers about {topic}, generate 3-5 novel scientific hypotheses:
      
      Papers:
      {papers}
      
      Generate hypotheses that:
      1. Connect findings from different papers
      2. Identify gaps in current research
      3. Suggest testable scientific questions
      4. Focus on space biology applications
      
      Respond with JSON array:
      [{{
        "statement": "clear hypothesis statement",
        "confidence": 0.0-1.0,
        "supportingPapers": ["paper_id1", "paper_id2"],
        "reasoning": "explanation of the reasoning"
      }}]
    `)

    const papersText = papers.map(p => 
      `ID: ${p.id}, Title: ${p.title}, Abstract: ${p.abstract?.substring(0, 200)}...`
    ).join('\n\n')

    const chain = hypothesisPrompt.pipe(getLLM()).pipe(new StringOutputParser())
    
    try {
      const result = await chain.invoke({ 
        topic, 
        papers: papersText 
      })
      return JSON.parse(result)
    } catch (error) {
      console.error('Hypothesis generation error:', error)
      return []
    }
  }
}

// Mission risk analysis service
export class MissionRiskAnalyzer {
  static async analyzeMissionRisks(
    destination: string, 
    duration: number, 
    relevantFindings: any[]
  ): Promise<{
    rankedRisks: Array<{ category: string, score: number, description: string }>,
    knowledgeGaps: string[],
    countermeasures: Array<{ risk: string, measure: string, effectiveness: number }>
  }> {
    const riskAnalysisPrompt = PromptTemplate.fromTemplate(`
      Analyze mission risks for a {duration}-day mission to {destination} based on these research findings:
      
      Research Findings:
      {findings}
      
      Provide comprehensive risk analysis with:
      1. Ranked biological risks (0.0-1.0 severity score)
      2. Identified knowledge gaps
      3. Known countermeasures and their effectiveness
      
      Respond with JSON:
      {{
        "rankedRisks": [{{
          "category": "risk category",
          "score": 0.0-1.0,
          "description": "detailed description"
        }}],
        "knowledgeGaps": ["gap description"],
        "countermeasures": [{{
          "risk": "risk category",
          "measure": "countermeasure description", 
          "effectiveness": 0.0-1.0
        }}]
      }}
    `)

    const findingsText = relevantFindings.map(f => 
      `${f.risk_name}: ${f.description} (Evidence: ${f.evidence_count} papers)`
    ).join('\n')

    const chain = riskAnalysisPrompt.pipe(getLLM()).pipe(new StringOutputParser())
    
    try {
      const result = await chain.invoke({ 
        destination, 
        duration, 
        findings: findingsText 
      })
      return JSON.parse(result)
    } catch (error) {
      console.error('Risk analysis error:', error)
      return {
        rankedRisks: [],
        knowledgeGaps: [],
        countermeasures: []
      }
    }
  }
}

// Cross-disciplinary connection finder
export class CrossFieldConnector {
  static async findConnections(field1Entities: any[], field2Entities: any[]): Promise<Array<{
    connection: string,
    significance: number,
    explanation: string,
    suggestedResearch: string
  }>> {
    const connectionPrompt = PromptTemplate.fromTemplate(`
      Find non-obvious connections between these entities from different research fields:
      
      Field 1 Entities: {field1Entities}
      Field 2 Entities: {field2Entities}
      
      Identify:
      1. Unexpected similarities or shared mechanisms
      2. Potential cross-field applications
      3. Novel research opportunities
      
      Respond with JSON array:
      [{{
        "connection": "brief connection description",
        "significance": 0.0-1.0,
        "explanation": "detailed explanation",
        "suggestedResearch": "research direction suggestion"
      }}]
    `)

    const field1Text = field1Entities.map(e => `${e.name} (${e.type})`).join(', ')
    const field2Text = field2Entities.map(e => `${e.name} (${e.type})`).join(', ')

    const chain = connectionPrompt.pipe(getLLM()).pipe(new StringOutputParser())
    
    try {
      const result = await chain.invoke({ 
        field1Entities: field1Text,
        field2Entities: field2Text
      })
      return JSON.parse(result)
    } catch (error) {
      console.error('Connection finding error:', error)
      return []
    }
  }
}

export { getLLM as llm }