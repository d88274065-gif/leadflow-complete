# VelocityAI CRM

An enterprise-grade, AI-driven CRM platform for lead acquisition, sales pipeline automation, and growth insights.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file (already included) with your Base44 app credentials:
   ```
   VITE_BASE44_APP_ID=your_app_id
   VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
   ```

3. Run locally:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

## Deployment

This app can be deployed to Vercel, Netlify, or GitHub Pages. Make sure to set the
environment variables (`VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`) in your
hosting provider's dashboard, since the `.env` file is git-ignored by default.

The app connects to its data backend (leads, deals, contacts, etc.) through the
Base44 SDK using the App ID above — your data and authentication continue working
exactly as they did inside the Base44 editor.
