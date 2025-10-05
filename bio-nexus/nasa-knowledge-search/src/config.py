"""
Configuration management for NASA Knowledge Search Engine
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = "localhost"
    port: int = 5432
    database: str = "nasa_knowledge"
    user: str = "nasa_user"
    password: str = "nasa_password"

@dataclass
class Neo4jConfig:
    """Neo4j configuration"""
    uri: str = "bolt://localhost:7687"
    user: str = "neo4j"
    password: str = "neo4j_password"

@dataclass
class AIConfig:
    """AI service configuration"""
    groq_api_key: str = ""
    google_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    default_llm_model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.1
    max_tokens: int = 32768

@dataclass
class AppConfig:
    """Application configuration"""
    app_name: str = "NASA Knowledge Search"
    app_version: str = "1.0.0"
    debug: bool = False
    max_file_size_mb: int = 100
    allowed_extensions: list = None
    similarity_threshold: float = 0.7

class ConfigManager:
    """Configuration manager for the application"""
    
    def __init__(self):
        self._load_from_env()
    
    def _load_from_env(self):
        """Load configuration from environment variables"""
        
        # Database configuration
        self.database = DatabaseConfig(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', '5432')),
            database=os.getenv('POSTGRES_DB', 'nasa_knowledge'),
            user=os.getenv('POSTGRES_USER', 'nasa_user'),
            password=os.getenv('POSTGRES_PASSWORD', 'nasa_password')
        )
        
        # Neo4j configuration
        self.neo4j = Neo4jConfig(
            uri=os.getenv('NEO4J_URI', 'bolt://localhost:7687'),
            user=os.getenv('NEO4J_USER', 'neo4j'),
            password=os.getenv('NEO4J_PASSWORD', 'neo4j_password')
        )
        
        # AI configuration
        self.ai = AIConfig(
            groq_api_key=os.getenv('GROQ_API_KEY', ''),
            google_api_key=os.getenv('GOOGLE_API_KEY', ''),
            embedding_model=os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'),
            default_llm_model=os.getenv('DEFAULT_MODEL', 'llama-3.3-70b-versatile'),
            temperature=float(os.getenv('TEMPERATURE', '0.1')),
            max_tokens=int(os.getenv('MAX_TOKENS', '32768'))
        )
        
        # Application configuration
        self.app = AppConfig(
            app_name=os.getenv('APP_NAME', 'NASA Knowledge Search'),
            app_version=os.getenv('APP_VERSION', '1.0.0'),
            debug=os.getenv('DEBUG', 'False').lower() == 'true',
            max_file_size_mb=int(os.getenv('MAX_FILE_SIZE_MB', '100')),
            allowed_extensions=os.getenv('ALLOWED_EXTENSIONS', 'pdf,txt,docx,pptx').split(','),
            similarity_threshold=float(os.getenv('SIMILARITY_THRESHOLD', '0.7'))
        )
    
    def validate(self) -> Dict[str, Any]:
        """Validate configuration and return status"""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Check required API keys
        if not self.ai.groq_api_key:
            validation_results['errors'].append("GROQ_API_KEY is not set")
            validation_results['valid'] = False
        
        if not self.ai.google_api_key:
            validation_results['errors'].append("GOOGLE_API_KEY is not set")
            validation_results['valid'] = False
        
        # Check database configuration
        if not self.database.password:
            validation_results['warnings'].append("Database password is empty")
        
        if not self.neo4j.password:
            validation_results['warnings'].append("Neo4j password is empty")
        
        # Check value ranges
        if not (0.0 <= self.ai.temperature <= 2.0):
            validation_results['errors'].append("Temperature must be between 0.0 and 2.0")
            validation_results['valid'] = False
        
        if not (0.1 <= self.app.similarity_threshold <= 1.0):
            validation_results['errors'].append("Similarity threshold must be between 0.1 and 1.0")
            validation_results['valid'] = False
        
        if self.app.max_file_size_mb <= 0:
            validation_results['errors'].append("Max file size must be positive")
            validation_results['valid'] = False
        
        return validation_results
    
    def get_database_url(self) -> str:
        """Get database connection URL"""
        return f"postgresql://{self.database.user}:{self.database.password}@{self.database.host}:{self.database.port}/{self.database.database}"
    
    def get_neo4j_config(self) -> Dict[str, str]:
        """Get Neo4j connection configuration"""
        return {
            'uri': self.neo4j.uri,
            'user': self.neo4j.user,
            'password': self.neo4j.password
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            'database': {
                'host': self.database.host,
                'port': self.database.port,
                'database': self.database.database,
                'user': self.database.user,
                # Don't include password in output
            },
            'neo4j': {
                'uri': self.neo4j.uri,
                'user': self.neo4j.user,
                # Don't include password in output
            },
            'ai': {
                'embedding_model': self.ai.embedding_model,
                'default_llm_model': self.ai.default_llm_model,
                'temperature': self.ai.temperature,
                'max_tokens': self.ai.max_tokens,
                # Don't include API keys in output
            },
            'app': {
                'app_name': self.app.app_name,
                'app_version': self.app.app_version,
                'debug': self.app.debug,
                'max_file_size_mb': self.app.max_file_size_mb,
                'allowed_extensions': self.app.allowed_extensions,
                'similarity_threshold': self.app.similarity_threshold
            }
        }
    
    def update_from_dict(self, config_dict: Dict[str, Any]):
        """Update configuration from dictionary"""
        if 'ai' in config_dict:
            ai_config = config_dict['ai']
            if 'temperature' in ai_config:
                self.ai.temperature = float(ai_config['temperature'])
            if 'max_tokens' in ai_config:
                self.ai.max_tokens = int(ai_config['max_tokens'])
            if 'embedding_model' in ai_config:
                self.ai.embedding_model = ai_config['embedding_model']
            if 'default_llm_model' in ai_config:
                self.ai.default_llm_model = ai_config['default_llm_model']
        
        if 'app' in config_dict:
            app_config = config_dict['app']
            if 'similarity_threshold' in app_config:
                self.app.similarity_threshold = float(app_config['similarity_threshold'])
            if 'max_file_size_mb' in app_config:
                self.app.max_file_size_mb = int(app_config['max_file_size_mb'])
            if 'debug' in app_config:
                self.app.debug = bool(app_config['debug'])

# Global configuration instance
config = ConfigManager()

def get_config() -> ConfigManager:
    """Get the global configuration instance"""
    return config

def validate_config() -> bool:
    """Validate the current configuration"""
    validation = config.validate()
    
    if not validation['valid']:
        for error in validation['errors']:
            logger.error(f"Configuration error: {error}")
        return False
    
    for warning in validation['warnings']:
        logger.warning(f"Configuration warning: {warning}")
    
    return True