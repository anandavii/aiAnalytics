# AI Data Analytics Dashboard

A production-grade AI-powered data analytics dashboard built with Next.js, FastAPI, and Google Gemini.

## 🚀 Quick Start (Single Command)

We have provided a helper script to start both the backend and frontend services with one command.

```bash
./start_app.sh
```

This script will:
1. Setup the Python virtual environment (if missing).
2. Install Python dependencies.
3. Start the FastAPI Backend (Port 8000).
4. Start the Next.js Frontend (Port 3000).

> **Note**: You must have your `GEMINI_API_KEY` set in `v1.0/backend/.env` before running.

---

## 🛠 Manual Setup (Step-by-Step)

If you prefer to run services manually, follow these steps in **two separate terminal windows**.

### Terminal 1: Backend

```bash
cd v1.0/backend

# 1. Create virtual environment (first time only)
python3 -m venv venv

# 2. Activate virtual environment
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure Environment
# Copy .env.example to .env and add your API Key
cp ../.env.example .env

# 5. Run Server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2: Frontend

```bash
cd v1.0/frontend

# 1. Install dependencies (first time only)
npm install

# 2. Run Development Server
npm run dev
```

### 4. Configuration
The application uses a `.env` file in `v1.0/backend/.env` for configuration.

**LLM Provider (New in v1.3):**
You can switch between Google Gemini (Default) and OpenAI (ChatGPT).

*   **To use Google Gemini:**
    ```bash
    LLM_PROVIDER=gemini
    GEMINI_API_KEY=your_gemini_key
    ```
*   **To use OpenAI:**
    ```bash
    LLM_PROVIDER=openai
    OPENAI_API_KEY=your_openai_key
    ```
*After changing the provider, you must restart the application.*

### 5. Running the App

1. Open your browser to `http://localhost:3000`
2. Click **Get Started**.
3. **Upload**: Use the provided `test_data.csv` (or any CSV/Excel).
4. **Clean**: Go to the "Data Cleaning" tab to see AI suggestions.
