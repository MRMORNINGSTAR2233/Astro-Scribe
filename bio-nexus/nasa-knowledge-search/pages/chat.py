import streamlit as st
import time
import logging
from typing import Dict, List, Any
import json

logger = logging.getLogger(__name__)

def show_chat_page():
    """Display the chat interface with search capabilities"""
    
    # Page header with enhanced styling
    st.markdown("""
    <div class="section-header">
        <h3>💬 NASA Research Assistant</h3>
        <p>Ask questions about NASA research and get AI-powered answers with sources</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Get components from session state
    try:
        db_manager = st.session_state.db_manager
        rag_system = st.session_state.rag_system
        
        if not db_manager or not rag_system:
            st.markdown("""
            <div class="status-error">
                <strong>❌ System Error</strong><br>
                Required components not initialized
            </div>
            """, unsafe_allow_html=True)
            return
        
        # Ensure we have a current chat session
        if not st.session_state.get('current_chat_session'):
            # Create a new session if none exists
            try:
                session_id = db_manager.create_chat_session("New Research Chat")
                st.session_state.current_chat_session = session_id
                st.session_state.messages = []
                st.markdown(f"""
                <div class="status-success">
                    <strong>✅ New Chat Session</strong><br>
                    Created session: {session_id[:8]}...
                </div>
                """, unsafe_allow_html=True)
            except Exception as e:
                st.markdown(f"""
                <div class="status-error">
                    <strong>❌ Session Error</strong><br>
                    {str(e)[:100]}...
                </div>
                """, unsafe_allow_html=True)
                return
            
    except Exception as e:
        st.markdown(f"""
        <div class="status-error">
            <strong>❌ Initialization Error</strong><br>
            {str(e)[:100]}...
        </div>
        """, unsafe_allow_html=True)
        return
    
    # Load messages for current session
    if st.session_state.current_chat_session and not st.session_state.messages:
        try:
            messages = db_manager.get_chat_messages(st.session_state.current_chat_session)
            st.session_state.messages = messages
        except Exception as e:
            st.error(f"Error loading messages: {e}")
            st.session_state.messages = []
    
    # Chat interface layout
    col1, col2 = st.columns([2, 1])
    
    with col1:
        show_chat_interface(rag_system, db_manager)
    
    with col2:
        show_chat_sidebar(rag_system)

def show_chat_interface(rag_system, db_manager):
    """Main chat interface"""
    
    # Chat controls
    col1, col2 = st.columns([4, 1])
    with col2:
        if st.button("🗑️ Clear Chat", help="Clear chat history"):
            st.session_state.messages = []
            if st.session_state.get('current_chat_session'):
                # Create a new session
                try:
                    session_id = db_manager.create_chat_session("New Research Chat")
                    st.session_state.current_chat_session = session_id
                    st.rerun()
                except Exception as e:
                    st.error(f"Error creating new session: {e}")
    
    # Display chat messages
    chat_container = st.container()
    
    with chat_container:
        # Display existing messages
        for message in st.session_state.messages:
            display_message(message)
    
    # Search suggestions
    if not st.session_state.messages:
        st.markdown("### 🌟 Suggested Questions")
        
        suggestions = rag_system.suggest_questions()
        
        # Display suggestions in columns
        cols = st.columns(2)
        for i, suggestion in enumerate(suggestions[:6]):
            with cols[i % 2]:
                if st.button(
                    suggestion,
                    key=f"suggestion_{i}",
                    help="Click to ask this question",
                    use_container_width=True
                ):
                    st.session_state.user_input = suggestion
                    st.rerun()
    
    # Query input
    st.markdown("---")
    
    # Quick search options
    search_type = st.selectbox(
        "Search Type",
        ["Comprehensive Search", "Quick Answer", "Entity Search", "Document Search"],
        help="Choose the type of search to perform"
    )
    
    # User input
    user_input = st.chat_input(
        "Ask me anything about NASA research...",
        key="chat_input"
    )
    
    # Handle user input from suggestions
    if hasattr(st.session_state, 'user_input') and st.session_state.user_input:
        user_input = st.session_state.user_input
        delattr(st.session_state, 'user_input')
    
    # Process user input
    if user_input:
        process_user_query(user_input, search_type, rag_system, db_manager)

def display_message(message: Dict):
    """Display a chat message"""
    
    message_type = message.get('message_type', 'user')
    content = message.get('content', '')
    sources = message.get('sources', [])
    timestamp = message.get('timestamp', '')
    metadata = message.get('metadata', {})
    
    if message_type == 'user':
        with st.chat_message("user"):
            st.markdown(content)
            if timestamp:
                st.caption(f"🕒 {timestamp}")
    
    else:  # assistant message
        with st.chat_message("assistant"):
            st.markdown(content)
            
            # Display sources if available
            if sources:
                with st.expander(f"📚 Sources ({len(sources)} references)"):
                    display_sources(sources)
            
            if timestamp:
                st.caption(f"🕒 {timestamp}")

def display_sources(sources: List[Dict]):
    """Display source references"""
    
    for i, source in enumerate(sources):
        source_type = source.get('type', 'unknown')
        title = source.get('title', 'Unknown')
        filename = source.get('filename', 'Unknown')
        similarity = source.get('similarity', 0)
        
        if source_type == 'document':
            st.markdown(f"""
            <div class="source-card">
                <strong>📄 {title}</strong><br>
                <small>File: {filename}</small>
            </div>
            """, unsafe_allow_html=True)
        
        elif source_type == 'chunk':
            chunk_index = source.get('chunk_index', 0)
            st.markdown(f"""
            <div class="source-card">
                <strong>📄 {title}</strong><br>
                <small>Chunk {chunk_index}</small>
            </div>
            """, unsafe_allow_html=True)

def process_user_query(query: str, search_type: str, rag_system, db_manager):
    """Process user query and generate response"""
    
    # Add user message to chat
    user_message = {
        'message_type': 'user',
        'content': query,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    st.session_state.messages.append(user_message)
    
    # Display user message immediately
    with st.chat_message("user"):
        st.markdown(query)
        st.caption(f"🕒 {user_message['timestamp']}")
    
    # Generate response
    with st.chat_message("assistant"):
        with st.spinner("🤖 Analyzing your question and searching the knowledge base..."):
            
            # Create progress indicator
            progress_container = st.empty()
            
            try:
                # Update progress
                progress_container.text("🔍 Searching documents...")
                
                # Get response from RAG system
                response = rag_system.ask_question(
                    query, 
                    session_id=st.session_state.current_chat_session
                )
                
                progress_container.text("🧠 Generating answer...")
                
                # Extract response components
                answer = response.get('answer', 'Sorry, I could not generate an answer.')
                sources = response.get('sources', [])
                follow_ups = response.get('follow_up_questions', [])
                confidence = response.get('confidence', 0.0)
                query_type = response.get('query_type', 'unknown')
                
                progress_container.empty()
                
                # Display answer
                st.markdown(answer)
                
                # Display sources
                if sources:
                    with st.expander(f"📚 Sources ({len(sources)} references)", expanded=False):
                        display_sources(sources)
                
                # Display follow-up questions
                if follow_ups:
                    st.markdown("#### 🤔 Related Questions")
                    for i, follow_up in enumerate(follow_ups):
                        if st.button(
                            follow_up,
                            key=f"followup_{i}_{time.time()}",
                            help="Click to ask this question",
                            use_container_width=True
                        ):
                            st.session_state.user_input = follow_up
                            st.rerun()
                
                # Create assistant message
                assistant_message = {
                    'message_type': 'assistant',
                    'content': answer,
                    'sources': sources,
                    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'metadata': {
                        'confidence': confidence,
                        'query_type': query_type,
                        'follow_ups': follow_ups
                    }
                }
                
                st.session_state.messages.append(assistant_message)
                
            except Exception as e:
                error_message = f"I apologize, but I encountered an error while processing your question: {str(e)}"
                st.error(error_message)
                
                # Add error message to chat
                assistant_message = {
                    'message_type': 'assistant',
                    'content': error_message,
                    'sources': [],
                    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                }
                
                st.session_state.messages.append(assistant_message)
                
                logger.error(f"Error processing query '{query}': {e}")

def show_chat_sidebar(rag_system):
    """Show chat sidebar with additional features"""
    
    st.markdown("### 🔧 Search Options")
    
    # Advanced search settings
    with st.expander("Advanced Settings"):
        similarity_threshold = st.slider(
            "Similarity Threshold",
            min_value=0.1,
            max_value=1.0,
            value=0.7,
            step=0.1,
            help="Minimum similarity score for search results"
        )
        
        max_sources = st.slider(
            "Max Sources",
            min_value=1,
            max_value=20,
            value=10,
            help="Maximum number of sources to consider"
        )
        
        include_kg = st.checkbox(
            "Include Knowledge Graph",
            value=True,
            help="Include knowledge graph entities in search"
        )
    
    st.markdown("---")
    
    # Quick topic searches
    st.markdown("### 🏷️ Quick Topics")
    
    topics = [
        "Microgravity Effects",
        "Space Station Research",
        "Bone Density",
        "Muscle Atrophy",
        "Plant Growth",
        "Radiation Effects",
        "Immune System",
        "Cardiovascular Health"
    ]
    
    for topic in topics:
        if st.button(
            topic,
            key=f"topic_{topic}",
            use_container_width=True,
            help=f"Search for research about {topic.lower()}"
        ):
            query = f"What research has been done on {topic.lower()} in space?"
            st.session_state.user_input = query
            st.rerun()
    
    st.markdown("---")
    
    # Knowledge graph exploration
    st.markdown("### 🕸️ Knowledge Graph")
    
    entity_search = st.text_input(
        "Search Entities",
        placeholder="Enter entity name...",
        help="Search for entities in the knowledge graph"
    )
    
    if entity_search:
        try:
            from src.neo4j_manager import get_neo4j_manager
            neo4j_manager = get_neo4j_manager()
            
            if neo4j_manager.driver:
                entities = neo4j_manager.find_entities_by_name(entity_search, limit=5)
                
                if entities:
                    st.markdown("**Found Entities:**")
                    for entity in entities:
                        entity_name = entity.get('name', 'Unknown')
                        entity_type = entity.get('entity_type', 'Unknown')
                        
                        if st.button(
                            f"{entity_name} ({entity_type})",
                            key=f"entity_{entity.get('id', entity_name)}",
                            use_container_width=True
                        ):
                            query = f"Tell me about {entity_name} in NASA research"
                            st.session_state.user_input = query
                            st.rerun()
                else:
                    st.info("No entities found")
            else:
                st.warning("Knowledge graph not available")
                
        except Exception as e:
            st.error(f"Error searching entities: {e}")
    
    st.markdown("---")
    
    # Chat management
    st.markdown("### 💾 Chat Management")
    
    if st.button("🗑️ Clear Current Chat", use_container_width=True):
        st.session_state.messages = []
        try:
            # Create new session
            db_manager = st.session_state.db_manager
            session_id = db_manager.create_chat_session("New Chat")
            st.session_state.current_chat_session = session_id
        except Exception as e:
            st.error(f"Error creating new session: {e}")
        st.rerun()
    
    if st.button("📥 Export Chat", use_container_width=True):
        if st.session_state.messages:
            # Prepare export data
            export_data = {
                'session_id': st.session_state.current_chat_session,
                'export_time': time.strftime('%Y-%m-%d %H:%M:%S'),
                'messages': st.session_state.messages
            }
            
            export_json = json.dumps(export_data, indent=2, default=str)
            
            st.download_button(
                label="Download JSON",
                data=export_json,
                file_name=f"nasa_chat_{time.strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
        else:
            st.info("No messages to export")
    
    # Session statistics
    if st.session_state.messages:
        st.markdown("### 📊 Session Stats")
        
        user_messages = len([m for m in st.session_state.messages if m.get('message_type') == 'user'])
        assistant_messages = len([m for m in st.session_state.messages if m.get('message_type') == 'assistant'])
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Questions", user_messages)
        
        with col2:
            st.metric("Answers", assistant_messages)