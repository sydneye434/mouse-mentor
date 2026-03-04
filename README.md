# Mouse Mentor

A web app for planning Disney trips via an AI chat assistant.

## Prerequisites

- **Node.js** (for the frontend) — [nodejs.org](https://nodejs.org)
- **Python 3.10+** (for the backend) — [python.org](https://www.python.org)

## Running the application locally

You need to run both the backend and the frontend. Use two terminals.

### 1. Start the backend (Python API)

In a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **macOS / Linux:** `source .venv/bin/activate`
- **Windows (Command Prompt):** `.venv\Scripts\activate.bat`
- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`

Then install dependencies and start the server:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Leave this terminal running. You should see something like: `Uvicorn running on http://127.0.0.1:8000`.

### 2. Start the frontend (React app)

Open a **second** terminal (from the project root, not inside `backend`):

```bash
npm install
npm run dev
```

Leave this terminal running. You should see something like: `Local: http://localhost:5173/`.

### 3. Access the app in your web browser

1. Open your browser (Chrome, Firefox, Safari, or Edge).
2. Go to: **http://localhost:5173**
3. You should see the Mouse Mentor chat interface. Type a message and click **Send** to talk to the assistant (the backend returns a placeholder reply until you add an LLM).

**URLs at a glance:**

| What              | URL                    |
|-------------------|------------------------|
| **App (use this)**| http://localhost:5173  |
| Backend API       | http://localhost:8000  |
| API docs (Swagger)| http://localhost:8000/docs |

If the backend is not running, the chat will show an error asking you to start it.

## Optional: Custom API URL

If your backend runs on a different host or port, create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8000
```

Replace the URL as needed, then restart the frontend (`npm run dev`).

## Frontend scripts

- `npm run dev` — start dev server (for local development)
- `npm run build` — build for production
- `npm run preview` — serve the production build locally

## Backend API

- **GET** `/health` — health check
- **POST** `/chat` — send messages and get an assistant reply (body: `{ "messages": [{ "role": "user", "text": "..." }] }`)

The `/chat` endpoint currently returns a placeholder reply; you can add an LLM or other logic in `backend/main.py`.
