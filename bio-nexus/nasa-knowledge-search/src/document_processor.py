import os
import logging
from typing import List, Dict, Any, Optional, Union
import numpy as np
import streamlit as st

logger = logging.getLogger(__name__)

try:
    from docling.document_converter import DocumentConverter
    DOCLING_AVAILABLE = True
except ImportError:
    DocumentConverter = None
    DOCLING_AVAILABLE = False
    logger.warning("Docling not available, using fallback PDF processing")

import google.generativeai as genai
from groq import Groq
import json
import re
from pathlib import Path
import tempfile

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.embedding_model = self._load_embedding_model()
        self.docling_converter = self._load_docling_converter()
        self.groq_client = self._initialize_groq()
        self._initialize_gemini()
    
    def reinitialize_with_api_keys(self):
        """Reinitialize the processor with new API keys from session state"""
        self.groq_client = self._initialize_groq()
        self._initialize_gemini()
        logger.info("Document processor reinitialized with new API keys")
    
    def _load_docling_converter(self):
        """Load Docling converter if available"""
        if DOCLING_AVAILABLE:
            try:
                return DocumentConverter()
            except Exception as e:
                logger.error(f"Error initializing Docling converter: {e}")
                return None
        return None
    
    def _load_embedding_model(self):
        """Using Gemini for embeddings instead of SentenceTransformer"""
        # Return the model name for Gemini embeddings
        return "models/embedding-001"
    
    def _initialize_groq(self):
        """Initialize Groq client"""
        try:
            # Check session state first, then environment
            api_key = None
            if hasattr(st, 'session_state') and 'groq_api_key' in st.session_state:
                api_key = st.session_state.groq_api_key
            else:
                api_key = os.getenv('GROQ_API_KEY')
            
            if api_key:
                return Groq(api_key=api_key)
            return None
        except Exception as e:
            logger.error(f"Error initializing Groq: {e}")
            return None
    
    def _initialize_gemini(self):
        """Initialize Gemini client"""
        try:
            # Check session state first, then environment
            api_key = None
            if hasattr(st, 'session_state') and 'google_api_key' in st.session_state:
                api_key = st.session_state.google_api_key
            else:
                api_key = os.getenv('GOOGLE_API_KEY')
            
            if api_key:
                genai.configure(api_key=api_key)
        except Exception as e:
            logger.error(f"Error initializing Gemini: {e}")
    
    def process_pdf_with_docling(self, file_path: str) -> Dict[str, Any]:
        """Process PDF using Docling for accurate extraction"""
        try:
            if not self.docling_converter:
                logger.warning("Docling converter not available, using fallback")
                return self._fallback_pdf_processing(file_path)
            
            # Convert document using Docling
            doc_result = self.docling_converter.convert(file_path)
            
            # Extract structured content
            structured_content = {
                'title': self._extract_title(doc_result.document),
                'content': doc_result.document.export_to_markdown(),
                'tables': self._extract_tables(doc_result.document),
                'images': self._extract_images(doc_result.document),
                'metadata': {
                    'page_count': len(doc_result.document.pages) if hasattr(doc_result.document, 'pages') else 0,
                    'language': 'en',  # Default to English for NASA documents
                    'extraction_method': 'docling'
                }
            }
            
            return structured_content
            
        except Exception as e:
            logger.error(f"Error processing PDF with Docling: {e}")
            return self._fallback_pdf_processing(file_path)
    
    def _extract_title(self, document) -> str:
        """Extract title from Docling document"""
        try:
            # Try to find title in document structure
            if hasattr(document, 'main_text'):
                lines = document.main_text.split('\n')
                for line in lines[:5]:  # Check first 5 lines
                    if line.strip() and len(line.strip()) > 10:
                        return line.strip()
            return "Unknown Title"
        except Exception as e:
            logger.warning(f"Error extracting title: {e}")
            return "Unknown Title"
    
    def _extract_tables(self, document) -> List[Dict]:
        """Extract tables from Docling document"""
        try:
            tables = []
            # Docling provides structured table extraction
            # This would need to be implemented based on Docling's API
            return tables
        except Exception as e:
            logger.error(f"Error extracting tables: {e}")
            return []
    
    def _extract_images(self, document) -> List[Dict]:
        """Extract image information from Docling document"""
        try:
            images = []
            # Docling provides image extraction capabilities
            # This would need to be implemented based on Docling's API
            return images
        except Exception as e:
            logger.error(f"Error extracting images: {e}")
            return []
    
    def _fallback_pdf_processing(self, file_path: str) -> Dict[str, Any]:
        """Fallback PDF processing using PyPDF2"""
        try:
            import PyPDF2
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                content = ""
                
                for page in pdf_reader.pages:
                    content += page.extract_text() + "\n"
                
                return {
                    'title': self._extract_title_from_text(content),
                    'content': content,
                    'tables': [],
                    'images': [],
                    'metadata': {
                        'page_count': len(pdf_reader.pages),
                        'language': 'en',
                        'extraction_method': 'pypdf2_fallback'
                    }
                }
        except Exception as e:
            logger.error(f"Error in fallback PDF processing: {e}")
            return {
                'title': "Processing Error",
                'content': "",
                'tables': [],
                'images': [],
                'metadata': {'extraction_method': 'failed'}
            }
    
    def _extract_title_from_text(self, text: str) -> str:
        """Extract title from raw text"""
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if len(line) > 10 and len(line) < 200:
                return line
        return "Untitled Document"
    
    def chunk_document(self, content: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict]:
        """Chunk document content into smaller pieces"""
        try:
            chunks = []
            words = content.split()
            
            for i in range(0, len(words), chunk_size - overlap):
                chunk_words = words[i:i + chunk_size]
                chunk_text = ' '.join(chunk_words)
                
                if chunk_text.strip():
                    chunks.append({
                        'content': chunk_text,
                        'chunk_index': len(chunks),
                        'chunk_type': 'text',
                        'word_count': len(chunk_words)
                    })
            
            return chunks
        except Exception as e:
            logger.error(f"Error chunking document: {e}")
            return []
    
    def generate_embeddings(self, texts: Union[str, List[str]]) -> Union[List[float], List[List[float]], None]:
        """Generate embeddings using Gemini embedding model"""
        if not self.embedding_model:
            logger.warning("No embedding model available")
            return None
        
        try:
            if isinstance(texts, str):
                # Single text
                result = genai.embed_content(model=self.embedding_model, content=texts)
                embedding = result.get('embedding')
                if embedding and isinstance(embedding, list) and len(embedding) > 0:
                    return embedding
                else:
                    logger.warning("Empty or invalid embedding returned from Gemini")
                    return None
            else:
                # Multiple texts
                embeddings = []
                for text in texts:
                    result = genai.embed_content(model=self.embedding_model, content=text)
                    embedding = result.get('embedding')
                    if embedding and isinstance(embedding, list) and len(embedding) > 0:
                        embeddings.append(embedding)
                    else:
                        logger.warning(f"Empty or invalid embedding for text: {text[:50]}...")
                        embeddings.append(None)
                return embeddings if embeddings else None
        except Exception as e:
            logger.error(f"Error generating embeddings with Gemini: {e}")
            return None
    
    def summarize_document(self, content: str, max_length: int = 500) -> str:
        """Generate a summary of the document using Groq"""
        try:
            if not self.groq_client:
                return self._fallback_summarize(content, max_length)
            
            prompt = f"""
            Please provide a concise summary of the following NASA research document. 
            Focus on the main findings, research objectives, and key conclusions.
            Keep the summary under {max_length} words.
            
            Document content:
            {content[:4000]}  # Limit input to avoid token limits
            """
            
            response = self.groq_client.chat.completions.create(
                model=os.getenv('DEFAULT_MODEL', 'llama-3.3-70b-versatile'),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length * 2,
                temperature=0.1
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating summary with Groq: {e}")
            return self._fallback_summarize(content, max_length)
    
    def _fallback_summarize(self, content: str, max_length: int = 500) -> str:
        """Fallback summarization method"""
        sentences = content.split('.')
        summary_sentences = sentences[:3]  # Take first 3 sentences
        summary = '. '.join(summary_sentences)
        
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        
        return summary
    
    def extract_entities(self, text: str) -> List[Dict]:
        """Extract named entities from text using Groq"""
        try:
            if not self.groq_client:
                return self._fallback_extract_entities(text)
            
            prompt = f"""
            Extract scientific entities from the following NASA research text. 
            Focus on:
            - Research topics and phenomena
            - Scientific instruments and equipment
            - Biological systems and organisms
            - Chemical compounds and materials
            - Space missions and experiments
            - Researchers and institutions
            - Locations (space stations, planets, etc.)
            
            Return the entities as a JSON list with the format:
            [
                {{
                    "name": "entity name",
                    "type": "entity type",
                    "description": "brief description"
                }}
            ]
            
            Text:
            {text[:3000]}  # Limit input
            """
            
            response = self.groq_client.chat.completions.create(
                model=os.getenv('DEFAULT_MODEL', 'llama-3.3-70b-versatile'),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                temperature=0.1
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                entities = json.loads(json_match.group())
                return entities
            
            return []
            
        except Exception as e:
            logger.error(f"Error extracting entities with Groq: {e}")
            return self._fallback_extract_entities(text)
    
    def _fallback_extract_entities(self, text: str) -> List[Dict]:
        """Fallback entity extraction using pattern matching"""
        entities = []
        
        # Simple patterns for NASA-related entities
        patterns = {
            'Space Mission': r'\b[A-Z][a-z]+-\d+\b|\bISS\b|\bInternational Space Station\b',
            'Organism': r'\b[A-Z][a-z]+ [a-z]+\b(?=.*(?:mouse|mice|rat|cell|organism))',
            'Chemical': r'\b[A-Z][a-zA-Z]*\d+\b|\b[A-Z]{2,}\b',
            'Equipment': r'\bmicroscop[ey]\b|\bspectromet[ery]\b|\bchamber\b|\bbioreactor\b'
        }
        
        for entity_type, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:5]:  # Limit to 5 per type
                entities.append({
                    'name': match,
                    'type': entity_type,
                    'description': f"{entity_type} mentioned in NASA research"
                })
        
        return entities
    
    def extract_relationships(self, entities: List[Dict], text: str) -> List[Dict]:
        """Extract relationships between entities using Groq"""
        try:
            if not self.groq_client or len(entities) < 2:
                return []
            
            entity_names = [e['name'] for e in entities]
            
            prompt = f"""
            Given these entities found in a NASA research document: {', '.join(entity_names)}
            
            Identify relationships between these entities based on the following text.
            Return relationships as JSON in this format:
            [
                {{
                    "source": "entity1",
                    "target": "entity2",
                    "relationship": "relationship_type",
                    "description": "brief description of the relationship"
                }}
            ]
            
            Common relationship types for NASA research:
            - studies, analyzes, affects, influences, contains, produces, uses, involves, measures
            
            Text:
            {text[:2000]}
            """
            
            response = self.groq_client.chat.completions.create(
                model=os.getenv('DEFAULT_MODEL', 'llama-3.3-70b-versatile'),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.1
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                relationships = json.loads(json_match.group())
                return relationships
            
            return []
            
        except Exception as e:
            logger.error(f"Error extracting relationships: {e}")
            return []
    
    def process_file(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Process a file and return structured data"""
        try:
            file_extension = Path(filename).suffix.lower()
            
            if file_extension == '.pdf':
                return self.process_pdf_with_docling(file_path)
            else:
                # Handle other file types
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return {
                    'title': filename,
                    'content': content,
                    'tables': [],
                    'images': [],
                    'metadata': {
                        'extraction_method': 'text_file'
                    }
                }
                
        except Exception as e:
            logger.error(f"Error processing file {filename}: {e}")
            return {
                'title': filename,
                'content': "",
                'tables': [],
                'images': [],
                'metadata': {'extraction_method': 'failed'}
            }

# Initialize document processor
@st.cache_resource
def get_document_processor():
    return DocumentProcessor()