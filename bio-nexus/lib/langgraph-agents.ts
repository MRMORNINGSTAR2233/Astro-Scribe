import { StateGraph, END, START } from '@langchain/langgraph'
import { ChatGroq } from '@langchain/groq'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { BaseMessage } from '@langchain/core/messages'

// Define simpler state interface
interface AgentState {
  messages: BaseMessage[]
  query: string
  context: Record<string, any>
  result: any
  confidence: number
  reasoning: string
}

// Lazy initialization of Groq LLM
let groqLLM: ChatGroq | null = null

function getGroqLLM(): ChatGroq {
  if (!groqLLM) {
    groqLLM = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 4096,
    })
  }
  return groqLLM
}

/**
 * Research Query Classification Agent
 * Determines the intent and routing for research queries
 */
export class QueryClassificationAgent {
  private async analyzeQuery(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `You are a NASA bioscience research query analyzer. 
    Analyze the user's query to understand its scientific context and complexity.
    
    Consider:
    1. Scientific domains involved (biology, medicine, space science, etc.)
    2. Query complexity level (simple lookup vs complex analysis)
    3. Required data types (papers, experiments, hypotheses)
    4. Temporal aspects (recent research vs historical analysis)
    
    Provide a detailed analysis of the query's scientific intent.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze this research query: "${state.query}"`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, ...messages, response],
      context: { 
        ...state.context, 
        analysis: response.content,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async classifyIntent(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Based on the query analysis, classify the user's intent into one of these categories:
    
    1. LITERATURE_SEARCH - Finding specific papers or research
    2. HYPOTHESIS_GENERATION - Creating new research hypotheses
    3. MISSION_RISK_ANALYSIS - Assessing risks for space missions
    4. TREND_ANALYSIS - Understanding research trends and patterns
    5. COMPARATIVE_ANALYSIS - Comparing different studies or approaches
    6. EXPERIMENTAL_DESIGN - Designing new experiments
    
    Respond with just the category name and confidence score (0-1).`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Query: "${state.query}"\nAnalysis: ${state.context.analysis}`)
    ]

    const response = await getGroqLLM().invoke(messages)
    const content = response.content as string
    
    // Extract intent and confidence
    const lines = content.split('\n')
    const intent = lines[0]?.trim() || 'LITERATURE_SEARCH'
    const confidenceMatch = content.match(/confidence:?\s*([\d.]+)/i)
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8

    return {
      messages: [...state.messages, response],
      context: { 
        ...state.context, 
        intent,
        intentConfidence: confidence
      },
      confidence
    }
  }

  private async extractEntities(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Extract key scientific entities from the research query:
    
    Extract and categorize:
    1. BIOLOGICAL_ENTITIES: organisms, genes, proteins, cells, tissues
    2. MEDICAL_CONDITIONS: diseases, symptoms, treatments
    3. SPACE_CONDITIONS: microgravity, radiation, isolation
    4. RESEARCH_METHODS: techniques, instruments, protocols
    5. TEMPORAL_REFERENCES: time periods, durations
    6. QUANTITATIVE_MEASURES: metrics, measurements, statistics
    
    Return as JSON format with entity categories and confidence scores.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Extract entities from: "${state.query}"`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    try {
      const entities = JSON.parse(response.content as string)
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          entities,
          entityExtractionComplete: true
        }
      }
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          entities: { raw: response.content },
          entityExtractionComplete: false
        }
      }
    }
  }

  private async determineRouting(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Based on the intent classification and extracted entities, 
    determine the optimal routing strategy for this research query:
    
    Routing Options:
    1. VECTOR_SEARCH - Use embeddings for semantic similarity
    2. GRAPH_TRAVERSAL - Use knowledge graph relationships
    3. HYBRID_SEARCH - Combine vector and graph approaches
    4. AI_ANALYSIS - Route to specialized AI agents
    5. DATABASE_QUERY - Direct database queries
    
    Also determine required data sources and processing priority.
    Return as structured JSON with routing decision and reasoning.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        Query: "${state.query}"
        Intent: ${state.context.intent}
        Entities: ${JSON.stringify(state.context.entities)}
        
        Determine optimal routing strategy.
      `)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    try {
      const routing = JSON.parse(response.content as string)
      return {
        messages: [...state.messages, response],
        result: routing,
        context: { 
          ...state.context, 
          routing,
          processingComplete: true
        },
        reasoning: routing.reasoning || 'Routing determined based on query analysis'
      }
    } catch (error) {
      // Fallback routing
      const fallbackRouting = {
        strategy: 'HYBRID_SEARCH',
        priority: 'medium',
        dataSources: ['papers', 'embeddings'],
        reasoning: 'Fallback to hybrid search approach'
      }
      
      return {
        messages: [...state.messages, response],
        result: fallbackRouting,
        context: { 
          ...state.context, 
          routing: fallbackRouting,
          processingComplete: true
        },
        reasoning: fallbackRouting.reasoning
      }
    }
  }

  async process(query: string): Promise<{
    intent: string
    entities: any
    routing: any
    confidence: number
    reasoning: string
  }> {
    // Sequential processing without LangGraph for now
    let state: AgentState = {
      messages: [],
      query,
      context: {},
      result: null,
      confidence: 0,
      reasoning: ''
    }

    // Step 1: Analyze query
    const analyzed = await this.analyzeQuery(state)
    state = { ...state, ...analyzed }

    // Step 2: Classify intent
    const classified = await this.classifyIntent(state)
    state = { ...state, ...classified }

    // Step 3: Extract entities
    const entitiesExtracted = await this.extractEntities(state)
    state = { ...state, ...entitiesExtracted }

    // Step 4: Determine routing
    const routed = await this.determineRouting(state)
    state = { ...state, ...routed }
    
    return {
      intent: state.context.intent || 'LITERATURE_SEARCH',
      entities: state.context.entities || {},
      routing: state.result || {},
      confidence: state.confidence || 0.8,
      reasoning: state.reasoning || 'Query processed successfully'
    }
  }
}

