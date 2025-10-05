# NASA Knowledge Search Engine

A comprehensive AI-powered knowledge base and search engine for NASA research documents, featuring multi-agent analysis, knowledge graph exploration, and RAG (Retrieval Augmented Generation) capabilities.

## 🚀 Features

### Core Capabilities
- **📄 Document Processing**: Advanced PDF extraction using Docling for accurate content extraction
- **🔍 Semantic Search**: Vector-based similarity search using embeddings
- **🤖 Multi-Agent AI**: Specialized AI agents powered by CrewAI for different research tasks
- **🕸️ Knowledge Graph**: Neo4j-based entity relationships and concept mapping
- **💬 Interactive Chat**: Memory-enabled conversations with source citations
- **📊 Analytics Dashboard**: Real-time insights into document corpus and usage

### AI & ML Stack
- **LLM Models**: Groq (primary) + Google Gemini for embeddings
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Document Processing**: Docling for accurate PDF extraction
- **Multi-Agent Framework**: CrewAI for specialized research agents

### Database & Storage
- **Primary Database**: PostgreSQL with pgvector extension
- **Knowledge Graph**: Neo4j for entity relationships
- **Vector Storage**: Integrated pgvector for similarity search

### Specialized Agents
1. **Document Search Specialist**: Finds relevant research documents
2. **Data Analysis Expert**: Analyzes and synthesizes research findings
3. **Knowledge Graph Navigator**: Explores entity relationships
4. **Research Synthesizer**: Combines information from multiple sources
5. **Scientific Fact Checker**: Verifies accuracy and citations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Streamlit     │    │   CrewAI        │    │   Knowledge     │
│   Frontend      │◄──►│   Agents        │◄──►│   Graph (Neo4j) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RAG System    │◄──►│   Document      │    │   PostgreSQL    │
│                 │    │   Processor     │◄──►│   + pgvector    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Groq LLM      │    │   Docling       │
│   + Gemini      │    │   Extraction    │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.10+
- API Keys for Groq and Google Gemini

### 1. Clone and Setup
```bash
git clone <repository-url>
cd nasa-knowledge-search
```

### 2. Environment Configuration
Copy the `.env` file and add your API keys:
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. Start with Docker
```bash
docker-compose up -d
```

This will start:
- PostgreSQL with pgvector (port 5432)
- Neo4j (ports 7474, 7687)
- Streamlit application (port 8501)

### 4. Access the Application
- **Main Application**: http://localhost:8501
- **Neo4j Browser**: http://localhost:7474

## 📱 Usage Guide

### Dashboard
- View system overview and metrics
- Monitor document processing status
- Analyze knowledge graph statistics
- Track recent activity

### Document Upload
- **Single Upload**: Upload individual documents
- **Bulk Upload**: Process multiple files simultaneously
- **Existing Files**: Process PDFs from mounted directory
- **Processing Options**: Choose extraction features (entities, summaries, embeddings)

### Chat & Search
- **Natural Language Queries**: Ask questions in plain English
- **Multi-Agent Analysis**: Get comprehensive answers from specialized agents
- **Source Citations**: View references and supporting documents
- **Follow-up Questions**: Explore related topics
- **Session Management**: Save and restore conversations

## 🔧 Configuration

### Environment Variables
```env
# AI Services
GROQ_API_KEY=your_groq_key
GOOGLE_API_KEY=your_google_key

# Database
POSTGRES_HOST=postgres
POSTGRES_DB=nasa_knowledge
POSTGRES_USER=nasa_user
POSTGRES_PASSWORD=nasa_password

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password

# Models
EMBEDDING_MODEL=all-MiniLM-L6-v2
DEFAULT_MODEL=mixtral-8x7b-32768
```

### Model Configuration
- **Embedding Model**: Configurable sentence transformer model
- **LLM Model**: Groq model selection (mixtral, llama, etc.)
- **Temperature**: Adjustable creativity/consistency balance
- **Token Limits**: Configurable response lengths

## 📊 Data Processing Pipeline

### Document Ingestion
1. **File Upload/Selection**: Web interface or existing file processing
2. **Content Extraction**: Docling for PDFs, standard readers for other formats
3. **Text Preprocessing**: Cleaning and normalization
4. **Chunking**: Intelligent document segmentation
5. **Embedding Generation**: Vector representations using sentence transformers

