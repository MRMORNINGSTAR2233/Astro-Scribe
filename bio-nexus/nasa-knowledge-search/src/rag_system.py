import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from src.database import get_database_manager
from src.neo4j_manager import get_neo4j_manager
from src.document_processor import get_document_processor
from src.agents import get_nasa_agents, SearchQuery
import streamlit as st

logger = logging.getLogger(__name__)

class RAGSystem:
    def __init__(self):
        self.db_manager = get_database_manager()
        self.neo4j_manager = get_neo4j_manager()
        self.doc_processor = get_document_processor()
        self.agents = get_nasa_agents()
        self.similarity_threshold = 0.7
    
    def search_documents(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for relevant documents using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = self.doc_processor.generate_embeddings(query)
            if not query_embedding:
                return []
            
            # Search similar documents
            similar_docs = self.db_manager.search_similar_documents(query_embedding, limit)
            
            # Filter by similarity threshold
            filtered_docs = [
                doc for doc in similar_docs 
                if doc.get('similarity', 0) >= self.similarity_threshold
            ]
            
            return filtered_docs
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    def search_chunks(self, query: str, limit: int = 20) -> List[Dict]:
        """Search for relevant document chunks using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = self.doc_processor.generate_embeddings(query)
            if not query_embedding:
                return []
            
            # Search similar chunks
            similar_chunks = self.db_manager.search_similar_chunks(query_embedding, limit)
            
            # Filter by similarity threshold
            filtered_chunks = [
                chunk for chunk in similar_chunks 
                if chunk.get('similarity', 0) >= self.similarity_threshold
            ]
            
            return filtered_chunks
            
        except Exception as e:
            logger.error(f"Error searching chunks: {e}")
            return []
    
    def search_knowledge_graph(self, query: str) -> List[Dict]:
        """Search the knowledge graph for relevant entities and relationships"""
        try:
            if not self.neo4j_manager.driver:
                return []
            
            # Search for entities matching the query
            entities = self.neo4j_manager.search_graph(query, limit=20)
            
            # Get relationships for found entities
            kg_context = []
            for entity in entities:
                if entity['type'] == 'entity':
                    entity_id = entity['data'].get('id')
                    if entity_id:
                        relationships = self.neo4j_manager.get_entity_relationships(entity_id)
                        kg_context.extend(relationships)
            
            return kg_context
            
        except Exception as e:
            logger.error(f"Error searching knowledge graph: {e}")
            return []
    
    def hybrid_search(self, query: str, include_kg: bool = True) -> Dict[str, Any]:
        """Perform hybrid search combining document similarity and knowledge graph"""
        try:
            # Search documents and chunks
            relevant_docs = self.search_documents(query, limit=10)
            relevant_chunks = self.search_chunks(query, limit=20)
            
            # Search knowledge graph if enabled
            kg_context = []
            if include_kg:
                kg_context = self.search_knowledge_graph(query)
            
            # Combine and rank results
            combined_results = self._combine_search_results(
                relevant_docs, relevant_chunks, kg_context, query
            )
            
            return {
                'documents': relevant_docs,
                'chunks': relevant_chunks,
                'knowledge_graph': kg_context,
                'combined_results': combined_results,
                'query': query
            }
            
        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            return {
                'documents': [],
                'chunks': [],
                'knowledge_graph': [],
                'combined_results': [],
                'query': query,
                'error': str(e)
            }
    
    def _combine_search_results(self, docs: List[Dict], chunks: List[Dict], 
                               kg_context: List[Dict], query: str) -> List[Dict]:
        """Combine and rank search results from different sources"""
        combined = []
        
        # Add document results
        for doc in docs:
            combined.append({
                'type': 'document',
                'source': 'vector_search',
                'data': doc,
                'relevance_score': doc.get('similarity', 0),
                'title': doc.get('title', doc.get('filename', 'Unknown'))
            })
        
        # Add chunk results
        for chunk in chunks:
            combined.append({
                'type': 'chunk',
                'source': 'vector_search',
                'data': chunk,
                'relevance_score': chunk.get('similarity', 0),
                'title': f"{chunk.get('filename', 'Unknown')} (chunk {chunk.get('chunk_index', 0)})"
            })
        
        # Add knowledge graph results
        for kg_item in kg_context:
            combined.append({
                'type': 'knowledge_graph',
                'source': 'graph_search',
                'data': kg_item,
                'relevance_score': 0.5,  # Default score for KG items
                'title': f"KG: {kg_item.get('source', {}).get('name', 'Unknown relationship')}"
            })
        
        # Sort by relevance score
        combined.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return combined
    
    def generate_answer(self, query: str, search_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an answer using the multi-agent system"""
        try:
            # Classify the query
            search_query = self.agents.classify_query(query)
            
            # Prepare context for agents
            relevant_docs = search_results.get('documents', [])
            kg_context = search_results.get('knowledge_graph', [])
            
            # Execute multi-agent search
            agent_result = self.agents.execute_search(search_query, relevant_docs, kg_context)
            
            if agent_result['status'] == 'success':
                answer = agent_result['result']
                
                # Generate follow-up questions
                follow_ups = self.agents.generate_follow_up_questions(query, str(answer))
                
                return {
                    'answer': answer,
                    'sources': self._extract_sources(search_results),
                    'follow_up_questions': follow_ups,
                    'query_type': search_query.query_type,
                    'confidence': self._calculate_confidence(search_results)
                }
            else:
                return {
                    'answer': f"I encountered an error while processing your query: {agent_result.get('error', 'Unknown error')}",
                    'sources': [],
                    'follow_up_questions': [],
                    'query_type': search_query.query_type,
                    'confidence': 0.0
                }
                
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return {
                'answer': f"I'm sorry, I encountered an error while processing your query: {str(e)}",
                'sources': [],
                'follow_up_questions': [],
                'query_type': 'unknown',
                'confidence': 0.0
            }
    
    def _extract_sources(self, search_results: Dict[str, Any]) -> List[Dict]:
        """Extract source information from search results"""
        sources = []
        
        # Extract from documents
        for doc in search_results.get('documents', []):
            sources.append({
                'type': 'document',
                'title': doc.get('title', doc.get('filename', 'Unknown')),
                'filename': doc.get('filename', 'Unknown'),
                'similarity': doc.get('similarity', 0),
                'id': doc.get('id')
            })
        
        # Extract from chunks
        for chunk in search_results.get('chunks', []):
            sources.append({
                'type': 'chunk',
                'title': chunk.get('title', chunk.get('filename', 'Unknown')),
                'filename': chunk.get('filename', 'Unknown'),
                'chunk_index': chunk.get('chunk_index', 0),
                'similarity': chunk.get('similarity', 0),
                'id': chunk.get('id')
            })
        
        return sources[:10]  # Limit to top 10 sources
    
    def _calculate_confidence(self, search_results: Dict[str, Any]) -> float:
        """Calculate confidence score based on search results quality"""
        try:
            docs = search_results.get('documents', [])
            chunks = search_results.get('chunks', [])
            
            if not docs and not chunks:
                return 0.0
            
            # Calculate average similarity scores
            doc_similarities = [doc.get('similarity', 0) for doc in docs]
            chunk_similarities = [chunk.get('similarity', 0) for chunk in chunks]
            
            all_similarities = doc_similarities + chunk_similarities
            
            if not all_similarities:
                return 0.0
            
            avg_similarity = sum(all_similarities) / len(all_similarities)
            
            # Boost confidence if we have multiple good sources
            num_good_sources = len([s for s in all_similarities if s > 0.8])
            source_bonus = min(num_good_sources * 0.1, 0.3)
            
            confidence = min(avg_similarity + source_bonus, 1.0)
            return round(confidence, 2)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {e}")
            return 0.5
    
    def ask_question(self, query: str, session_id: str = None) -> Dict[str, Any]:
        """Main method to ask a question and get a comprehensive answer"""
        try:
            # Perform hybrid search
            search_results = self.hybrid_search(query, include_kg=True)
            
            # Generate answer using agents
            answer_data = self.generate_answer(query, search_results)
            
            # Store in chat session if provided
            if session_id:
                self.db_manager.add_chat_message(
                    session_id, 'user', query
                )
                self.db_manager.add_chat_message(
                    session_id, 'assistant', 
                    answer_data['answer'], 
                    answer_data['sources']
                )
            
            return {
                'query': query,
                'answer': answer_data['answer'],
                'sources': answer_data['sources'],
                'follow_up_questions': answer_data['follow_up_questions'],
                'confidence': answer_data['confidence'],
                'query_type': answer_data['query_type'],
                'num_sources': len(answer_data['sources']),
                'search_results': search_results
            }
            
        except Exception as e:
            logger.error(f"Error in ask_question: {e}")
            return {
                'query': query,
                'answer': f"I'm sorry, I encountered an error: {str(e)}",
                'sources': [],
                'follow_up_questions': [],
                'confidence': 0.0,
                'query_type': 'error',
                'num_sources': 0,
                'search_results': {}
            }
    
    def get_related_topics(self, query: str, limit: int = 5) -> List[str]:
        """Get related topics based on knowledge graph exploration"""
        try:
            # Search knowledge graph for related entities
            kg_results = self.search_knowledge_graph(query)
            
            related_topics = set()
            
            for item in kg_results:
                if 'source' in item and 'name' in item['source']:
                    related_topics.add(item['source']['name'])
                if 'target' in item and 'name' in item['target']:
                    related_topics.add(item['target']['name'])
            
            return list(related_topics)[:limit]
            
        except Exception as e:
            logger.error(f"Error getting related topics: {e}")
            return []
    
    def suggest_questions(self, domain: str = None) -> List[str]:
        """Suggest interesting questions based on the knowledge base"""
        suggestions = [
            "What are the effects of microgravity on human bone density?",
            "How does spaceflight affect the immune system?",
            "What are the key findings from the ISS plant growth experiments?",
            "How do organisms adapt to the space environment?",
            "What are the main challenges for long-duration space missions?",
            "How does radiation exposure affect astronauts?",
            "What countermeasures are being developed for space-induced health effects?",
            "What role do microorganisms play in space environments?",
            "How does muscle atrophy occur in microgravity?",
            "What are the psychological effects of space travel?"
        ]
        
        if domain:
            # Could filter suggestions based on domain
            pass
        
        return suggestions

# Initialize RAG system
@st.cache_resource
def get_rag_system():
    return RAGSystem()