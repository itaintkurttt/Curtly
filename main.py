import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from PIL import Image
from PyPDF2 import PdfReader
from docx import Document
import io

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="Curtly v2.0", page_icon="🦉")

if "GEMINI_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    st.error("API Key missing! Check Streamlit Secrets.")

# --- 2. GREETING MODAL ---
@st.dialog("What's New in Curtly v2", width="large")
def show_update():
    try:
        st.image("logo.png", use_container_width=True)
    except:
        st.subheader("🦉 Curtly v2.0 is live!")
    st.markdown("""
    ### **Build: 04222026 Update**
    * **🚀 Pro-Level Extraction** – Now reads PDFs and Word Docs properly.
    * **🧠 Smart Summarization** – Structured reviewers for school modules.
    * **🖼️ Vision Engine** – Scan textbook pages and handwritten notes.
    """)
    if st.button("Start Studying", use_container_width=True):
        st.session_state.seen_update = True
        st.rerun()

if "seen_update" not in st.session_state:
    show_update()

# --- 3. HELPER FUNCTIONS ---
def get_pdf_text(file):
    reader = PdfReader(file)
    return " ".join([page.extract_text() for page in reader.pages])

def get_docx_text(file):
    doc = Document(file)
    return " ".join([para.text for para in doc.paragraphs])

# --- 4. MAIN UI ---
st.title("🦉 Curtly v2.0")

tab1, tab2, tab3 = st.tabs(["📄 Upload Module", "🔗 YouTube Link", "📸 Image"])

with tab1:
    st.subheader("Module Reviewer Generator")
    uploaded_file = st.file_uploader("Upload PDF, Docx, or TXT", type=["pdf", "docx", "txt"])
    
    if uploaded_file and st.button("Generate Reviewer", key="file_btn"):
        with st.spinner("Extracting content and generating reviewer..."):
            try:
                # Determine file type and extract text
                if uploaded_file.name.endswith('.pdf'):
                    text = get_pdf_text(uploaded_file)
                elif uploaded_file.name.endswith('.docx'):
                    text = get_docx_text(uploaded_file)
                else:
                    text = uploaded_file.read().decode("utf-8", errors="ignore")
                
                # Send to Gemini
                prompt = f"Act as an expert academic summarizer. Create a detailed reviewer from this module. Use bullet points, bold key terms, and ensure no jargon is used so it is easy to understand: {text}"
                response = model.generate_content(prompt)
                st.markdown("---")
                st.markdown(response.text)
            except Exception as e:
                st.error(f"Error reading file: {e}")

with tab2:
    st.subheader("Lecture Video Analyzer")
    yt_link = st.text_input("Paste YouTube Link")
    if yt_link and st.button("Extract Notes", key="yt_btn"):
        with st.spinner("Getting transcript..."):
            try:
                video_id = yt_link.split("v=")[1].split("&")[0]
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
                full_text = " ".join([t['text'] for t in transcript])
                response = model.generate_content(f"Turn this lecture transcript into organized study notes: {full_text}")
                st.markdown("---")
                st.markdown(response.text)
            except:
                st.error("Transcript unavailable. Try a video with manual captions!")

with tab3:
    st.subheader("Vision Note Scanner")
    img_file = st.file_uploader("Upload photo", type=["png", "jpg", "jpeg"])
    if img_file and st.button("Analyze Image", key="img_btn"):
        with st.spinner("Reading image..."):
            img = Image.open(img_file)
            response = model.generate_content(["Summarize the content of this study material:", img])
            st.markdown("---")
            st.markdown(response.text)
