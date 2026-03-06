# Mouse Mentor

Developed by Sydney Edwards.

A web app for planning Disney trips via an AI chat assistant. Users go through a short **get-to-know-you** questionnaire (destination, dates, party, where they want to stay, first visit or returning, priorities, pace, dietary notes) or skip it, then chat with the assistant; trip details are sent with each message for personalized replies. **Saving a trip requires a user account.** On the final step (step 8: “Save your trip?”), guests can **Sign in** or **Register** (email + password); only when signed in can they opt in to save their trip. Saved data is tied to the **user account**, not to IP or browser session. An info icon (ℹ) explains this; signed-in users who opted in can delete their saved data from the chat page at any time.

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

**Auto-refresh:** Both servers automatically pick up changes:

- **Backend:** `--reload` makes Uvicorn watch `backend/` and restart when you save Python files.
- **Frontend:** Vite’s Hot Module Replacement (HMR) updates the browser when you save frontend files (no full reload needed for most changes).

**One command (Mac/Linux):** From the project root you can start both with:

```bash
npm run dev:all
```

This runs the backend and frontend in one terminal; both still auto-reload on file changes. (On Windows, use two terminals as above.)

### 3. Access the app in your web browser

1. Open your browser (Chrome, Firefox, Safari, or Edge).
2. Go to: **http://localhost:5173**
3. Use **Sign in** in the header to log in or create an account (email + password). You can also skip and use the app without an account, but **saving your trip requires signing in**.
4. You’ll see the **get-to-know-you** flow: answer a few questions (destination, dates, who’s going, where you want to stay, first visit or returning, vibe, and anything else). You can choose **Skip for now** to go straight to chat, or complete the steps and click **Next** through to the last step.
5. The final step (step 8) is **Save your trip on the server?** — If you’re **not signed in**, you’ll see **Sign in to save your trip**; after signing in you can turn on the save option. If you’re **signed in**, a checkbox is off by default; an **info icon (ℹ)** explains that data is linked to your account. Only when you turn it on will your trip be stored so you can return to it from any device.
6. After you click **Start planning**, the main **chat** view appears. If you’re signed in and opted in to save, you’ll see: “FYI — you chose to save your data on the backend, so we are.” You can **Delete my saved data** at any time (with confirmation: “Yes, really delete all my data from the backend servers”).
7. Type a message and click **Send** to talk to the assistant. The backend uses **Groq** (default, free) or **Google Gemini** plus **web search** (DuckDuckGo) so answers use your trip details and up-to-date public information. Set **GROQ_API_KEY** or **GEMINI_API_KEY** in the backend (see below).

**URLs at a glance:**

| What              | URL                    |
|-------------------|------------------------|
| **App (use this)**| http://localhost:5173  |
| Backend API       | http://localhost:8000  |
| API docs (Swagger)| http://localhost:8000/docs |

If the backend is not running, the chat will show an error asking you to start it. **Creating an account or signing in will also fail** (e.g. “Not found”) if the backend is not running — the frontend sends auth requests to the same origin in dev, and Vite proxies them to the backend.

## Optional: Custom API URL

If your backend runs on a different host or port, create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8000
```

Replace the URL as needed, then restart the frontend (`npm run dev`). **In development, if you do not set `VITE_API_URL`, the app uses relative URLs and Vite proxies `/auth`, `/chat`, `/trip`, and `/health` to `http://localhost:8000`** — so keep the backend running on port 8000.

## Backend AI (chat)

The `/chat` endpoint uses:

- **Your trip info** — destination, dates, party, priorities, etc., so answers are personalized.
- **Web search** — DuckDuckGo is queried for the latest public info (e.g. park hours, dining, tips) and snippets are passed to the model.
- **Groq (default) or Google Gemini** — set `AI_PROVIDER=groq` (default) or `AI_PROVIDER=gemini` in `.env`. Both have free tiers.

**Setup (Groq, default):**

1. Get a free API key at [console.groq.com](https://console.groq.com).
2. In the `backend` folder, copy `.env.example` to `.env` if needed, then set:
   ```bash
   AI_PROVIDER=groq
   GROQ_API_KEY=your-groq-key-here
   ```
3. Restart the backend.

**Using Gemini instead:**

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com).
2. In `backend/.env` set:
   ```bash
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-gemini-key-here
   ```
3. Restart the backend.

Optional: set `GROQ_MODEL` (e.g. `llama-3.3-70b-versatile`) or `GEMINI_MODEL` (e.g. `gemini-2.0-flash`) in `.env`. If the chosen provider’s API key is not set, the chat will ask you to add it.

## Frontend scripts

- `npm run dev` — start frontend dev server (HMR: auto-refresh on save)
- `npm run dev:all` — start backend + frontend together (Mac/Linux; both auto-reload)
- `npm run build` — build for production
- `npm run preview` — serve the production build locally

## Backend API

- **GET** `/health` — health check
- **POST** `/auth/register` — create account. Body: `{ "email": "...", "password": "..." }`. Password at least 8 characters. Returns `{ "access_token": "...", "token_type": "bearer", "email": "..." }`.
- **POST** `/auth/login` — sign in. Body: `{ "email": "...", "password": "..." }`. Returns `{ "access_token": "...", "token_type": "bearer", "email": "..." }`.
- **GET** `/trip` — return the current user’s saved trip. **Requires auth:** `Authorization: Bearer <access_token>`. Returns `{ "trip": { ... } }` or `{ "trip": null }`.
- **DELETE** `/trip` — permanently delete the current user’s saved trip. **Requires auth:** `Authorization: Bearer <access_token>`. Returns `{ "deleted": true }`.
- **POST** `/chat` — send messages and get an assistant reply. Body: `{ "messages": [{ "role": "user", "text": "..." }], "trip_info": { ... }, "save_trip": false }`. **`save_trip` defaults to `false`.** When `true`, trip data is stored for the current user (requires `Authorization: Bearer <access_token>`); when `false`, any previously saved trip for that user is removed. Unauthenticated requests with `save_trip: true` receive 401.

The `/chat` endpoint currently returns a placeholder reply; you can add an LLM or other logic in `backend/main.py`.

Saved trip data is stored in SQLite (`backend/saved_trips.db`) in a `saved_trips` table keyed by `user_id`. User accounts are stored in a `users` table in the same database (email + bcrypt-hashed password). JWT access tokens are used for authentication.

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
