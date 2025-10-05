# 🚀 Astro-Scribe: AI-Powered NASA Knowledge Discovery Platform

<div align="center">

![Astro-Scribe Dashboard](./astro-scribe-dashboard.png)

*Transform NASA research documents into an intelligent, searchable knowledge base with AI-powered insights*

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red?style=for-the-badge&logo=streamlit)](https://streamlit.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Docker Hub](https://img.shields.io/badge/Docker_Hub-Available-blue?style=for-the-badge&logo=docker)](https://hub.docker.com/r/mrmorningstar2233/nasa-knowledge-search-streamlit_app)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.18-green?style=for-the-badge&logo=neo4j)](https://neo4j.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

</div>

## 🌟 Overview

Astro-Scribe is a cutting-edge knowledge discovery platform built with **Python and Streamlit** that transforms NASA's vast collection of research documents into an intelligent, searchable database. Using advanced AI technologies including LangChain, vector embeddings, knowledge graphs, and multi-agent systems, it provides researchers with unprecedented access to space science information through an intuitive web interface.

🚀 **Quick Start**: Try it instantly with our pre-built Docker image from [Docker Hub](https://hub.docker.com/r/mrmorningstar2233/nasa-knowledge-search-streamlit_app)!

## ✨ Key Features

### 🧠 **Advanced AI Processing**

- **Multi-Modal Document Analysis**: Intelligent PDF processing with OCR fallback using PyPDF2
- **Vector Embeddings**: Semantic search using LangChain and Google Gemini embeddings
- **Knowledge Graphs**: Automated entity extraction and relationship mapping with Neo4j
- **Multi-Agent AI**: Specialized agents powered by LangChain and CrewAI for research synthesis

### 🔍 **Intelligent Search & Discovery**

- **Semantic Search**: Find documents by meaning using vector similarity search
- **Knowledge Graph Navigation**: Explore connections between concepts and authors
- **Citation Networks**: Trace research lineages and dependencies
- **Interactive Chat**: AI-powered conversations with source citations using Streamlit Chat

### 📊 **Rich Analytics & Insights**

- **Research Trends**: Identify emerging topics and patterns with Plotly visualizations
- **Author Networks**: Discover collaboration patterns through network analysis
- **Publication Analytics**: Track research output over time with interactive dashboards
- **Impact Metrics**: Measure document influence and citations

### 🏗️ **Modern Architecture**

- **Streamlit Framework**: Rapid prototyping and deployment of ML applications
- **LangChain Integration**: Advanced LLM orchestration and RAG capabilities
- **Docker Containerized**: Easy deployment and development environment
- **RESTful APIs**: Extensible integration points for external systems

## 🛠️ Technology Stack

<div align="center">

| **Frontend** | **Backend** | **Database** | **AI/ML** |
|:---:|:---:|:---:|:---:|
| ![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat&logo=streamlit&logoColor=white) | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white) | ![LangChain](https://img.shields.io/badge/LangChain-00FF00?style=flat&logoColor=white) |
| ![Plotly](https://img.shields.io/badge/Plotly-3F4F75?style=flat&logo=plotly&logoColor=white) | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white) | ![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=flat&logo=neo4j&logoColor=white) | ![Groq](https://img.shields.io/badge/Groq-FF6B35?style=flat&logoColor=white) |
| ![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white) | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) | ![pgvector](https://img.shields.io/badge/pgvector-336791?style=flat&logo=postgresql&logoColor=white) | ![Google AI](https://img.shields.io/badge/Google_AI-4285F4?style=flat&logo=google&logoColor=white) |

</div>

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- **Python 3.10+** (for local development)
- **API Keys**: Groq, Google Gemini

### 1. Clone the Repository

```bash
git clone https://github.com/MRMORNINGSTAR2233/Astro-Scribe.git
cd Astro-Scribe/bio-nexus/nasa-knowledge-search
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

Required API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Launch with Docker

#### Option A: Using Pre-built Docker Image (Recommended)

```bash
# Pull and run the pre-built image from Docker Hub
docker run -p 8501:8501 mrmorningstar2233/nasa-knowledge-search-streamlit_app:latest
```

🐳 **Docker Hub Repository**: [mrmorningstar2233/nasa-knowledge-search-streamlit_app](https://hub.docker.com/r/mrmorningstar2233/nasa-knowledge-search-streamlit_app)

#### Option B: Build from Source

```bash
docker-compose up -d
```

### 4. Access the Platform

- **🌐 Main Application**: [http://localhost:8501](http://localhost:8501)
- **📊 Neo4j Browser**: [http://localhost:7474](http://localhost:7474)
- **🔧 Database**: PostgreSQL on port 5432

## 📁 Project Structure

```
Astro-Scribe/
├── 📱 bio-nexus/
│   └── nasa-knowledge-search/    # Main Streamlit application
│       ├── app.py                # Main Streamlit app entry point
│       ├── pages/                # Streamlit pages
│       │   ├── dashboard.py      # Analytics dashboard
│       │   ├── upload.py         # Document upload interface
│       │   ├── chat.py           # AI chat interface
│       │   └── settings.py       # Configuration settings
│       ├── src/                  # Core Python modules
│       │   ├── agents.py         # LangChain AI agents
│       │   ├── database.py       # PostgreSQL operations
│       │   ├── neo4j_manager.py  # Knowledge graph operations
│       │   ├── rag_system.py     # RAG implementation
│       │   └── document_processor.py # PDF processing
│       ├── requirements.txt      # Python dependencies
│       └── docker-compose.yml    # Container orchestration
├── 📄 nasa-pdf/                 # NASA research documents (571 PDFs)
└── 🔧 scripts/                  # Utility scripts
```

## 🎯 Usage Examples

### Running the Streamlit Application

```bash
# Install dependencies
pip install -r requirements.txt

# Start the Streamlit app
streamlit run app.py

# Or use Docker
docker-compose up -d
```

### Knowledge Graph Queries

```cypher
// Find papers by research area
MATCH (p:Paper)-[:MENTIONS]->(c:Concept)
WHERE c.name CONTAINS "space biology"
RETURN p.title, p.authors

// Discover author collaborations
MATCH (a1:Author)-[:AUTHORED]->(p:Paper)<-[:AUTHORED]-(a2:Author)
WHERE a1 <> a2
RETURN a1.name, a2.name, COUNT(p) as collaborations
```

### Python API Usage

```python
# Using the RAG system
from src.rag_system import get_rag_system

rag = get_rag_system()
response = rag.query(
    "effects of microgravity on plant growth",
    max_results=10
)

# Working with the knowledge graph
from src.neo4j_manager import get_neo4j_manager

neo4j = get_neo4j_manager()
authors = neo4j.find_collaborating_authors("space biology")
```

## 📊 Dashboard Features

### 📈 **Analytics Overview**
- Total documents processed
- Knowledge graph statistics
- Recent upload activity
- Search query analytics

### 🕸️ **Knowledge Graph Visualization**
- Interactive entity relationship maps
- Concept clustering and communities
- Author collaboration networks
- Research trend visualization

### 🔍 **Search Interface**
- Natural language queries
- Filter by date, author, topic
- Advanced boolean search
- Export results to various formats

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
# Clone and navigate to project
cd bio-nexus/nasa-knowledge-search

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
streamlit run app.py

# Run in development mode with auto-reload
streamlit run app.py --server.runOnSave true
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check container status
docker-compose ps

# Restart services
docker-compose restart
```

**PDF Processing Errors**
```bash
# Check application logs
docker logs bio-nexus-app

# Verify file permissions
ls -la uploads/
```

**Memory Issues with Large PDFs**
- Increase Docker memory allocation
- Process documents in smaller batches
- Consider document splitting for very large files

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA** for providing open access to research documents
- **Streamlit** for the amazing web app framework
- **LangChain** for LLM orchestration and RAG capabilities
- **CrewAI** for multi-agent framework inspiration
- **Groq** and **Google** for AI model APIs
- **Neo4j** for knowledge graph technology
- **PostgreSQL** and **pgvector** for vector database capabilities

## 📞 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/MRMORNINGSTAR2233/Astro-Scribe/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/MRMORNINGSTAR2233/Astro-Scribe/discussions)
- 📖 **Documentation**: [Project Wiki](https://github.com/MRMORNINGSTAR2233/Astro-Scribe/wiki)

---

<div align="center">

**Made with ❤️ for the space science community**

*Transforming how researchers discover and connect NASA knowledge*

⭐ **If you find this project useful, please consider giving it a star!** ⭐

</div>