/**
 * Hypothesis Generation Agent
 * Creates testable research hypotheses from literature analysis
 */
export class HypothesisGenerationAgent {
  private async analyzeLiterature(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `You are a NASA bioscience research analyst. 
    Analyze the provided research papers to understand:
    
    1. Current scientific consensus
    2. Methodology patterns and trends
    3. Conflicting results or controversies
    4. Experimental approaches used
    5. Limitations acknowledged by authors
    
    Focus on space-related bioscience implications.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze these research findings: ${JSON.stringify(state.context.papers || [])}`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, ...messages, response],
      context: { 
        ...state.context, 
        literatureAnalysis: response.content,
        analysisComplete: true
      }
    }
  }

  private async identifyGaps(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Based on the literature analysis, identify research gaps and opportunities:
    
    Look for:
    1. Unstudied populations or conditions
    2. Methodological limitations
    3. Contradictory findings requiring resolution
    4. Space-specific conditions not adequately addressed
    5. Technological capabilities that enable new studies
    6. Interdisciplinary connections not explored
    
    Prioritize gaps most relevant to NASA's mission needs.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Literature analysis: ${state.context.literatureAnalysis}`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, response],
      context: { 
        ...state.context, 
        identifiedGaps: response.content,
        gapAnalysisComplete: true
      }
    }
  }

  private async generateHypotheses(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Generate 3-5 testable research hypotheses based on the identified gaps:
    
    Each hypothesis should:
    1. Be specific and measurable
    2. Address a significant research gap
    3. Be feasible with current or near-future technology
    4. Have relevance to space exploration
    5. Include proposed experimental approach
    
    Format as JSON array with hypothesis, rationale, and experimental design.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        Literature Analysis: ${state.context.literatureAnalysis}
        Identified Gaps: ${state.context.identifiedGaps}
        
        Generate testable hypotheses addressing these gaps.
      `)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    try {
      const hypotheses = JSON.parse(response.content as string)
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          generatedHypotheses: hypotheses,
          hypothesisCount: hypotheses.length
        }
      }
    } catch (error) {
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          generatedHypotheses: { raw: response.content },
          hypothesisCount: 0
        }
      }
    }
  }

  private async validateHypotheses(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Validate and rank the generated hypotheses based on:
    
    1. Scientific rigor and testability
    2. Novelty and potential impact
    3. Feasibility for space-based research
    4. Resource requirements
    5. Timeline for investigation
    
    Provide ranking with scores and recommendations for refinement.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Validate these hypotheses: ${JSON.stringify(state.context.generatedHypotheses)}`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, response],
      result: {
        hypotheses: state.context.generatedHypotheses,
        validation: response.content,
        confidence: 0.8
      },
      context: { 
        ...state.context, 
        validation: response.content,
        processingComplete: true
      },
      reasoning: 'Hypotheses generated and validated based on literature gaps'
    }
  }

  async process(papers: any[], context: any = {}): Promise<{
    hypotheses: any[]
    validation: string
    confidence: number
    reasoning: string
  }> {
    let state: AgentState = {
      messages: [],
      query: '',
      context: { papers, ...context },
      result: null,
      confidence: 0,
      reasoning: ''
    }

    // Sequential processing
    const analyzed = await this.analyzeLiterature(state)
    state = { ...state, ...analyzed }

    const gapsIdentified = await this.identifyGaps(state)
    state = { ...state, ...gapsIdentified }

    const hypothesesGenerated = await this.generateHypotheses(state)
    state = { ...state, ...hypothesesGenerated }

    const validated = await this.validateHypotheses(state)
    state = { ...state, ...validated }
    
    return {
      hypotheses: (state.result as any)?.hypotheses || [],
      validation: (state.result as any)?.validation || '',
      confidence: state.confidence || 0.8,
      reasoning: state.reasoning || 'Hypotheses generated successfully'
    }
  }
}

/**
 * Mission Risk Assessment Agent
 * Analyzes mission profiles against bioscience research to predict risks
 */
