import streamlit as st
import os
import tempfile
import logging
from pathlib import Path
from typing import List, Dict, Any
import asyncio
import time
import json
import uuid
from src.document_processor import get_document_processor

logger = logging.getLogger(__name__)

def show_upload_page():
    """Display the document upload page with bulk upload capabilities"""
    
    # Page header with enhanced styling
    st.markdown("""
    <div class="section-header">
        <h3>📤 Upload Documents</h3>
        <p>Upload NASA research documents to expand the knowledge base</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Get components
    try:
        db_manager = st.session_state.get('db_manager')
        if not db_manager:
            st.markdown("""
            <div class="status-error">
                <strong>❌ Database Error</strong><br>
                Database manager not found in session state
            </div>
            """, unsafe_allow_html=True)
            return
            
        doc_processor = st.session_state.get('doc_processor')
        if not doc_processor:
            from src.document_processor import get_document_processor
            doc_processor = get_document_processor()
            st.session_state.doc_processor = doc_processor
            
    except Exception as e:
        st.markdown(f"""
        <div class="status-error">
            <strong>❌ Initialization Error</strong><br>
            {str(e)[:100]}...
        </div>
        """, unsafe_allow_html=True)
        return
    
    # Upload tabs
    tab1, tab2, tab3 = st.tabs(["📁 File Upload", "📂 Bulk Upload", "🔗 Process Existing"])
    
    with tab1:
        show_single_file_upload(db_manager, doc_processor)
    
    with tab2:
        show_bulk_upload(db_manager, doc_processor)
    
    with tab3:
        show_existing_files_processing(db_manager, doc_processor)

def show_single_file_upload(db_manager, doc_processor):
    """Single file upload interface"""
    st.markdown("""
    <div class="section-header">
        <h4>📄 Upload Single Document</h4>
    </div>
    """, unsafe_allow_html=True)
    
    # File uploader
    uploaded_file = st.file_uploader(
        "Choose a document",
        type=['pdf', 'txt', 'docx', 'pptx'],
        help="Supported formats: PDF, TXT, DOCX, PPTX"
    )
    
    if uploaded_file is not None:
        # Display file info with enhanced cards
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{uploaded_file.name[:20]}...</p>
                <p class="metric-label">File Name</p>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{uploaded_file.size / 1024:.1f} KB</p>
                <p class="metric-label">File Size</p>
            </div>
            """, unsafe_allow_html=True)
        with col3:
            st.markdown(f"""
            <div class="metric-card">
                <p class="metric-value">{uploaded_file.type.split('/')[-1].upper()}</p>
                <p class="metric-label">File Type</p>
            </div>
            """, unsafe_allow_html=True)
        
        # Processing options with enhanced styling
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown("""
        <div class="section-header">
            <h4>⚙️ Processing Options</h4>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2 = st.columns(2)
        
        with col1:
            extract_entities = st.checkbox("Extract entities for knowledge graph", value=True)
            chunk_document = st.checkbox("Split into chunks for better search", value=True)
        
        with col2:
            generate_summary = st.checkbox("Generate document summary", value=True)
            create_embeddings = st.checkbox("Create vector embeddings", value=True)
        
        # Process button
        if st.button("🚀 Process Document", type="primary", use_container_width=True):
            process_single_document(
                uploaded_file, db_manager, doc_processor,
                extract_entities, chunk_document, generate_summary, create_embeddings
            )

def show_bulk_upload(db_manager, doc_processor):
    """Bulk upload interface"""
    st.markdown("""
    <div class="section-header">
        <h4>📂 Bulk Document Upload</h4>
        <p>Upload multiple documents at once for batch processing</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Multiple file uploader
    uploaded_files = st.file_uploader(
        "Choose multiple documents",
        type=['pdf', 'txt', 'docx', 'pptx'],
        accept_multiple_files=True,
        help="You can select multiple files at once"
    )
    
    if uploaded_files:
        st.markdown(f"**Selected {len(uploaded_files)} files:**")
        
        # Display file list
        for i, file in enumerate(uploaded_files):
            col1, col2, col3 = st.columns([3, 1, 1])
            
            with col1:
                st.text(f"{i+1}. {file.name}")
            with col2:
                st.text(f"{file.size / 1024:.1f} KB")
            with col3:
                st.text(file.type.split('/')[-1].upper())
        
        st.markdown("---")
        
        # Bulk processing options
        st.subheader("Bulk Processing Options")
        
        col1, col2 = st.columns(2)
        
        with col1:
            extract_entities = st.checkbox("Extract entities", value=True, key="bulk_entities")
            chunk_document = st.checkbox("Split into chunks", value=True, key="bulk_chunks")
        
        with col2:
            generate_summary = st.checkbox("Generate summaries", value=True, key="bulk_summary")
            create_embeddings = st.checkbox("Create embeddings", value=True, key="bulk_embeddings")
        
        # Processing strategy
        processing_strategy = st.selectbox(
            "Processing Strategy",
            ["Sequential (one by one)", "Parallel (faster, more resource intensive)"],
            help="Sequential is more reliable, parallel is faster"
        )
        
        # Process button
        if st.button("🚀 Process All Documents", type="primary", use_container_width=True):
            process_bulk_documents(
                uploaded_files, db_manager, doc_processor,
                extract_entities, chunk_document, generate_summary, create_embeddings,
                processing_strategy
            )

def show_upload_page():
    """Display the document upload page with bulk upload capabilities"""
    st.header("📤 Document Upload")
    st.markdown("Upload and process NASA research documents for analysis.")
    
    try:
        db_manager = st.session_state.db_manager
        doc_processor = get_document_processor()
        
        if not db_manager or not doc_processor:
            st.error("Required components not initialized")
            return
            
        tab1, tab2, tab3 = st.tabs(["📁 File Upload", "📂 Bulk Upload", "🔗 Process Existing"])
        
        with tab1:
            show_single_file_upload(db_manager, doc_processor)
        
        with tab2:
            show_bulk_upload(db_manager, doc_processor)
        
        with tab3:
            show_existing_files_processing(db_manager, doc_processor)
            
    except Exception as e:
        st.error(f"Error initializing upload page: {str(e)}")
        st.exception(e)

def show_single_file_upload(db_manager, doc_processor):
    """Single file upload interface"""
    st.markdown("### Single File Upload")
    st.markdown("Upload and process individual research documents.")
    
    uploaded_file = st.file_uploader(
        "Choose a PDF file",
        type=['pdf'],
        help="Select a PDF document to upload"
    )
    
    if uploaded_file:
        st.success(f"File uploaded: {uploaded_file.name}")
        
        # File information
        st.markdown("#### File Information")
        col1, col2 = st.columns(2)
        
        with col1:
            st.write(f"**Size:** {uploaded_file.size / 1024:.1f} KB")
            extract_entities = st.checkbox("Extract entities for knowledge graph", value=True)
            chunk_document = st.checkbox("Split into chunks for better search", value=True)
        
        with col2:
            generate_summary = st.checkbox("Generate document summary", value=True)
            create_embeddings = st.checkbox("Create vector embeddings", value=True)
        
        # Process button
        if st.button("🚀 Process Document", type="primary", use_container_width=True):
            try:
                with st.spinner("Processing document..."):
                    process_single_document(
                        uploaded_file, db_manager, doc_processor,
                        extract_entities, chunk_document, generate_summary, create_embeddings
                    )
                st.success("Document processed successfully!")
            except Exception as e:
                st.error(f"Error processing document: {str(e)}")
                st.exception(e)
def show_bulk_upload(db_manager, doc_processor):
    """Bulk upload interface"""
    st.markdown("### Bulk Upload")
    st.markdown("Upload and process multiple research documents at once.")
    
    uploaded_files = st.file_uploader(
        "Choose PDF files",
        type=['pdf'],
        accept_multiple_files=True,
        help="Select multiple PDF documents to upload"
    )
    
    if uploaded_files:
        st.success(f"Files uploaded: {len(uploaded_files)} documents")
        
        # Upload settings
        st.markdown("#### Processing Settings")
        col1, col2 = st.columns(2)
        
        with col1:
            extract_entities = st.checkbox("Extract entities (KG)", value=True, key="bulk_extract")
            chunk_document = st.checkbox("Split into chunks", value=True, key="bulk_chunk")
            
        with col2:
            generate_summary = st.checkbox("Generate summaries", value=True, key="bulk_summary")
            create_embeddings = st.checkbox("Create embeddings", value=True, key="bulk_embed")
        
        # Processing strategy
        processing_strategy = st.radio(
            "Processing Strategy",
            ["Sequential", "Parallel"],
            help="Sequential: Process one by one. Parallel: Process multiple files simultaneously"
        )
        
        # File list
        st.markdown("#### Files to Process")
        for file in uploaded_files:
            st.markdown(f"- 📄 {file.name} ({file.size / 1024:.1f} KB)")
        
        # Process button
        if st.button("🚀 Process All Documents", type="primary", use_container_width=True):
            try:
                with st.spinner("Processing documents..."):
                    process_bulk_documents(
                        uploaded_files, db_manager, doc_processor,
                        extract_entities, chunk_document, generate_summary, create_embeddings,
                        processing_strategy.lower()
                    )
                st.success("All documents processed successfully!")
            except Exception as e:
                st.error(f"Error processing documents: {str(e)}")
                st.exception(e)
def show_existing_files_processing(db_manager, doc_processor):
    """Process existing files from nasa-pdf directory"""
    st.subheader("Process Existing NASA PDFs")
    st.markdown("Process PDFs from the existing nasa-pdf directory.")
    
    # Check for existing PDF directory
    pdf_dir = Path("/app/nasa-pdf")  # Docker path
    if not pdf_dir.exists():
        pdf_dir = Path("../nasa-pdf")  # Local development path
    
    if not pdf_dir.exists():
        st.warning("NASA PDF directory not found. Please ensure the PDFs are mounted correctly.")
        return
    
    # Get list of PDF files
    pdf_files = list(pdf_dir.glob("*.pdf"))
    
    if not pdf_files:
        st.info("No PDF files found in the directory.")
        return
    
    st.info(f"Found {len(pdf_files)} PDF files in the directory.")
    
    # Check which files are already processed
    try:
        existing_docs = db_manager.get_all_documents()
        existing_filenames = {doc['filename'] for doc in existing_docs}
        
        unprocessed_files = [f for f in pdf_files if f.name not in existing_filenames]
        processed_files = [f for f in pdf_files if f.name in existing_filenames]
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Unprocessed Files", len(unprocessed_files))
        with col2:
            st.metric("Already Processed", len(processed_files))
        
    except Exception as e:
        st.error(f"Error checking existing documents: {e}")
        unprocessed_files = pdf_files
        processed_files = []
    
    # File selection
    if unprocessed_files:
        st.subheader("Select Files to Process")
        
        # Select all/none buttons
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Select All"):
                for i, file in enumerate(unprocessed_files):
                    st.session_state[f"file_{i}"] = True
        
        with col2:
            if st.button("Select None"):
                for i, file in enumerate(unprocessed_files):
                    st.session_state[f"file_{i}"] = False
        
        # File checkboxes
        selected_files = []
        for i, file in enumerate(unprocessed_files[:50]):  # Limit to first 50 for performance
            if st.checkbox(
                f"{file.name} ({file.stat().st_size / 1024 / 1024:.1f} MB)",
                key=f"file_{i}"
            ):
                selected_files.append(file)
        
        if len(unprocessed_files) > 50:
            st.warning(f"Showing first 50 files. Total unprocessed: {len(unprocessed_files)}")
        
        # Processing options
        if selected_files:
            st.subheader("Processing Options")
            
            col1, col2 = st.columns(2)
            
            with col1:
                extract_entities = st.checkbox("Extract entities", value=True, key="existing_entities")
                chunk_document = st.checkbox("Split into chunks", value=True, key="existing_chunks")
            
            with col2:
                generate_summary = st.checkbox("Generate summaries", value=True, key="existing_summary")
                create_embeddings = st.checkbox("Create embeddings", value=True, key="existing_embeddings")
            
            # Batch size
            batch_size = st.slider("Batch Size", min_value=1, max_value=10, value=5, 
                                 help="Number of files to process simultaneously")
            
            # Process button
            if st.button(f"🚀 Process {len(selected_files)} Selected Files", type="primary", use_container_width=True):
                process_existing_files(
                    selected_files, db_manager, doc_processor,
                    extract_entities, chunk_document, generate_summary, create_embeddings,
                    batch_size
                )
    else:
        st.success("All PDF files have been processed!")
        
        if st.button("🔄 Refresh File List"):
            st.rerun()

def process_single_document(uploaded_file, db_manager, doc_processor, 
                          extract_entities, chunk_document, generate_summary, create_embeddings):
    """Process a single uploaded document"""
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded_file.name}") as tmp_file:
            tmp_file.write(uploaded_file.getbuffer())
            tmp_file_path = tmp_file.name
        
        status_text.text("📄 Extracting content...")
        progress_bar.progress(10)
        
        # Process document
        processed_data = doc_processor.process_file(tmp_file_path, uploaded_file.name)
        
        if not processed_data['content']:
            st.error("Failed to extract content from the document.")
            return
        
        progress_bar.progress(30)
        status_text.text("📝 Generating summary...")
        
        # Generate summary if requested
        summary = ""
        if generate_summary:
            summary = doc_processor.summarize_document(processed_data['content'])
        
        progress_bar.progress(50)
        status_text.text("🔤 Creating embeddings...")
        
        # Generate embeddings if requested
        embedding = None
        if create_embeddings:
            embedding_result = doc_processor.generate_embeddings(processed_data['content'])
            if embedding_result and isinstance(embedding_result, list) and len(embedding_result) > 0:
                # Format embedding as a proper vector string for PostgreSQL
                try:
                    embedding = f"[{','.join(map(str, embedding_result))}]"
                    logger.info(f"Generated embedding vector with {len(embedding_result)} dimensions")
                except Exception as e:
                    logger.error(f"Error formatting embedding vector: {e}")
                    embedding = None
            else:
                logger.warning("No valid embedding generated for document")
                embedding = None
        
        progress_bar.progress(70)
        status_text.text("💾 Saving to database...")
        
        # Prepare document data for database
        document_data = {
            'filename': uploaded_file.name,
            'title': processed_data['title'],
            'content': processed_data['content'],
            'summary': summary,
            'file_type': uploaded_file.type,
            'file_size': uploaded_file.size,
            'metadata': json.dumps(processed_data.get('metadata', {})),
            'embedding': embedding
        }
        
        # Insert document
        document_id = db_manager.insert_document(document_data)
        
        progress_bar.progress(80)
        status_text.text("🧩 Processing chunks...")
        
        # Process chunks if requested
        if chunk_document:
            chunks = doc_processor.chunk_document(processed_data['content'])
            
            for i, chunk in enumerate(chunks):
                chunk_embedding = None
                if create_embeddings:
                    embedding_result = doc_processor.generate_embeddings(chunk['content'])
                    if embedding_result and isinstance(embedding_result, list) and len(embedding_result) > 0:
                        # Format embedding as a proper vector string for PostgreSQL
                        try:
                            chunk_embedding = f"[{','.join(map(str, embedding_result))}]"
                        except Exception as e:
                            logger.error(f"Error formatting chunk embedding: {e}")
                            chunk_embedding = None
                    else:
                        chunk_embedding = None
                
                chunk_data = {
                    'document_id': document_id,
                    'chunk_index': i,
                    'content': chunk['content'],
                    'chunk_type': chunk.get('chunk_type', 'text'),
                    'page_number': chunk.get('page_number'),
                    'embedding': chunk_embedding,
                    'metadata': json.dumps(chunk)
                }
                
                db_manager.insert_document_chunk(chunk_data)
        
        progress_bar.progress(90)
        status_text.text("🕸️ Extracting entities...")
        
        # Extract entities and build knowledge graph if requested
        if extract_entities:
            entities = doc_processor.extract_entities(processed_data['content'])
            
            # Add entities to knowledge graph
            from src.neo4j_manager import get_neo4j_manager
            neo4j_manager = get_neo4j_manager()
            
            if neo4j_manager.driver:
                # Create document node
                neo4j_manager.create_document_node({
                    'id': document_id,
                    'filename': uploaded_file.name,
                    'title': processed_data['title'],
                    'file_type': uploaded_file.type,
                    'upload_date': str(time.time()),
                    'summary': summary
                })
                
                # Process entities
                for entity in entities:
                    entity_id = str(uuid.uuid4())
                    entity_embedding = []
                    if create_embeddings:
                        entity_embedding = doc_processor.generate_embeddings(entity['description'])
                    
                    # Add to PostgreSQL
                    entity_data = {
                        'name': entity['name'],
                        'entity_type': entity['type'],
                        'description': entity['description'],
                        'properties': json.dumps(entity),
                        'embedding': entity_embedding
                    }
                    
                    try:
                        pg_entity_id = db_manager.insert_kg_entity(entity_data)
                        
                        # Add to Neo4j
                        neo4j_entity_data = {
                            'id': pg_entity_id,
                            'name': entity['name'],
                            'entity_type': entity['type'],
                            'description': entity['description']
                        }
                        
                        neo4j_manager.create_entity_node(neo4j_entity_data)
                        
                        # Create relationship between document and entity
                        neo4j_manager.create_document_entity_relationship(document_id, pg_entity_id)
                        
                    except Exception as e:
                        logger.error(f"Error adding entity to knowledge graph: {e}")
        
        progress_bar.progress(100)
        status_text.text("✅ Processing complete!")
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        
        st.success(f"✅ Successfully processed '{uploaded_file.name}'!")
        
        # Display results
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Document Information:**")
            st.text(f"Title: {processed_data['title']}")
            st.text(f"Content Length: {len(processed_data['content'])} characters")
            st.text(f"Chunks Created: {len(chunks) if chunk_document else 0}")
        
        with col2:
            st.markdown("**Processing Results:**")
            st.text(f"Summary Generated: {'Yes' if summary else 'No'}")
            st.text(f"Embeddings Created: {'Yes' if embedding else 'No'}")
            st.text(f"Entities Extracted: {len(entities) if extract_entities else 0}")
        
        if summary:
            st.markdown("**Summary:**")
            st.text_area("Document Summary", summary, height=100, disabled=True)
        
    except Exception as e:
        progress_bar.progress(0)
        status_text.text("❌ Processing failed!")
        st.error(f"Error processing document: {str(e)}")
        logger.error(f"Error processing document {uploaded_file.name}: {e}")
    
    finally:
        # Clean up temporary file if it exists
        try:
            if 'tmp_file_path' in locals():
                os.unlink(tmp_file_path)
        except:
            pass