### Knowledge Graph Construction
1. **Entity Extraction**: AI-powered identification of research entities
2. **Relationship Discovery**: Inter-entity relationship mapping
3. **Graph Population**: Neo4j node and relationship creation
4. **Cross-referencing**: Document-entity associations

### Search & Retrieval
1. **Query Processing**: Natural language understanding
2. **Multi-modal Search**: Vector similarity + graph traversal
3. **Agent Coordination**: Multi-agent analysis and synthesis
4. **Response Generation**: Comprehensive answer compilation

## 🤖 Agent System

### Document Search Specialist
- Semantic search across document corpus
- Relevance ranking and filtering
- Context extraction and summarization

### Data Analysis Expert
- Quantitative research analysis
- Statistical interpretation
- Cross-study comparisons

### Knowledge Graph Navigator
- Entity relationship exploration
- Conceptual pathway discovery
- Research trend identification

### Research Synthesizer
- Multi-source information integration
- Coherent narrative construction
- Citation management

### Scientific Fact Checker
- Source verification
- Consistency checking
- Bias identification

## 🔍 Search Capabilities

### Vector Search
- Semantic similarity matching
- Contextual understanding
- Multilingual support (if configured)

### Knowledge Graph Search
- Entity-based queries
- Relationship traversal
- Concept discovery

### Hybrid Search
- Combined vector and graph search
- Weighted result ranking
- Comprehensive coverage

## 📈 Analytics & Monitoring

### Dashboard Metrics
- Document processing statistics
- Search query analytics
- Knowledge graph growth
- System performance metrics

### Export Capabilities
- Chat session exports
- Analytics data downloads
- Search result exports

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Start databases
docker-compose up postgres neo4j -d

# Run application
streamlit run app.py
```

### Project Structure
```
nasa-knowledge-search/
├── app.py                  # Main Streamlit application
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Container orchestration
├── Dockerfile             # Application container
├── .env                   # Environment configuration
├── src/                   # Core modules
│   ├── database.py        # PostgreSQL operations
│   ├── neo4j_manager.py   # Knowledge graph operations
│   ├── document_processor.py # Document extraction & processing
│   ├── agents.py          # CrewAI agent definitions
│   └── rag_system.py      # RAG implementation
├── pages/                 # Streamlit pages
│   ├── dashboard.py       # Analytics dashboard
│   ├── upload.py          # Document upload interface
│   └── chat.py            # Chat interface
└── sql/                   # Database schemas
    └── init.sql           # PostgreSQL initialization
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check container status
docker-compose ps

# Restart databases
docker-compose restart postgres neo4j
```

#### Missing API Keys
- Ensure `.env` file contains valid API keys
- Restart application after updating environment variables

#### Memory Issues
- Adjust Docker memory limits
- Consider processing smaller document batches

#### Slow Performance
- Check database indexes
- Monitor embedding model performance
- Consider upgrading hardware resources

### Logs and Debugging
```bash
# View application logs
docker-compose logs streamlit_app

# View database logs
docker-compose logs postgres
docker-compose logs neo4j
```

## 🔐 Security Considerations

### API Keys
- Store API keys securely in environment variables
- Never commit API keys to version control
- Rotate keys regularly

### Database Security
- Use strong passwords for database connections
- Consider encryption for sensitive data
- Implement proper access controls

### Network Security
- Use HTTPS in production
- Configure firewall rules appropriately
- Consider VPN for sensitive deployments

## 📚 API Documentation

### Database API
- Document CRUD operations
- Vector similarity search
- Chat session management
- Knowledge graph operations

### RAG System API
- Question answering
- Document search
- Knowledge graph exploration
- Multi-agent coordination

## 🤝 Contributing

### Development Guidelines
1. Follow Python PEP 8 style guidelines
2. Add comprehensive docstrings
3. Include unit tests for new features
4. Update documentation for API changes

### Submission Process
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request with description

## 📄 License

[Specify your license here]

## 🙏 Acknowledgments

- NASA for providing open research data
- CrewAI team for the multi-agent framework
- Docling team for advanced document processing
- Streamlit team for the web framework
- Open source community for various libraries

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

---

Built with ❤️ for advancing NASA research accessibility and discovery.