export class MissionRiskAgent {
  private async analyzeMissionProfile(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Analyze the mission profile for bioscience risk factors:
    
    Consider:
    1. Mission duration and its physiological impacts
    2. Crew size and social/psychological factors
    3. Destination environment (radiation, gravity, etc.)
    4. Available medical resources and capabilities
    5. Emergency response limitations
    6. Communication delays with Earth
    
    Identify key risk categories relevant to human health and performance.`

    const missionProfile = state.context.missionProfile || {}
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze mission profile: ${JSON.stringify(missionProfile)}`)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, ...messages, response],
      context: { 
        ...state.context, 
        missionAnalysis: response.content,
        analysisComplete: true
      }
    }
  }

  private async identifyBioscienceRisks(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Based on the mission analysis and available research data, 
    identify specific bioscience risks:
    
    Risk Categories:
    1. PHYSIOLOGICAL - bone loss, muscle atrophy, cardiovascular changes
    2. PSYCHOLOGICAL - isolation, confinement, stress
    3. RADIATION - cosmic rays, solar events
    4. NUTRITIONAL - food security, nutrient deficiencies
    5. INFECTIOUS - microbial changes, immune suppression
    6. ENVIRONMENTAL - air quality, temperature, humidity
    
    Reference relevant research papers to support risk identification.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        Mission Analysis: ${state.context.missionAnalysis}
        Available Research: ${JSON.stringify(state.context.researchData || [])}
        
        Identify specific bioscience risks for this mission.
      `)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, response],
      context: { 
        ...state.context, 
        identifiedRisks: response.content,
        riskIdentificationComplete: true
      }
    }
  }

  private async assessRiskSeverity(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Assess the severity and probability of each identified risk:
    
    For each risk, provide:
    1. Probability score (0-1)
    2. Impact severity (1-5 scale)
    3. Risk score (probability × impact)
    4. Time to onset (immediate, weeks, months, years)
    5. Evidence strength (high, medium, low)
    
    Consider mission-specific factors and available countermeasures.
    Return as structured JSON with detailed risk assessments.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        Identified Risks: ${state.context.identifiedRisks}
        Mission Profile: ${JSON.stringify(state.context.missionProfile)}
        
        Assess severity and probability for each risk.
      `)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    try {
      const riskAssessment = JSON.parse(response.content as string)
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          riskAssessment,
          assessmentComplete: true
        }
      }
    } catch (error) {
      return {
        messages: [...state.messages, response],
        context: { 
          ...state.context, 
          riskAssessment: { raw: response.content },
          assessmentComplete: false
        }
      }
    }
  }

  private async recommendMitigations(state: AgentState): Promise<Partial<AgentState>> {
    const systemPrompt = `Recommend evidence-based mitigation strategies for the assessed risks:
    
    For each high-priority risk, provide:
    1. Preventive measures (before/during mission)
    2. Monitoring protocols
    3. Intervention strategies
    4. Required resources and equipment
    5. Research gaps requiring further study
    
    Prioritize by risk score and feasibility of implementation.`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        Risk Assessment: ${JSON.stringify(state.context.riskAssessment)}
        Mission Constraints: ${JSON.stringify(state.context.missionProfile)}
        
        Recommend comprehensive mitigation strategies.
      `)
    ]

    const response = await getGroqLLM().invoke(messages)
    
    return {
      messages: [...state.messages, response],
      result: {
        riskAssessment: state.context.riskAssessment,
        mitigations: response.content,
        confidence: 0.85
      },
      context: { 
        ...state.context, 
        mitigations: response.content,
        processingComplete: true
      },
      reasoning: 'Risk assessment completed with evidence-based mitigation recommendations'
    }
  }

  async process(missionProfile: any, researchData: any[] = []): Promise<{
    riskAssessment: any
    mitigations: string
    confidence: number
    reasoning: string
  }> {
    let state: AgentState = {
      messages: [],
      query: '',
      context: { missionProfile, researchData },
      result: null,
      confidence: 0,
      reasoning: ''
    }

    // Sequential processing
    const analyzed = await this.analyzeMissionProfile(state)
    state = { ...state, ...analyzed }

    const risksIdentified = await this.identifyBioscienceRisks(state)
    state = { ...state, ...risksIdentified }

    const severityAssessed = await this.assessRiskSeverity(state)
    state = { ...state, ...severityAssessed }

    const mitigationsRecommended = await this.recommendMitigations(state)
    state = { ...state, ...mitigationsRecommended }
    
    return {
      riskAssessment: (state.result as any)?.riskAssessment || {},
      mitigations: (state.result as any)?.mitigations || '',
      confidence: state.confidence || 0.85,
      reasoning: state.reasoning || 'Risk assessment completed successfully'
    }
  }
}

// Export agent instances
export const queryClassificationAgent = new QueryClassificationAgent()
export const hypothesisGenerationAgent = new HypothesisGenerationAgent()
export const missionRiskAgent = new MissionRiskAgent()