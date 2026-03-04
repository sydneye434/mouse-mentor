# Mouse Mentor

A web app for planning Disney trips via an AI chat assistant. Users go through a short **get-to-know-you** questionnaire (destination, dates, party, where they want to stay, first visit or returning, priorities, pace, dietary notes) or skip it, then chat with the assistant; trip details are sent with each message for personalized replies.

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
3. You’ll see the **get-to-know-you** flow first: answer a few questions (destination, dates, who’s going, where you want to stay, first visit or returning, vibe, and anything else). You can choose **Skip for now** to go straight to chat, or complete the steps and click **Start planning**.
4. After that, the main **chat** view appears. Type a message and click **Send** to talk to the assistant (the backend returns a placeholder reply until you add an LLM). Your trip details are sent with each message so responses can be personalized.

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
- **POST** `/chat` — send messages and get an assistant reply. Body: `{ "messages": [{ "role": "user", "text": "..." }], "trip_info": { ... } }`. `trip_info` is optional and can include destination, dates, party size, on-site/off-site stay, resort tier, first visit, priorities, trip pace, dietary notes, etc. (see `TripInfo` in `backend/main.py`).

The `/chat` endpoint currently returns a placeholder reply; you can add an LLM or other logic in `backend/main.py`.

## CI pipeline and quality checks

GitHub Actions runs on push/PR to `main` (or `master`) and verifies:

- **Formatting** — Prettier (frontend), Black (backend)
- **Linting** — ESLint (frontend), Ruff (backend)
- **Unit tests** — Vitest with coverage (frontend), pytest with coverage (backend). Coverage must meet thresholds (frontend: see `vite.config.js`; backend: 50%).
- **Security** — `npm audit` (frontend), Bandit + pip-audit (backend)

Run the same checks locally:

**Frontend (from project root):**
```bash
npm ci
npm run format:check
npm run lint
npm run test:coverage
```

**Backend (from `backend/` with venv active):**
```bash
pip install -r requirements.txt -r requirements-dev.txt
black --check .
ruff check .
pytest --cov=. --cov-report=term-missing --cov-fail-under=50
bandit -r . -x ./tests
pip-audit -r requirements.txt
```

## Pre-commit hook

A pre-commit hook reformats and lints staged code so it passes the pipeline checks.

**One-time setup:**

1. Install [pre-commit](https://pre-commit.com/) (e.g. `pip install pre-commit` or `brew install pre-commit`).
2. From the project root, run:
   ```bash
   pre-commit install
   ```

After that, every `git commit` will:

- **Frontend:** run Prettier and ESLint (with `--fix`) on staged JS/JSX/CSS/JSON and `index.html`.
- **Backend:** run Black and Ruff (with `--fix`) on staged Python files under `backend/`.

If any tool changes files, the commit is aborted so you can review and re-commit. Run `pre-commit run --all-files` to check the whole repo without committing.