def process_bulk_documents(uploaded_files, db_manager, doc_processor,
                         extract_entities, chunk_document, generate_summary, create_embeddings,
                         processing_strategy):
    """Process multiple documents in bulk"""
    
    st.markdown("### Processing Documents...")
    
    # Create progress tracking
    overall_progress = st.progress(0)
    current_file_text = st.empty()
    
    # Results tracking
    results = {
        'successful': [],
        'failed': [],
        'total_entities': 0,
        'total_chunks': 0
    }
    
    total_files = len(uploaded_files)
    
    for i, uploaded_file in enumerate(uploaded_files):
        current_file_text.text(f"Processing {i+1}/{total_files}: {uploaded_file.name}")
        
        try:
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded_file.name}") as tmp_file:
                tmp_file.write(uploaded_file.getbuffer())
                tmp_file_path = tmp_file.name
            
            # Process document (simplified version of single document processing)
            processed_data = doc_processor.process_file(tmp_file_path, uploaded_file.name)
            
            if processed_data['content']:
                # Generate summary
                summary = ""
                if generate_summary:
                    summary = doc_processor.summarize_document(processed_data['content'])
                
                # Generate embeddings
                embedding = None
                if create_embeddings:
                    embedding_result = doc_processor.generate_embeddings(processed_data['content'])
                    if embedding_result and isinstance(embedding_result, list) and len(embedding_result) > 0:
                        # Format embedding as a proper vector string for PostgreSQL
                        try:
                            embedding = f"[{','.join(map(str, embedding_result))}]"
                        except Exception as e:
                            logger.error(f"Error formatting bulk embedding: {e}")
                            embedding = None
                    else:
                        embedding = None
                
                # Save to database
                document_data = {
                    'filename': uploaded_file.name,
                    'title': processed_data['title'],
                    'content': processed_data['content'],
                    'summary': summary,
                    'file_type': uploaded_file.type,
                    'file_size': uploaded_file.size,
                    'metadata': json.dumps(processed_data.get('metadata', {})),
                    'embedding': embedding
                }
                
                document_id = db_manager.insert_document(document_data)
                
                # Process chunks
                chunks_created = 0
                if chunk_document:
                    chunks = doc_processor.chunk_document(processed_data['content'])
                    chunks_created = len(chunks)
                    
                    for chunk_idx, chunk in enumerate(chunks):
                        chunk_embedding = []
                        if create_embeddings:
                            chunk_embedding = doc_processor.generate_embeddings(chunk['content'])
                        
                        chunk_data = {
                            'document_id': document_id,
                            'chunk_index': chunk_idx,
                            'content': chunk['content'],
                            'chunk_type': chunk.get('chunk_type', 'text'),
                            'page_number': chunk.get('page_number'),
                            'embedding': chunk_embedding,
                            'metadata': json.dumps(chunk)
                        }
                        
                        db_manager.insert_document_chunk(chunk_data)
                
                # Extract entities (simplified for bulk processing)
                entities_created = 0
                if extract_entities:
                    entities = doc_processor.extract_entities(processed_data['content'])
                    entities_created = len(entities)
                    # Note: Simplified entity processing for bulk upload
                
                results['successful'].append({
                    'filename': uploaded_file.name,
                    'chunks': chunks_created,
                    'entities': entities_created
                })
                
                results['total_chunks'] += chunks_created
                results['total_entities'] += entities_created
                
            else:
                results['failed'].append({
                    'filename': uploaded_file.name,
                    'error': 'Failed to extract content'
                })
            
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
        except Exception as e:
            results['failed'].append({
                'filename': uploaded_file.name,
                'error': str(e)
            })
            logger.error(f"Error processing {uploaded_file.name}: {e}")
        
        # Update progress
        overall_progress.progress((i + 1) / total_files)
    
    # Display results
    current_file_text.text("✅ Bulk processing complete!")
    
    st.markdown("### Processing Results")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Successful", len(results['successful']))
    with col2:
        st.metric("Failed", len(results['failed']))
    with col3:
        st.metric("Total Entities", results['total_entities'])
    
    # Show successful files
    if results['successful']:
        st.markdown("#### ✅ Successfully Processed")
        for item in results['successful']:
            st.text(f"✓ {item['filename']} ({item['chunks']} chunks, {item['entities']} entities)")
    
    # Show failed files
    if results['failed']:
        st.markdown("#### ❌ Failed to Process")
        for item in results['failed']:
            st.text(f"✗ {item['filename']}: {item['error']}")

