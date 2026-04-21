import streamlit as st
import google.generativeai as genai

# --- 1. CONFIGURATION & SECRETS ---
st.set_page_config(page_title="Curtly v2", page_icon="🦉")

if "GEMINI_API_KEY" in st.secrets:
    api_key = st.secrets["GEMINI_API_KEY"]
    genai.configure(api_key=api_key)
else:
    st.error("API Key not found! Please add GEMINI_API_KEY to Streamlit Secrets.")

# --- 2. THE "WHAT'S NEW" MODAL ---
@st.dialog("What's New in Curtly v2", width="large")
def show_update():
    # This tries to show your logo if it's in the repo
    try:
        st.image("logo.png", use_container_width=True)
    except:
        st.write("✨ **Curtly v2.0 is here!**")
        
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

# Trigger the Greeting only once
if "seen_update" not in st.session_state:
    show_update()

# --- 3. THE APP UI ---
# --- 3. THE APP UI & CORE ENGINE ---
st.title("🦉 Curtly v2.0")

# Creating the functional tabs for your tools
tab1, tab2, tab3 = st.tabs(["📄 Upload File", "🔗 YouTube Link", "📸 Image"])

with tab1:
    uploaded_file = st.file_uploader("Upload academic module (PDF/Docx)", type=["pdf", "docx", "txt"])
    if uploaded_file:
        if st.button("Generate Reviewer", use_container_width=True):
            with st.spinner("Analyzing your module..."):
                # This is where your summarization logic will live
                st.success("Analysis complete! (Ready for logic paste)")

with tab2:
    yt_url = st.text_input("Paste YouTube Lecture Link")
    if yt_url:
        if st.button("Extract Notes", use_container_width=True):
            with st.spinner("Transcribing video..."):
                # This is where the youtube-transcript-api works
                st.info("YouTube integration is ready.")

with tab3:
    img_file = st.file_uploader("Upload handwritten notes or textbook shot", type=["png", "jpg", "jpeg"])
    if img_file:
        st.image(img_file, caption="Target Image")
        if st.button("Read & Summarize", use_container_width=True):
            with st.spinner("Scanning with Vision..."):
                # This uses the Gemini Vision model
                st.write("Vision engine online.")
import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="Curtly v2", page_icon="🦉")

if "GEMINI_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    st.error("API Key missing!")

# --- 2. GREETING MODAL ---
@st.dialog("What's New in Curtly v2")
def show_update():
    st.markdown("### **Build: 04222026**\n* 🚀 Faster Engine\n* 📺 YouTube Support\n* 📸 Image Reviewer")
    if st.button("Start Studying"):
        st.session_state.seen_update = True
        st.rerun()

if "seen_update" not in st.session_state:
    show_update()

# --- 3. MAIN UI ---
st.title("🦉 Curtly v2.0")

tab1, tab2, tab3 = st.tabs(["📄 Upload File", "🔗 YouTube Link", "📸 Image"])

with tab1:
    uploaded_file = st.file_uploader("Upload academic module", type=["pdf", "docx", "txt"])
    if uploaded_file and st.button("Generate Reviewer"):
        with st.spinner("Analyzing..."):
            # Simple prompt for immediate testing
            content = uploaded_file.read().decode("utf-8", errors="ignore")
            response = model.generate_content(f"Summarize this academic material into a reviewer: {content}")
            st.markdown(response.text)

with tab2:
    yt_link = st.text_input("Paste YouTube Link")
    if yt_link and st.button("Extract Notes"):
        with st.spinner("Transcribing..."):
            try:
                video_id = yt_link.split("v=")[1].split("&")[0]
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
                text = " ".join([t['text'] for t in transcript])
                response = model.generate_content(f"Turn this video transcript into study notes: {text}")
                st.markdown(response.text)
            except Exception as e:
                st.error("Could not get transcript. Make sure the video has captions!")

with tab3:
    img_file = st.file_uploader("Upload notes photo", type=["png", "jpg", "jpeg"])
    if img_file and st.button("Read & Summarize"):
        with st.spinner("Vision engine scanning..."):
            from PIL import Image
            img = Image.open(img_file)
            response = model.generate_content(["Summarize the text in this image:", img])
            st.markdown(response.text)
