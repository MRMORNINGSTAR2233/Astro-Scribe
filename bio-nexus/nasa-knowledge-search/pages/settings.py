import streamlit as st
import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def show_settings_page():
    """Display the settings page for API key configuration"""
    
    # Page header with enhanced styling
    st.markdown("""
    <div class="section-header">
        <h3>⚙️ Settings & Configuration</h3>
        <p>Configure your API keys for AI services</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # API Keys Configuration Section
    st.markdown("""
    <div class="section-header">
        <h4>🔑 API Keys Configuration</h4>
        <p>Enter your API keys to enable AI-powered features</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Create two columns for the API key inputs
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**🤖 Groq AI API Key**")
        st.markdown("*Used for chat responses and document analysis*")
        
        # Get current Groq API key
        current_groq_key = st.session_state.get('groq_api_key', os.getenv('GROQ_API_KEY', ''))
        
        groq_api_key = st.text_input(
            "Enter your Groq API Key",
            value=current_groq_key,
            type="password",
            help="Get your free API key from https://console.groq.com/keys",
            key="groq_input"
        )
        
        if st.button("Test Groq Connection", key="test_groq"):
            if groq_api_key:
                test_groq_connection(groq_api_key)
            else:
                st.error("Please enter a Groq API key first")
    
    with col2:
        st.markdown("**🧠 Google Gemini API Key**")
        st.markdown("*Used for document embeddings and enhanced AI features*")
        
        # Get current Gemini API key
        current_gemini_key = st.session_state.get('google_api_key', os.getenv('GOOGLE_API_KEY', ''))
        
        gemini_api_key = st.text_input(
            "Enter your Google Gemini API Key",
            value=current_gemini_key,
            type="password",
            help="Get your free API key from https://aistudio.google.com/app/apikey",
            key="gemini_input"
        )
        
        if st.button("Test Gemini Connection", key="test_gemini"):
            if gemini_api_key:
                test_gemini_connection(gemini_api_key)
            else:
                st.error("Please enter a Gemini API key first")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Save Configuration Section
    st.markdown("""
    <div class="section-header">
        <h4>💾 Save Configuration</h4>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 1, 1])
    
    with col1:
        if st.button("💾 Save API Keys", type="primary", use_container_width=True):
            save_api_keys(groq_api_key, gemini_api_key)
    
    with col2:
        if st.button("🔄 Reset to Defaults", use_container_width=True):
            reset_api_keys()
    
    with col3:
        if st.button("✅ Test All Connections", use_container_width=True):
            test_all_connections(groq_api_key, gemini_api_key)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # API Key Information Section
    st.markdown("""
    <div class="section-header">
        <h4>📋 API Key Information</h4>
    </div>
    """, unsafe_allow_html=True)
    
    with st.expander("🔍 How to get API Keys"):
        st.markdown("""
        ### 🤖 Groq AI API Key
        1. Visit [Groq Console](https://console.groq.com/keys)
        2. Sign up or log in to your account
        3. Navigate to "API Keys" section
        4. Click "Create API Key"
        5. Copy the generated key and paste it above
        
        **Features powered by Groq:**
        - Chat responses and conversations
        - Document analysis and summarization
        - Research question answering
        
        ### 🧠 Google Gemini API Key
        1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
        2. Sign in with your Google account
        3. Click "Create API Key"
        4. Copy the generated key and paste it above
        
        **Features powered by Gemini:**
        - Document embeddings for semantic search
        - Enhanced AI analysis
        - Vector similarity matching
        """)
    
    with st.expander("🔒 Security & Privacy"):
        st.markdown("""
        ### Security Information
        - API keys are stored securely in your session
        - Keys are not logged or saved permanently
        - All communications use HTTPS encryption
        - You can reset or change keys anytime
        
        ### Privacy Notice
        - Your documents and conversations may be processed by AI services
        - No data is permanently stored by third-party AI providers
        - Review each provider's privacy policy for detailed information
        """)
    
    # Current Status Section
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("""
    <div class="section-header">
        <h4>📊 Current Status</h4>
    </div>
    """, unsafe_allow_html=True)
    
    display_current_status()

def test_groq_connection(api_key):
    """Test Groq API connection"""
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        # Test with a simple completion
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Hello, this is a test."}],
            max_tokens=10
        )
        
        if response and response.choices:
            st.success("✅ Groq API connection successful!")
            return True
        else:
            st.error("❌ Groq API test failed - No response received")
            return False
            
    except Exception as e:
        st.error(f"❌ Groq API test failed: {str(e)}")
        return False

def test_gemini_connection(api_key):
    """Test Gemini API connection"""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Test with a simple embedding
        result = genai.embed_content(
            model="models/embedding-001",
            content="Hello, this is a test."
        )
        
        if result and 'embedding' in result and len(result['embedding']) > 0:
            st.success("✅ Gemini API connection successful!")
            return True
        else:
            st.error("❌ Gemini API test failed - No embedding received")
            return False
            
    except Exception as e:
        st.error(f"❌ Gemini API test failed: {str(e)}")
        return False

def save_api_keys(groq_key, gemini_key):
    """Save API keys to session state and environment"""
    try:
        # Update session state
        if groq_key:
            st.session_state.groq_api_key = groq_key
            os.environ['GROQ_API_KEY'] = groq_key
        
        if gemini_key:
            st.session_state.google_api_key = gemini_key
            os.environ['GOOGLE_API_KEY'] = gemini_key
        
        # Reinitialize components with new keys
        if 'doc_processor' in st.session_state:
            del st.session_state.doc_processor
        if 'rag_system' in st.session_state:
            del st.session_state.rag_system
        
        st.success("✅ API keys saved successfully! Please refresh the page to apply changes.")
        st.balloons()
        
    except Exception as e:
        st.error(f"❌ Error saving API keys: {str(e)}")

def reset_api_keys():
    """Reset API keys to defaults"""
    try:
        # Clear from session state
        if 'groq_api_key' in st.session_state:
            del st.session_state.groq_api_key
        if 'google_api_key' in st.session_state:
            del st.session_state.google_api_key
        
        # Reset form
        st.session_state.groq_input = ""
        st.session_state.gemini_input = ""
        
        st.success("✅ API keys reset to defaults!")
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Error resetting API keys: {str(e)}")

def test_all_connections(groq_key, gemini_key):
    """Test all API connections"""
    st.markdown("### Testing All Connections...")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Testing Groq...**")
        groq_success = test_groq_connection(groq_key) if groq_key else False
        if not groq_key:
            st.warning("⚠️ No Groq API key provided")
    
    with col2:
        st.markdown("**Testing Gemini...**")
        gemini_success = test_gemini_connection(gemini_key) if gemini_key else False
        if not gemini_key:
            st.warning("⚠️ No Gemini API key provided")
    
    if groq_success and gemini_success:
        st.success("🎉 All API connections successful!")
    elif groq_success or gemini_success:
        st.info("ℹ️ Some API connections successful. Check individual results above.")
    else:
        st.error("❌ All API connection tests failed. Please check your keys.")

def display_current_status():
    """Display current API key status"""
    col1, col2 = st.columns(2)
    
    with col1:
        groq_key = st.session_state.get('groq_api_key', os.getenv('GROQ_API_KEY', ''))
        if groq_key:
            st.markdown(f"""
            <div class="status-success">
                <strong>✅ Groq API</strong><br>
                Key configured (ends with: ...{groq_key[-4:] if len(groq_key) >= 4 else '****'})
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="status-error">
                <strong>❌ Groq API</strong><br>
                No API key configured
            </div>
            """, unsafe_allow_html=True)
    
    with col2:
        gemini_key = st.session_state.get('google_api_key', os.getenv('GOOGLE_API_KEY', ''))
        if gemini_key:
            st.markdown(f"""
            <div class="status-success">
                <strong>✅ Gemini API</strong><br>
                Key configured (ends with: ...{gemini_key[-4:] if len(gemini_key) >= 4 else '****'})
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="status-error">
                <strong>❌ Gemini API</strong><br>
                No API key configured
            </div>
            """, unsafe_allow_html=True)