# NASA Knowledge Search Engine - Quick Start Guide

This guide will help you get the NASA Knowledge Search Engine up and running quickly.

## 🚀 Prerequisites

Before you begin, ensure you have:

1. **Docker & Docker Compose** installed
   - [Install Docker](https://docs.docker.com/get-docker/)
   - [Install Docker Compose](https://docs.docker.com/compose/install/)

2. **API Keys** (required for AI features):
   - **Groq API Key**: Sign up at [console.groq.com](https://console.groq.com/)
   - **Google API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/)

## ⚡ Quick Setup (5 minutes)

### Step 1: Download and Extract
```bash
# Clone or download the repository
git clone <repository-url>
cd nasa-knowledge-search
```

### Step 2: Configure API Keys
```bash
# Edit the .env file
nano .env

# Add your API keys:
GROQ_API_KEY=your_actual_groq_key_here
GOOGLE_API_KEY=your_actual_google_key_here
```

### Step 3: Start the Application
```bash
# Run the setup script (recommended)
./setup.sh

# OR manually start with Docker Compose
docker-compose up -d
```

### Step 4: Access the Application
- **Main Application**: http://localhost:8501
- **Neo4j Browser**: http://localhost:7474 (user: neo4j, password: neo4j_password)

## 📚 First Steps

### 1. Upload Documents
1. Go to the **Upload Documents** page
2. Choose **Process Existing NASA PDFs** tab
3. Select files to process
4. Click **Process Selected Files**

### 2. Start Searching
1. Go to the **Chat & Search** page
2. Try these example queries:
   - "What are the effects of microgravity on bone density?"
   - "How does spaceflight affect the immune system?"
   - "What research has been done on plant growth in space?"

### 3. Explore the Dashboard
1. Go to the **Dashboard** page
2. View processing statistics
3. Monitor knowledge graph growth
4. Check system health

## 🔧 Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs

# Restart a specific service
docker-compose restart streamlit_app

# Check service status
docker-compose ps
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# Check port availability
netstat -an | grep 8501
netstat -an | grep 5432
netstat -an | grep 7474
```

### Database connection issues
```bash
# Restart databases
docker-compose restart postgres neo4j

# Check database logs
docker-compose logs postgres
docker-compose logs neo4j
```

### Application errors
```bash
# Check application logs
docker-compose logs streamlit_app

# Restart application
docker-compose restart streamlit_app
```

## 📱 Features Overview

### Dashboard
- System metrics and health monitoring
- Document processing statistics
- Knowledge graph analytics
- Recent activity tracking

### Document Upload
- Single file upload with preview
- Bulk upload for multiple files
- Process existing NASA PDFs
- Configurable processing options

### Chat & Search
- Natural language queries
- Multi-agent AI analysis
- Source citations and references
- Knowledge graph exploration
- Session memory and history

## 🔑 Configuration Options

### Processing Settings
- **Extract Entities**: Build knowledge graph
- **Generate Summaries**: Create document summaries
- **Create Embeddings**: Enable semantic search
- **Split into Chunks**: Improve search granularity

### Search Settings
- **Similarity Threshold**: Control search sensitivity
- **Max Sources**: Limit number of references
- **Include Knowledge Graph**: Enable graph search

## 💡 Tips for Best Results

1. **Start Small**: Process a few documents first to test the system
2. **Use Specific Queries**: More specific questions get better answers
3. **Check Sources**: Review cited documents for accuracy
4. **Explore Follow-ups**: Use suggested follow-up questions
5. **Monitor Performance**: Check dashboard for system health

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: `docker-compose logs`
2. **Restart services**: `docker-compose restart`
3. **Review configuration**: Ensure API keys are correct
4. **Check system resources**: Ensure adequate RAM and disk space

## 🎯 Next Steps

Once you have the basic system running:

1. **Upload More Documents**: Add your research corpus
2. **Customize Agents**: Modify agent behavior in `src/agents.py`
3. **Extend Processing**: Add new document types in `src/document_processor.py`
4. **Enhance UI**: Customize Streamlit pages in `pages/`

---

**Need more help?** Check the full README.md for detailed documentation and troubleshooting guides.