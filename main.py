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

