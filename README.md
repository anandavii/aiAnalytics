# AI Analytico

<div align="center">

![AI Analytico](https://img.shields.io/badge/AI-Analytico-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNSIvPjxwYXRoIGQ9Ik0yIDEybDEwIDUgMTAtNSIvPjwvc3ZnPg==)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/u/anandavii)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)

**AI-powered data analytics dashboard for intelligent data exploration and visualization**

[Get Started](#-quick-start-docker) • [Features](#-features) • [Local Development](#-local-development) • [Configuration](#-configuration)

</div>

---

## ✨ Features

- � **AI-Powered Analytics** — Natural language chat interface for data exploration
- 🧹 **Intelligent Data Cleaning** — AI-generated suggestions for data quality improvement
- 📈 **Dynamic Visualizations** — Interactive charts with Plotly
- 📑 **Custom Reports** — Build and export customizable dashboards
- 🔄 **Multi-LLM Support** — Choose between Google Gemini or OpenAI

---

## 🐳 Quick Start (Docker)

The fastest way to get started is with Docker. Our published images are ready to use.

### 1. Create a docker-compose.yml

```yaml
version: "3.9"

services:
  backend:
    image: anandavii/aianalytico-backend:1.1.0
    container_name: aianalytico-backend
    ports:
      - "8000:8000"
    environment:
      LLM_PROVIDER: ${LLM_PROVIDER}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    restart: unless-stopped

  frontend:
    image: anandavii/aianalytico-frontend:1.1.0
    container_name: aianalytico-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

### 2. Create a .env file

```bash
# Choose your LLM provider: gemini or openai
LLM_PROVIDER=gemini

# API Keys (add the one you're using)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run the application

```bash
docker compose up -d
```

### 4. Access the dashboard

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

---

## 🛠 Local Development

For development, you can run the services locally without Docker.

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm

### Quick Start (Single Command)

```bash
./start_app.sh
```

This script sets up the Python environment, installs dependencies, and starts both services.

### Manual Setup

**Terminal 1: Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # Add your API keys
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2: Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuration

Configure the application via environment variables in `.env`:

| Variable | Description | Options |
|----------|-------------|---------|
| `LLM_PROVIDER` | AI provider to use | `gemini` (default), `openai` |
| `GEMINI_API_KEY` | Google Gemini API key | Required if using Gemini |
| `OPENAI_API_KEY` | OpenAI API key | Required if using OpenAI |

> **Note**: Restart the application after changing the LLM provider.

---

## 📖 Usage

1. Open http://localhost:3000
2. Click **Get Started**
3. **Upload** a CSV or Excel file
4. **Explore** your data with the AI-powered chat
5. **Clean** data using intelligent suggestions
6. **Visualize** with dynamic charts
7. **Build** custom reports and export them

---

## 🏗 Architecture

```
┌─────────────────┐       ┌─────────────────┐
│    Frontend     │──────▶│     Backend     │
│   (Next.js)     │◀──────│    (FastAPI)    │
│   Port 3000     │       │    Port 8000    │
└─────────────────┘       └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │   LLM Provider  │
                          │ Gemini / OpenAI │
                          └─────────────────┘
```

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/anandavii">anandavii</a>
</div>
