import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, TypedDict, Annotated, Literal
from dataclasses import dataclass
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
import google.generativeai as genai
import streamlit as st
from langgraph.graph import StateGraph, END, START
import operator

# Constants
DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'llama-3.3-70b-versatile')

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    messages: List[BaseMessage]
    next: str
    documents: List[Dict]
    kg_context: List[Dict]
    analysis: Dict
    response: str

@dataclass
class SearchQuery:
    query: str
    query_type: str  # 'factual', 'analytical', 'comparative', 'procedural'
    context: Dict[str, Any] = None
    constraints: Dict[str, Any] = None

class NASAResearchAgents:
    def __init__(self):
        self.llm = self._initialize_llm()
        self.graph = self._create_agent_graph()
        self._initialize_gemini()

    def _initialize_llm(self):
        """Initialize Groq LLM"""
        try:
            api_key = os.getenv('GROQ_API_KEY')
            if api_key:
                return ChatGroq(
                    groq_api_key=api_key,
                    model_name=DEFAULT_MODEL,
                    temperature=0.1,
                    max_tokens=2000
                )
            return None
        except Exception as e:
            logger.error(f"Error initializing Groq: {e}")
            return None

    def _initialize_gemini(self):
        """Initialize Gemini client"""
        try:
            api_key = os.getenv('GOOGLE_API_KEY')
            if api_key:
                genai.configure(api_key=api_key)
                return genai
            return None
        except Exception as e:
            logger.error(f"Error initializing Gemini: {e}")
            return None
    def _create_agent_graph(self):
        """Create the LangGraph for NASA research agents"""
        
        if not self.llm:
            logger.error("LLM not initialized, cannot create agent graph")
            return None
            
        # Define agent functions
        def search_agent(state: Dict) -> Dict:
            """Search specialist that finds relevant documents"""
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert at searching through NASA's vast repository of research documents. 
                You understand scientific terminology, research methodologies, and can identify the most relevant 
                documents based on user queries. You excel at semantic search and can understand the context 
                behind research questions.
                
                Analyze the provided documents and identify the most relevant ones."""),
                ("human", "{query}"),
                ("human", "Available documents: {documents}")
            ])
            
            messages = prompt.format_messages(
                query=state["messages"][-1].content,
                documents=state["documents"]
            )
            response = self.llm.invoke(messages)
            state["messages"].append(response)
            return state
        
        def analysis_agent(state: Dict) -> Dict:
            """Data analysis expert that processes document contents"""
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a seasoned NASA researcher with expertise in space biology, microgravity 
                effects, and space exploration technologies. You can analyze complex research data, identify 
                patterns, and synthesize information from multiple sources to provide comprehensive insights.
                
                Analyze the search results and extract key findings."""),
                ("human", "{context}"),
                ("human", "Knowledge graph context: {kg_context}")
            ])
            
            context = "\n".join([msg.content for msg in state["messages"]])
            messages = prompt.format_messages(
                context=context,
                kg_context=state["kg_context"]
            )
            response = self.llm.invoke(messages)
            state["messages"].append(response)
            state["analysis"] = {"findings": response.content}
            return state
            
        def synthesis_agent(state: Dict) -> Dict:
            """Research synthesis specialist that combines findings"""
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert at combining information from multiple research sources to 
                create comprehensive, well-structured answers. You understand how to present complex 
                scientific information in an accessible way while maintaining accuracy and citing sources.
                
                Synthesize the analyzed findings into a coherent answer."""),
                ("human", "Analysis results: {analysis}"),
                ("human", "Original query: {query}")
            ])
            
            messages = prompt.format_messages(
                analysis=state["analysis"]["findings"],
                query=state["messages"][0].content
            )
            response = self.llm.invoke(messages)
            state["messages"].append(response)
            state["response"] = response.content
            return state
            
        def fact_checker(state: Dict) -> Dict:
            """Fact checker that verifies the synthesized answer"""
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a meticulous fact checker with deep knowledge of NASA research standards 
                and scientific methodology. You ensure all claims are properly supported by evidence and 
                that citations are accurate and relevant.
                
                Verify the accuracy of the synthesized answer."""),
                ("human", "Synthesized answer: {response}"),
                ("human", "Available evidence: {documents}")
            ])
            
            messages = prompt.format_messages(
                response=state["response"],
                documents=state["documents"]
            )
            response = self.llm.invoke(messages)
            state["messages"].append(response)
            return state
            
        # Create the workflow graph
        workflow = StateGraph(Dict)
        
        # Add nodes
        workflow.add_node("search", search_agent)
        workflow.add_node("analyze", analysis_agent)
        workflow.add_node("synthesize", synthesis_agent)
        workflow.add_node("verify", fact_checker)
        
        # Add edges - START defines the entry point
        workflow.add_edge(START, "search")
        workflow.add_edge("search", "analyze")
        workflow.add_edge("analyze", "synthesize")
        workflow.add_edge("synthesize", "verify")
        workflow.add_edge("verify", END)
        
        # Compile the graph
        return workflow.compile()
        
    def execute_search(self, query: SearchQuery, relevant_docs: List[Dict], kg_context: List[Dict]) -> Dict[str, Any]:
        """Execute the LangGraph-based search process"""
        try:
            if not self.graph:
                logger.error("Agent graph not initialized")
                return {
                    'status': 'error',
                    'error': 'Agent graph not initialized',
                    'query': query.query
                }
                
            # Initialize state
            initial_state = {
                "messages": [HumanMessage(content=query.query)],
                "next": "search",
                "documents": relevant_docs,
                "kg_context": kg_context,
                "analysis": {},
                "response": ""
            }
            
            # Execute the graph
            final_state = self.graph.invoke(initial_state)
            
            # Extract final response
            return {
                'status': 'success',
                'result': final_state.get("response", "No response generated"),
                'query': query.query,
                'num_docs_analyzed': len(relevant_docs),
                'kg_entities_considered': len(kg_context),
                'conversation_history': [msg.content for msg in final_state.get("messages", [])]
            }
            
        except Exception as e:
            logger.error(f"Error in LangGraph execution: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'query': query.query
            }
    
    def classify_query(self, query_text: str) -> SearchQuery:
        """Classify the query type and extract context"""
        try:
            if not self.llm:
                return SearchQuery(query=query_text, query_type='factual')
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a query classification specialist. Analyze the NASA research query 
                and identify its type and specific constraints. Return the analysis in JSON format."""),
                ("human", """Classify this query: "{query}"
                
                Types:
                - factual: Asking for specific facts, data, or information
                - analytical: Requesting analysis, interpretation, or comparison
                - comparative: Comparing different studies, methods, or findings
                - procedural: Asking about methods, procedures, or how things work
                
                Also identify:
                - Key concepts/entities mentioned
                - Time constraints
                - Scope constraints
                - Output preferences
                
                Return as JSON:
                {{
                    "query_type": "type",
                    "key_concepts": ["concept1", "concept2"],
                    "constraints": {{
                        "time_period": "if specified",
                        "scope": "if specified",
                        "format": "if specified"
                    }}
                }}""")
            ])
            
            messages = prompt.format_messages(query=query_text)
            response = self.llm.invoke(messages)
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                classification = json.loads(json_match.group())
                return SearchQuery(
                    query=query_text,
                    query_type=classification.get('query_type', 'factual'),
                    context={'key_concepts': classification.get('key_concepts', [])},
                    constraints=classification.get('constraints', {})
                )
            
            return SearchQuery(query=query_text, query_type='factual')
            
        except Exception as e:
            logger.error(f"Error classifying query: {e}")
            return SearchQuery(query=query_text, query_type='factual')
    
    def generate_follow_up_questions(self, query: str, answer: str) -> List[str]:
        """Generate relevant follow-up questions based on the query and answer"""
        try:
            if not self.llm:
                return []
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a research question generator. Generate follow-up questions based on 
                the original query and answer. Return the questions in JSON array format."""),
                ("human", """Generate 3-5 follow-up questions for:
                
                Original Query: "{query}"
                Answer Summary: {answer}
                
                Questions should:
                - Explore uncovered aspects
                - Dig deeper into findings
                - Connect to broader implications
                - Suggest comparative angles
                
                Return as JSON array:
                ["question 1", "question 2", "question 3"]""")
            ])
            
            messages = prompt.format_messages(
                query=query,
                answer=answer[:1000]
            )
            response = self.llm.invoke(messages)
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', response.content, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
                return questions[:5]  # Limit to 5 questions
            
            return []
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            return []

# Initialize NASA agents
@st.cache_resource
def get_nasa_agents():
    return NASAResearchAgents()