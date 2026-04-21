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
st.title("🦉 Curtly v2.0")
st.write("Welcome to your independent study assistant.")

