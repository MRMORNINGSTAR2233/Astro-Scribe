import streamlit as st
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="NASA Knowledge Search Engine",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Import custom modules
try:
    from src.database import get_database_manager
    from src.neo4j_manager import get_neo4j_manager
    from src.document_processor import get_document_processor
    from src.rag_system import get_rag_system
    from pages import dashboard, upload, chat, settings
except ImportError as e:
    st.error(f"Error importing modules: {e}")
    st.stop()

# Initialize session state
def init_session_state():
    """Initialize session state variables"""
    if 'current_page' not in st.session_state:
        st.session_state.current_page = 'Dashboard'
    
    if 'chat_sessions' not in st.session_state:
        st.session_state.chat_sessions = []
    
    if 'current_chat_session' not in st.session_state:
        st.session_state.current_chat_session = None
    
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    
    if 'db_manager' not in st.session_state:
        st.session_state.db_manager = get_database_manager()
    
    if 'rag_system' not in st.session_state:
        st.session_state.rag_system = get_rag_system()

def main():
    """Main application function"""
    init_session_state()
    
    # Enhanced Custom CSS for better UI
    st.markdown("""
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Global styles */
    .stApp {
        font-family: 'Inter', sans-serif;
        color: white !important;
    }
    
    /* Force all text to be white/light */
    * {
        color: white !important;
    }
    
    /* Streamlit specific text elements */
    .stMarkdown, .stText, p, div, span, h1, h2, h3, h4, h5, h6 {
        color: white !important;
    }
    
    /* Chat messages and content */
    .stChatMessage, .stChatMessage p, .stChatMessage div {
        color: white !important;
    }
    
    /* Main header */
    .main-header {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%);
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        text-align: center;
        color: white;
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    }
    
    .main-header h1 {
        margin: 0 0 0.5rem 0;
        font-weight: 700;
        font-size: 2.5rem;
    }
    
    .main-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 1.1rem;
    }
    
    /* Sidebar styling */
    .sidebar .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
    }
    
    /* Navigation cards */
    .nav-card {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
    }
    
    .nav-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        transform: translateY(-2px);
    }
    
    .nav-card.active {
        border-color: #3b82f6;
        background: #eff6ff;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    
    /* Metric cards */
    .metric-card {
        background: rgba(30, 64, 175, 0.1);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-left: 4px solid #3b82f6;
        margin: 1rem 0;
        transition: transform 0.2s ease;
    }
    
    .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #60a5fa !important;
        margin: 0;
    }
    
    .metric-label {
        font-size: 0.9rem;
        color: #cbd5e1 !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0;
    }
    
    /* Status indicators */
    .status-success {
        background: rgba(16, 163, 74, 0.1);
        border-left: 4px solid #16a34a;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        color: #86efac !important;
    }
    
    .status-error {
        background: rgba(220, 38, 38, 0.1);
        border-left: 4px solid #dc2626;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        color: #fca5a5 !important;
    }
    
    .status-warning {
        background: rgba(217, 119, 6, 0.1);
        border-left: 4px solid #d97706;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        color: #fcd34d !important;
    }
    
    /* Button styling */
    .stButton > button {
        background: linear-gradient(135deg, #3b82f6, #1e40af);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.5rem;
        font-weight: 500;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        width: 100%;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    
    /* Chat message styling */
    .chat-message {
        padding: 1rem;
        margin: 0.75rem 0;
        border-radius: 12px;
        border-left: 4px solid #3b82f6;
        background: rgba(30, 64, 175, 0.1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        color: white !important;
    }
    
    .user-message {
        background: rgba(59, 130, 246, 0.1);
        border-left-color: #3b82f6;
        color: white !important;
    }
    
    .assistant-message {
        background: rgba(100, 116, 139, 0.1);
        border-left-color: #64748b;
        color: white !important;
    }
    
    /* Source cards */
    .source-card {
        background: rgba(100, 116, 139, 0.1);
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        border-left: 3px solid #64748b;
        font-size: 0.9rem;
        color: white !important;
    }
    
    /* Section headers */
    .section-header {
        display: flex;
        align-items: center;
        margin: 2rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
    }
    
    .section-header h3, .section-header h4, .section-header p {
        margin: 0;
        color: #60a5fa !important;
        font-weight: 600;
    }
    
    /* Progress bars */
    .progress-container {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 0.25rem;
        margin: 0.5rem 0;
    }
    
    .progress-bar {
        background: linear-gradient(90deg, #3b82f6, #1e40af);
        height: 8px;
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    
    /* Hide default radio button styling */
    .stRadio > div {
        display: none;
    }
    
    /* Custom spacing */
    .element-container {
        margin-bottom: 1rem;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
        .main-header {
            padding: 1.5rem;
        }
        
        .main-header h1 {
            font-size: 2rem;
        }
        
        .metric-card {
            padding: 1rem;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Enhanced main header
    st.markdown("""
    <div class="main-header">
        <h1>🚀 NASA Knowledge Search Engine</h1>
        <p>Advanced AI-Powered Research Assistant for NASA Scientific Literature</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Check if API keys are configured
    groq_key = st.session_state.get('groq_api_key', os.getenv('GROQ_API_KEY', ''))
    gemini_key = st.session_state.get('google_api_key', os.getenv('GOOGLE_API_KEY', ''))
    
    if not groq_key or not gemini_key:
        st.markdown("""
        <div class="status-warning">
            <h4>⚙️ Configuration Required</h4>
            <p>Please configure your API keys in the <strong>Settings</strong> page to enable AI features:</p>
            <ul>
                <li><strong>Groq API Key</strong> - For chat responses and document analysis</li>
                <li><strong>Gemini API Key</strong> - For document embeddings and search</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("🔧 Go to Settings", type="primary"):
            st.session_state.current_page = "Settings"
            st.rerun()
    
    # Enhanced sidebar navigation
    with st.sidebar:
        st.markdown("""
        <div style="text-align: center; padding: 1rem 0;">
            <h2 style="color: #1e40af; margin: 0; font-weight: 600;">Navigation</h2>
        </div>
        """, unsafe_allow_html=True)
        
        # Page selection with custom styling
        pages = {
            "Dashboard": {"icon": "📊", "desc": "System Overview"},
            "Upload Documents": {"icon": "📤", "desc": "Add New Documents"}, 
            "Chat & Search": {"icon": "💬", "desc": "AI Search Interface"},
            "Settings": {"icon": "⚙️", "desc": "API Keys & Configuration"}
        }
        
        # Create custom navigation
        for page_name, page_info in pages.items():
            is_active = page_name == st.session_state.current_page
            
            if st.button(
                f"{page_info['icon']} {page_name}",
                key=f"nav_{page_name}",
                help=page_info['desc'],
                use_container_width=True
            ):
                st.session_state.current_page = page_name
                st.rerun()
        
        st.markdown("---")
        
        # System status in sidebar
        st.markdown("""
        <div style="margin: 1rem 0;">
            <h4 style="color: #64748b; margin-bottom: 0.5rem;">System Status</h4>
        </div>
        """, unsafe_allow_html=True)
        
        # Chat session management
        if st.session_state.current_page == "Chat & Search":
            st.markdown("### Chat Sessions")
            
            # Load chat sessions
            try:
                chat_sessions = st.session_state.db_manager.get_chat_sessions()
                st.session_state.chat_sessions = chat_sessions
            except Exception as e:
                st.error(f"Error loading chat sessions: {e}")
                chat_sessions = []
            
            # New chat session button
            if st.button("➕ New Chat Session"):
                try:
                    session_id = st.session_state.db_manager.create_chat_session("New Chat")
                    st.session_state.current_chat_session = session_id
                    st.session_state.messages = []
                    st.rerun()
                except Exception as e:
                    st.error(f"Error creating chat session: {e}")
            
            # Display existing sessions
            if chat_sessions:
                st.markdown("#### Recent Sessions")
                for session in chat_sessions[:10]:  # Show last 10 sessions
                    session_name = session.get('session_name', f"Chat {session.get('id', '')[:8]}")
                    message_count = session.get('message_count', 0)
                    
                    if st.button(
                        f"💬 {session_name} ({message_count} msgs)",
                        key=f"session_{session['id']}"
                    ):
                        st.session_state.current_chat_session = session['id']
                        try:
                            messages = st.session_state.db_manager.get_chat_messages(session['id'])
                            st.session_state.messages = messages
                        except Exception as e:
                            st.error(f"Error loading messages: {e}")
                            st.session_state.messages = []
                        st.rerun()
        
        st.markdown("---")
        
        # System status
        st.markdown("### System Status")
        
        # Check database connection
        try:
            docs = st.session_state.db_manager.get_all_documents()
            db_status = "🟢 Connected"
            doc_count = len(docs)
        except Exception as e:
            db_status = "🔴 Disconnected"
            doc_count = 0
        
        st.markdown(f"**Database:** {db_status}")
        st.markdown(f"**Documents:** {doc_count}")
        
        # Check Neo4j connection
        try:
            neo4j_manager = get_neo4j_manager()
            if neo4j_manager.driver:
                kg_status = "🟢 Connected"
                stats = neo4j_manager.get_graph_statistics()
                node_count = stats.get('total_nodes', 0)
            else:
                kg_status = "🔴 Disconnected"
                node_count = 0
        except Exception as e:
            kg_status = "🔴 Disconnected"
            node_count = 0
        
        st.markdown(f"**Knowledge Graph:** {kg_status}")
        st.markdown(f"**Entities:** {node_count}")
        
        st.markdown("---")
        
        # Quick actions
        st.markdown("### Quick Actions")
        
        if st.button("🔄 Refresh Data"):
            st.cache_resource.clear()
            st.rerun()
        
        if st.button("ℹ️ About"):
            st.info("""
            **NASA Knowledge Search Engine**
            
            Features:
            - 🔍 Semantic document search
            - 🤖 Multi-agent AI analysis
            - 🕸️ Knowledge graph exploration
            - 📊 Interactive dashboard
            - 💬 Memory-enabled chat
            
            Built with:
            - Streamlit
            - CrewAI
            - Groq & Gemini
            - PostgreSQL + pgvector
            - Neo4j
            - Docling
            """)
    
    # Main content area
    try:
        current_page = st.session_state.current_page
        
        # Import all required components first
        db_manager = st.session_state.db_manager
        rag_system = st.session_state.rag_system
        
        if not db_manager or not rag_system:
            st.error("Core components not initialized properly")
            return
        
        # Page routing
        if current_page == "Dashboard":
            dashboard.show_dashboard()
        elif current_page == "Upload Documents":
            # Initialize document processor
            doc_processor = get_document_processor()
            if not doc_processor:
                st.error("Document processor not initialized")
                return
            upload.show_upload_page()
        elif current_page == "Chat & Search":
            chat.show_chat_page()
        elif current_page == "Settings":
            settings.show_settings_page()
        else:
            st.error(f"Unknown page: {current_page}")
    except Exception as e:
        st.error(f"Error loading page '{st.session_state.current_page}': {e}")
        st.exception(e)

if __name__ == "__main__":
    main()