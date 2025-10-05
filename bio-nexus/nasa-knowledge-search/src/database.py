import os
import psycopg2
from psycopg2.extras import RealDictCursor
import streamlit as st
from typing import List, Dict, Any, Optional
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.connection_params = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'database': os.getenv('POSTGRES_DB', 'nasa_knowledge'),
            'user': os.getenv('POSTGRES_USER', 'nasa_user'),
            'password': os.getenv('POSTGRES_PASSWORD', 'nasa_password')
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True) -> List[Dict]:
        """Execute a query and return results"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                if fetch:
                    return [dict(row) for row in cursor.fetchall()]
                conn.commit()
                return []
    
    def insert_document(self, document_data: Dict) -> str:
        """Insert a new document and return its ID"""
        
        # Validate and clean embedding data
        embedding = document_data.get('embedding')
        if embedding is not None:
            # Check if embedding is valid
            if isinstance(embedding, (list, dict)) and not embedding:
                # Empty list or dict, set to None
                document_data['embedding'] = None
                logger.warning("Empty embedding detected, setting to NULL")
            elif isinstance(embedding, str):
                # Ensure it's a proper vector format
                if not (embedding.startswith('[') and embedding.endswith(']')):
                    document_data['embedding'] = None
                    logger.warning(f"Invalid embedding format: {embedding[:50]}..., setting to NULL")
            elif not isinstance(embedding, str):
                # Not a string, convert to proper format or set to None
                document_data['embedding'] = None
                logger.warning(f"Invalid embedding type: {type(embedding)}, setting to NULL")
        
        query = """
        INSERT INTO documents (filename, title, content, summary, file_type, file_size, metadata, embedding)
        VALUES (%(filename)s, %(title)s, %(content)s, %(summary)s, %(file_type)s, %(file_size)s, %(metadata)s, %(embedding)s)
        RETURNING id
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, document_data)
                document_id = cursor.fetchone()[0]
                conn.commit()
                return str(document_id)
    
    def insert_document_chunk(self, chunk_data: Dict) -> str:
        """Insert a document chunk and return its ID"""
        
        # Validate and clean embedding data
        embedding = chunk_data.get('embedding')
        if embedding is not None:
            # Check if embedding is valid
            if isinstance(embedding, (list, dict)) and not embedding:
                # Empty list or dict, set to None
                chunk_data['embedding'] = None
                logger.warning("Empty chunk embedding detected, setting to NULL")
            elif isinstance(embedding, str):
                # Ensure it's a proper vector format
                if not (embedding.startswith('[') and embedding.endswith(']')):
                    chunk_data['embedding'] = None
                    logger.warning(f"Invalid chunk embedding format: {embedding[:50]}..., setting to NULL")
            elif not isinstance(embedding, str):
                # Not a string, convert to proper format or set to None
                chunk_data['embedding'] = None
                logger.warning(f"Invalid chunk embedding type: {type(embedding)}, setting to NULL")
        
        query = """
        INSERT INTO document_chunks (document_id, chunk_index, content, chunk_type, page_number, embedding, metadata)
        VALUES (%(document_id)s, %(chunk_index)s, %(content)s, %(chunk_type)s, %(page_number)s, %(embedding)s, %(metadata)s)
        RETURNING id
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, chunk_data)
                chunk_id = cursor.fetchone()[0]
                conn.commit()
                return str(chunk_id)
    
    def search_similar_documents(self, query_embedding: List[float], limit: int = 10) -> List[Dict]:
        """Search for similar documents using vector similarity"""
        query = """
        SELECT d.*, 1 - (d.embedding <=> %s) as similarity
        FROM documents d
        WHERE d.embedding IS NOT NULL
        ORDER BY d.embedding <=> %s
        LIMIT %s
        """
        
        embedding_str = f"[{','.join(map(str, query_embedding))}]"
        return self.execute_query(query, (embedding_str, embedding_str, limit))
    
    def search_similar_chunks(self, query_embedding: List[float], limit: int = 20) -> List[Dict]:
        """Search for similar document chunks using vector similarity"""
        query = """
        SELECT dc.*, d.filename, d.title, 1 - (dc.embedding <=> %s) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> %s
        LIMIT %s
        """
        
        embedding_str = f"[{','.join(map(str, query_embedding))}]"
        return self.execute_query(query, (embedding_str, embedding_str, limit))
    
    def get_all_documents(self) -> List[Dict]:
        """Get all documents with basic info"""
        query = """
        SELECT id, filename, title, file_type, file_size, upload_date, 
               CASE WHEN processed_date IS NOT NULL THEN true ELSE false END as processed
        FROM documents
        ORDER BY upload_date DESC
        """
        return self.execute_query(query)
    
    def get_document_by_id(self, document_id: str) -> Optional[Dict]:
        """Get a specific document by ID"""
        query = "SELECT * FROM documents WHERE id = %s"
        results = self.execute_query(query, (document_id,))
        return results[0] if results else None
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and its chunks"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Delete chunks first (foreign key constraint)
                    cursor.execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))
                    # Delete document
                    cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            return False
    
    def create_chat_session(self, session_name: str = None) -> str:
        """Create a new chat session"""
        query = """
        INSERT INTO chat_sessions (session_name)
        VALUES (COALESCE(%s, 'Chat Session'))
        RETURNING id
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (session_name,))
                session_id = cursor.fetchone()[0]
                conn.commit()
                return str(session_id)
    
    def get_chat_sessions(self) -> List[Dict]:
        """Get all chat sessions"""
        query = """
        SELECT cs.*, 
               COUNT(cm.id) as message_count,
               MAX(cm.timestamp) as last_message_time
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY cs.id
        ORDER BY cs.last_updated DESC
        """
        return self.execute_query(query)
    
    def get_chat_messages(self, session_id: str) -> List[Dict]:
        """Get all messages for a chat session"""
        query = """
        SELECT * FROM chat_messages 
        WHERE session_id = %s 
        ORDER BY timestamp ASC
        """
        return self.execute_query(query, (session_id,))
    
    def add_chat_message(self, session_id: str, message_type: str, content: str, sources: List[Dict] = None) -> str:
        """Add a message to a chat session"""
        query = """
        INSERT INTO chat_messages (session_id, message_type, content, sources)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """
        
        sources_json = sources if sources else []
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (session_id, message_type, content, psycopg2.extras.Json(sources_json)))
                message_id = cursor.fetchone()[0]
                
                # Update session last_updated
                cursor.execute(
                    "UPDATE chat_sessions SET last_updated = CURRENT_TIMESTAMP WHERE id = %s",
                    (session_id,)
                )
                conn.commit()
                return str(message_id)
    
    def insert_kg_entity(self, entity_data: Dict) -> str:
        """Insert a knowledge graph entity"""
        query = """
        INSERT INTO kg_entities (name, entity_type, description, properties, embedding)
        VALUES (%(name)s, %(entity_type)s, %(description)s, %(properties)s, %(embedding)s)
        RETURNING id
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, entity_data)
                entity_id = cursor.fetchone()[0]
                conn.commit()
                return str(entity_id)
    
    def insert_kg_relationship(self, relationship_data: Dict) -> str:
        """Insert a knowledge graph relationship"""
        query = """
        INSERT INTO kg_relationships (source_entity_id, target_entity_id, relationship_type, properties, confidence_score)
        VALUES (%(source_entity_id)s, %(target_entity_id)s, %(relationship_type)s, %(properties)s, %(confidence_score)s)
        RETURNING id
        """
        
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, relationship_data)
                relationship_id = cursor.fetchone()[0]
                conn.commit()
                return str(relationship_id)
    
    def get_kg_entities(self, entity_type: str = None, limit: int = 100) -> List[Dict]:
        """Get knowledge graph entities"""
        if entity_type:
            query = "SELECT * FROM kg_entities WHERE entity_type = %s LIMIT %s"
            return self.execute_query(query, (entity_type, limit))
        else:
            query = "SELECT * FROM kg_entities LIMIT %s"
            return self.execute_query(query, (limit,))
    
    def get_kg_relationships(self, entity_id: str = None) -> List[Dict]:
        """Get knowledge graph relationships"""
        if entity_id:
            query = """
            SELECT r.*, se.name as source_name, te.name as target_name
            FROM kg_relationships r
            JOIN kg_entities se ON r.source_entity_id = se.id
            JOIN kg_entities te ON r.target_entity_id = te.id
            WHERE r.source_entity_id = %s OR r.target_entity_id = %s
            """
            return self.execute_query(query, (entity_id, entity_id))
        else:
            query = """
            SELECT r.*, se.name as source_name, te.name as target_name
            FROM kg_relationships r
            JOIN kg_entities se ON r.source_entity_id = se.id
            JOIN kg_entities te ON r.target_entity_id = te.id
            LIMIT 100
            """
            return self.execute_query(query)

# Initialize database manager
@st.cache_resource
def get_database_manager():
    return DatabaseManager()