def process_existing_files(selected_files, db_manager, doc_processor,
                         extract_entities, chunk_document, generate_summary, create_embeddings,
                         batch_size):
    """Process existing files from the NASA PDF directory"""
    
    st.markdown("### Processing Existing Files...")
    
    # Create progress tracking
    overall_progress = st.progress(0)
    current_file_text = st.empty()
    
    # Results tracking
    results = {
        'successful': [],
        'failed': [],
        'total_entities': 0,
        'total_chunks': 0
    }
    
    total_files = len(selected_files)
    
    for i, file_path in enumerate(selected_files):
        current_file_text.text(f"Processing {i+1}/{total_files}: {file_path.name}")
        
        try:
            # Process document
            processed_data = doc_processor.process_file(str(file_path), file_path.name)
            
            if processed_data['content']:
                # Generate summary
                summary = ""
                if generate_summary:
                    summary = doc_processor.summarize_document(processed_data['content'])
                
                # Generate embeddings
                embedding = None
                if create_embeddings:
                    embedding_result = doc_processor.generate_embeddings(processed_data['content'])
                    if embedding_result and isinstance(embedding_result, list) and len(embedding_result) > 0:
                        # Format embedding as a proper vector string for PostgreSQL
                        try:
                            embedding = f"[{','.join(map(str, embedding_result))}]"
                        except Exception as e:
                            logger.error(f"Error formatting existing file embedding: {e}")
                            embedding = None
                
                # Save to database
                document_data = {
                    'filename': file_path.name,
                    'title': processed_data['title'],
                    'content': processed_data['content'],
                    'summary': summary,
                    'file_type': 'application/pdf',
                    'file_size': file_path.stat().st_size,
                    'metadata': json.dumps(processed_data.get('metadata', {})),
                    'embedding': embedding
                }
                
                document_id = db_manager.insert_document(document_data)
                
                # Process chunks
                chunks_created = 0
                if chunk_document:
                    chunks = doc_processor.chunk_document(processed_data['content'])
                    chunks_created = len(chunks)
                    
                    for chunk_idx, chunk in enumerate(chunks):
                        chunk_embedding = []
                        if create_embeddings:
                            chunk_embedding = doc_processor.generate_embeddings(chunk['content'])
                        
                        chunk_data = {
                            'document_id': document_id,
                            'chunk_index': chunk_idx,
                            'content': chunk['content'],
                            'chunk_type': chunk.get('chunk_type', 'text'),
                            'page_number': chunk.get('page_number'),
                            'embedding': chunk_embedding,
                            'metadata': json.dumps(chunk)
                        }
                        
                        db_manager.insert_document_chunk(chunk_data)
                
                # Extract entities
                entities_created = 0
                if extract_entities:
                    entities = doc_processor.extract_entities(processed_data['content'])
                    entities_created = len(entities)
                    # Simplified entity processing for bulk upload
                
                results['successful'].append({
                    'filename': file_path.name,
                    'chunks': chunks_created,
                    'entities': entities_created
                })
                
                results['total_chunks'] += chunks_created
                results['total_entities'] += entities_created
                
            else:
                results['failed'].append({
                    'filename': file_path.name,
                    'error': 'Failed to extract content'
                })
            
        except Exception as e:
            results['failed'].append({
                'filename': file_path.name,
                'error': str(e)
            })
            logger.error(f"Error processing {file_path.name}: {e}")
        
        # Update progress
        overall_progress.progress((i + 1) / total_files)
    
    # Display results
    current_file_text.text("✅ Processing complete!")
    
    st.markdown("### Processing Results")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Successful", len(results['successful']))
    with col2:
        st.metric("Failed", len(results['failed']))
    with col3:
        st.metric("Total Entities", results['total_entities'])
    
    # Show detailed results
    if results['successful']:
        with st.expander("✅ Successfully Processed Files"):
            for item in results['successful']:
                st.text(f"✓ {item['filename']} ({item['chunks']} chunks, {item['entities']} entities)")
    
    if results['failed']:
        with st.expander("❌ Failed Files"):
            for item in results['failed']:
                st.text(f"✗ {item['filename']}: {item['error']}")