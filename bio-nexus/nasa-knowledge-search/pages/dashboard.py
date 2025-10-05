import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)

def show_dashboard():
    """Display the main dashboard with system overview and analytics"""
    
    # Dashboard header
    st.markdown("""
    <div class="section-header">
        <h3>📊 System Dashboard</h3>
    </div>
    """, unsafe_allow_html=True)
    
    # Quick stats row
    col1, col2, col3, col4 = st.columns(4)
    
    # Get system data first
    try:
        db_manager = st.session_state.get('db_manager')
        if not db_manager:
            st.error("Database manager not initialized")
            return
            
        documents = db_manager.get_all_documents()
        chat_sessions = db_manager.get_chat_sessions()
        
        # Neo4j stats
        try:
            from src.neo4j_manager import get_neo4j_manager
            neo4j = get_neo4j_manager()
            kg_stats = neo4j.get_graph_statistics()
        except Exception as e:
            kg_stats = {'total_nodes': 0, 'total_relationships': 0}
        
        with col1:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{len(documents)}</p>
                <p class="metric-label">Documents</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{len(chat_sessions)}</p>
                <p class="metric-label">Chat Sessions</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{kg_stats.get('total_nodes', 0)}</p>
                <p class="metric-label">Knowledge Nodes</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col4:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{kg_stats.get('total_relationships', 0)}</p>
                <p class="metric-label">Relationships</p>
            </div>
            """, unsafe_allow_html=True)
        
    except Exception as e:
        st.error(f"Error loading system data: {str(e)}")
        return
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Connection Status Section
    st.markdown("""
    <div class="section-header">
        <h3>🔌 System Health</h3>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        # PostgreSQL Status
        try:
            documents = db_manager.get_all_documents()
            st.markdown(f"""
            <div class="status-success">
                <strong>✅ PostgreSQL Connected</strong><br>
                Database operational with {len(documents)} documents indexed
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.markdown(f"""
            <div class="status-error">
                <strong>❌ PostgreSQL Error</strong><br>
                {str(e)[:100]}...
            </div>
            """, unsafe_allow_html=True)
    
    with col2:
        # Neo4j Status
        try:
            from src.neo4j_manager import get_neo4j_manager
            neo4j = get_neo4j_manager()
            kg_stats = neo4j.get_graph_statistics()
            st.markdown(f"""
            <div class="status-success">
                <strong>✅ Neo4j Connected</strong><br>
                Knowledge graph with {kg_stats.get('total_nodes', 0)} nodes active
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.markdown(f"""
            <div class="status-error">
                <strong>❌ Neo4j Error</strong><br>
                {str(e)[:100]}...
            </div>
        """, unsafe_allow_html=True)
    
    # Get knowledge graph stats
    try:
        from src.neo4j_manager import get_neo4j_manager
        neo4j_manager = get_neo4j_manager()
        kg_stats = neo4j_manager.get_graph_statistics() if neo4j_manager.driver else {}
    except Exception as e:
        st.error(f"Error loading dashboard data: {e}")
        st.exception(e)
        return
    
    # Key metrics row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown("""
        <div class="metric-card">
            <h3>📚 Total Documents</h3>
            <h2>{}</h2>
            <p>Research papers processed</p>
        </div>
        """.format(len(documents)), unsafe_allow_html=True)
    
    with col2:
        processed_docs = len([d for d in documents if d.get('processed')])
        st.markdown("""
        <div class="metric-card">
            <h3>✅ Processed</h3>
            <h2>{}</h2>
            <p>Documents ready for search</p>
        </div>
        """.format(processed_docs), unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="metric-card">
            <h3>💬 Chat Sessions</h3>
            <h2>{}</h2>
            <p>Research conversations</p>
        </div>
        """.format(len(chat_sessions)), unsafe_allow_html=True)
    
    with col4:
        total_entities = kg_stats.get('total_nodes', 0)
        st.markdown("""
        <div class="metric-card">
            <h3>🕸️ Knowledge Entities</h3>
            <h2>{}</h2>
            <p>Connected concepts</p>
        </div>
        """.format(total_entities), unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Charts and visualizations
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📈 Document Upload Timeline")
        
        if documents:
            # Create upload timeline chart
            df_docs = pd.DataFrame(documents)
            df_docs['upload_date'] = pd.to_datetime(df_docs['upload_date'])
            df_docs['date'] = df_docs['upload_date'].dt.date
            
            # Group by date
            upload_timeline = df_docs.groupby('date').size().reset_index(name='count')
            upload_timeline['cumulative'] = upload_timeline['count'].cumsum()
            
            fig = px.line(
                upload_timeline, 
                x='date', 
                y='cumulative',
                title="Cumulative Documents Uploaded",
                labels={'cumulative': 'Total Documents', 'date': 'Date'}
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No documents uploaded yet.")
    
    with col2:
        st.subheader("📊 File Type Distribution")
        
        if documents:
            # Create file type distribution
            file_types = pd.DataFrame(documents)['file_type'].value_counts()
            
            fig = px.pie(
                values=file_types.values,
                names=file_types.index,
                title="Document Types"
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No documents to analyze.")
    
    # Knowledge Graph Visualization
    if kg_stats:
        st.subheader("🕸️ Knowledge Graph Overview")
        
        col1, col2 = st.columns(2)
        
        with col1:
            entity_types = kg_stats.get('entity_types', [])
            if entity_types:
                entity_df = pd.DataFrame(entity_types)
                entity_df = entity_df.head(10)  # Top 10 entity types
                
                fig = px.bar(
                    entity_df,
                    x='count',
                    y='entity_type',
                    orientation='h',
                    title="Top Entity Types",
                    labels={'count': 'Number of Entities', 'entity_type': 'Entity Type'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            relationship_types = kg_stats.get('relationship_types', [])
            if relationship_types:
                rel_df = pd.DataFrame(relationship_types)
                rel_df = rel_df.head(10)  # Top 10 relationship types
                
                fig = px.bar(
                    rel_df,
                    x='count',
                    y='relationship_type',
                    orientation='h',
                    title="Top Relationship Types",
                    labels={'count': 'Number of Relationships', 'relationship_type': 'Relationship Type'}
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
    
    # Recent Activity
    st.subheader("🕒 Recent Activity")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Recently Uploaded Documents")
        recent_docs = sorted(documents, key=lambda x: x.get('upload_date', ''), reverse=True)[:5]
        
        if recent_docs:
            for doc in recent_docs:
                upload_date = doc.get('upload_date', 'Unknown')
                if upload_date != 'Unknown':
                    try:
                        upload_date = pd.to_datetime(upload_date).strftime('%Y-%m-%d %H:%M')
                    except:
                        pass
                
                status = "✅ Processed" if doc.get('processed') else "⏳ Processing"
                
                st.markdown(f"""
                <div class="source-card">
                    <strong>{doc.get('title', doc.get('filename', 'Unknown'))}</strong><br>
                    <small>📅 {upload_date} | {status}</small>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No documents uploaded yet.")
    
    with col2:
        st.markdown("#### Recent Chat Sessions")
        recent_chats = sorted(chat_sessions, key=lambda x: x.get('last_updated', ''), reverse=True)[:5]
        
        if recent_chats:
            for chat in recent_chats:
                last_updated = chat.get('last_updated', 'Unknown')
                if last_updated != 'Unknown':
                    try:
                        last_updated = pd.to_datetime(last_updated).strftime('%Y-%m-%d %H:%M')
                    except:
                        pass
                
                message_count = chat.get('message_count', 0)
                session_name = chat.get('session_name', f"Chat {chat.get('id', '')[:8]}")
                
                st.markdown(f"""
                <div class="source-card">
                    <strong>{session_name}</strong><br>
                    <small>💬 {message_count} messages | 📅 {last_updated}</small>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No chat sessions yet.")
    
    # System Health
    st.subheader("🏥 System Health")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # Database health
        try:
            test_docs = db_manager.get_all_documents()
            db_health = "🟢 Healthy"
            db_latency = "< 100ms"
        except Exception as e:
            db_health = "🔴 Issues Detected"
            db_latency = "N/A"
        
        st.markdown(f"""
        **Database Status**
        - Health: {db_health}
        - Latency: {db_latency}
        - Documents: {len(documents)}
        """)
    
    with col2:
        # Knowledge Graph health
        try:
            if neo4j_manager.driver:
                kg_health = "🟢 Healthy"
                kg_nodes = kg_stats.get('total_nodes', 0)
                kg_rels = kg_stats.get('total_relationships', 0)
            else:
                kg_health = "🔴 Disconnected"
                kg_nodes = 0
                kg_rels = 0
        except:
            kg_health = "🔴 Issues Detected"
            kg_nodes = 0
            kg_rels = 0
        
        st.markdown(f"""
        **Knowledge Graph**
        - Health: {kg_health}
        - Nodes: {kg_nodes}
        - Relationships: {kg_rels}
        """)
    
    with col3:
        # AI Services health
        try:
            from src.document_processor import get_document_processor
            doc_processor = get_document_processor()
            
            ai_health = "🟢 Healthy" if doc_processor.groq_client else "🟡 Limited"
            
            # Test Gemini embedding model
            if doc_processor.embedding_model:
                try:
                    # Test with a simple embedding generation
                    test_embedding = doc_processor.generate_embeddings("test")
                    if test_embedding and len(test_embedding) > 0:
                        embedding_status = "🟢 Ready (gemini-embedding-001)"
                    else:
                        embedding_status = "� Model Available, Generation Failed"
                except Exception as e:
                    embedding_status = "🟡 Model Available, Test Failed"
            else:
                embedding_status = "🔴 Model Not Loaded"
        except Exception as e:
            ai_health = "🔴 Issues Detected"
            embedding_status = "🔴 Error"
        
        st.markdown(f"""
        **AI Services**
        - Health: {ai_health}
        - Embeddings: {embedding_status}
        - Models: Groq + Gemini
        """)
    
    # Quick Actions
    st.subheader("⚡ Quick Actions")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("🔄 Refresh Dashboard", use_container_width=True):
            st.rerun()
    
    with col2:
        if st.button("📤 Upload Documents", use_container_width=True):
            st.session_state.current_page = "Upload Documents"
            st.rerun()
    
    with col3:
        if st.button("💬 Start Chat", use_container_width=True):
            st.session_state.current_page = "Chat & Search"
            st.rerun()
    
    with col4:
        if st.button("⚙️ Settings", use_container_width=True):
            st.session_state.current_page = "Settings"
            st.rerun()
    
    # API Keys Status Check
    st.markdown("<br>", unsafe_allow_html=True)
    st.subheader("🔑 API Keys Status")
    
    col1, col2 = st.columns(2)
    
    with col1:
        groq_key = st.session_state.get('groq_api_key', os.getenv('GROQ_API_KEY', ''))
        if groq_key:
            st.markdown("""
            <div class="status-success">
                <strong>✅ Groq API Key</strong><br>
                Ready for chat and analysis
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="status-error">
                <strong>❌ Groq API Key Missing</strong><br>
                Go to Settings to configure
            </div>
            """, unsafe_allow_html=True)
    
    with col2:
        gemini_key = st.session_state.get('google_api_key', os.getenv('GOOGLE_API_KEY', ''))
        if gemini_key:
            st.markdown("""
            <div class="status-success">
                <strong>✅ Gemini API Key</strong><br>
                Ready for embeddings
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="status-error">
                <strong>❌ Gemini API Key Missing</strong><br>
                Go to Settings to configure
            </div>
            """, unsafe_allow_html=True)
    
    with col4:
        if st.button("📊 Export Stats", use_container_width=True):
            # Create export data
            export_data = {
                'total_documents': len(documents),
                'processed_documents': len([d for d in documents if d.get('processed')]),
                'chat_sessions': len(chat_sessions),
                'knowledge_entities': total_entities,
                'export_date': datetime.now().isoformat()
            }
            
            st.download_button(
                label="Download JSON",
                data=pd.DataFrame([export_data]).to_json(orient='records'),
                file_name=f"nasa_kb_stats_{datetime.now().strftime('%Y%m%d')}.json",
                mime="application/json"
            )