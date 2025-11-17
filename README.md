# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/94153c60-7d9e-4841-b392-60e080f90a8b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/94153c60-7d9e-4841-b392-60e080f90a8b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment setup (frontend + backend)

Both the React frontend and FastAPI backend read variables from a **single** `.env` file located in the project root.

1. Copy `env.example` → `.env`
2. Adjust the values:

| Variable | Used by | Description |
| --- | --- | --- |
| `MONGO_URI` | backend | Connection string for MongoDB |
| `MONGO_DB` | backend | Database name |
| `ADMIN_IDS` | both | Comma-separated Telegram admin IDs |
| `TELEGRAM_BOT_TOKEN` | backend | (Optional) bot token for notifications |
| `JWT_SECRET` | backend | Secret for signing tokens |
| `VITE_API_URL` | frontend | URL of the FastAPI service (default `http://localhost:8000/api`) |
| `VITE_ADMIN_IDS` | frontend | Same admin IDs for client-side checks |
| `VITE_USE_MOCK_CATALOG` | frontend | `true` to use local mock data, `false` when backend is ready |

> **Important:** `.env` is ignored by git. Keep credentials only in this local file (or environment variables on the server).

### Running locally

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
npm install
npm run dev
```

The frontend uses the values from `.env` automatically (thanks to `VITE_*` prefixes) and will switch off the mock catalog once you set `VITE_USE_MOCK_CATALOG=false`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/94153c60-7d9e-4841-b392-60e080f90a8b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
