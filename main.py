import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from PIL import Image

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="Curtly v2.0", page_icon="🦉")

# Securely connecting to your Gemini API Key
if "GEMINI_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    st.error("API Key missing! Please check your Streamlit Secrets.")

# --- 2. THE "WHAT'S NEW" MODAL ---
@st.dialog("What's New in Curtly v2", width="large")
def show_update():
    try:
        st.image("logo.png", use_container_width=True)
    except:
        st.subheader("🦉 Curtly v2.0 is officially live!")
    
    st.markdown("""
    ### **Build: 04222026 Update**
    * **🚀 Enhanced Generation Engine** – Faster, more stable performance.
    * **🧠 Smart Summarization** – Now **expands** on topics instead of just extracting.
    * **🖼️ Image Recognition** – Analysis for your handwritten notes and screenshots.
    * **📺 YouTube Integration (BETA)** – Turn lecture links into full reviewers.
    """)
    if st.button("Start Studying", use_container_width=True):
        st.session_state.seen_update = True
        st.rerun()

# Trigger the Greeting only once per session
if "seen_update" not in st.session_state:
    show_update()

# --- 3. MAIN UI ---
st.title("🦉 Curtly v2.0")

tab1, tab2, tab3 = st.tabs(["📄 Upload File", "🔗 YouTube Link", "📸 Image"])

with tab1:
    st.subheader("Module Summarizer")
    uploaded_file = st.file_uploader("Upload academic module (PDF/Docx/TXT)", type=["pdf", "docx", "txt"])
    if uploaded_file and st.button("Generate Reviewer", key="file_btn"):
        with st.spinner("Analyzing your module..."):
            try:
                # Basic text extraction for immediate testing
                content = uploaded_file.read().decode("utf-8", errors="ignore")
                prompt = f"Act as a professional study assistant. Summarize this academic material into a structured reviewer with key terms and explanations: {content}"
                response = model.generate_content(prompt)
                st.markdown("---")
                st.markdown(response.text)
            except Exception as e:
                st.error(f"Error processing file: {e}")

with tab2:
    st.subheader("YouTube Lecture to Notes")
    yt_link = st.text_input("Paste YouTube Lecture URL")
    if yt_link and st.button("Extract Notes", key="yt_btn"):
        with st.spinner("Transcribing video..."):
            try:
                # Extract Video ID from URL
                video_id = yt_link.split("v=")[1].split("&")[0]
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
                text = " ".join([t['text'] for t in transcript])
                
                prompt = f"Turn this video transcript into a comprehensive study guide with bullet points: {text}"
                response = model.generate_content(prompt)
                st.markdown("---")
                st.markdown(response.text)
            except Exception:
                st.error("Could not retrieve transcript. Please ensure the video has English captions enabled.")

with tab3:
    st.subheader("Visual Note Scanner")
    img_file = st.file_uploader("Upload a photo of your notes or textbook", type=["png", "jpg", "jpeg"])
    if img_file and st.button("Read & Summarize", key="img_btn"):
        with st.spinner("Scanning with Vision..."):
            try:
                img = Image.open(img_file)
                prompt = "Read the text in this image and provide a clear, organized summary of the information."
                response = model.generate_content([prompt, img])
                st.markdown("---")
                st.markdown(response.text)
            except Exception as e:
                st.error(f"Vision Error: {e}")
