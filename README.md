# AI-Powered Code Review Copilot

A collaborative, real-time code review tool. Connect a GitHub repository, select an open pull request, and generate structured review comments (bugs, security issues, code smells, nits) powered by Gemini that stream live into a collaborative diff viewer via Socket.io.

## Project Structure

```
├── docs/                 # Product and Architecture Specifications
├── frontend/             # Next.js (App Router), React, Tailwind CSS
└── backend/              # Node.js, Express, Socket.io, Mongoose, Gemini API
```

## Quick Start

### 1. Backend Setup
```bash
cd backend
cp .env.example .env     # Fill in your secrets and API keys
npm install
npm run dev              # Starts Express & Socket.io server on http://localhost:5001
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # Starts Next.js app on http://localhost:3000
```
