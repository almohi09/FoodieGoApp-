# FoodieGo Production Deployment Guide

**Estimated Time:** 2-4 hours
**Difficulty:** Medium (no coding required)

---

## Prerequisites

- Supabase account (free tier works)
- Firebase account (free tier works)
- Render account (free tier works)
- GitHub repo access for CI/CD

---

## Step 1: Supabase Setup (30 minutes)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name:** `foodiego`
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
4. Click **Create new project**
5. Wait for project to provision (~2 minutes)

### 1.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   ```
   SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 1.3 Create Storage Bucket

1. Go to **Storage** in left sidebar
2. Click **New bucket**
3. Configure:
   - **Name:** `foodiego-storage`
   - **Public:** ❌ (keep private)
4. Click **Create bucket**

### 1.4 Apply RLS Policies

1. Go to **SQL Editor** in left sidebar
2. Copy and paste the entire SQL from:
   `backend/docs/supabase/STORAGE_RLS_POLICIES.md`
3. Click **Run**
4. Verify success message

### 1.5 Save Credentials

Create a `.env.production` file (or add to Render secrets later):

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_STORAGE_BUCKET=foodiego-storage
```

---

## Step 2: Firebase Setup (30 minutes)

### 2.1 Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. **Name:** `foodiego`
4. Disable Google Analytics (optional for MVP)
5. Click **Create project**
6. Wait for project to create

### 2.2 Enable Phone Authentication

1. Go to **Authentication** → **Get started**
2. Click **Phone** provider
3. Toggle **Enable** to ON
4. Click **Save**

### 2.3 Get Web API Key

1. Go to **Project Settings** (gear icon)
2. Under **Your apps**, click **Web** (`</>`)
3. **App nickname:** `foodiego-web`
4. Don't enable Firebase Hosting (optional)
5. Click **Register app**
6. Copy the **Web API Key**:
   ```
   FIREBASE_WEB_API_KEY = AIzaSyxxxxxxxxxxxxxxxxxxxxx
   ```

### 2.4 Add Test Phone Number (Development)

1. Go to **Authentication** → **Phone** → **Phone numbers to test**
2. Click **Add a phone number to test**
3. Enter your test number (e.g., `+919876543210`)
4. Enter a 6-digit code (e.g., `123456`)
5. Click **Add**

> **Note:** This allows testing without real SMS costs

---

## Step 3: Render Setup (45 minutes)

### 3.1 Connect GitHub Repository

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub account
4. Select the `FoodieGo` repository
5. Render should detect `render.yaml` automatically

### 3.2 Create Web Service

If no `render.yaml` exists, create manually:

1. Click **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `foodiego-api`
   - **Region:** Choose closest
   - **Branch:** `main`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

### 3.3 Add Environment Variables

Click **Environment** and add these secrets:

```env
# Required
NODE_ENV=production
USE_POSTGRES=true
DATABASE_URL=postgresql://user:password@host:5432/foodiego

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_STORAGE_BUCKET=foodiego-storage
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase
OTP_PROVIDER=firebase
FIREBASE_WEB_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxx

# Monitoring (optional for MVP)
# Leave empty for now, add later

# Security
PAYMENT_WEBHOOK_SECRET=your_random_secret_here
```

### 3.4 Create Database (Postgres)

1. Click **New +** → **PostgreSQL**
2. Configure:
   - **Name:** `foodiego-db`
   - **Plan:** Free
   - **Region:** Same as web service
3. Click **Create Database**
4. Copy the **Internal Database URL**
5. Paste it as `DATABASE_URL` in your web service

### 3.5 Deploy

1. Click **Create Web Service**
2. Wait for deployment (~3-5 minutes)
3. Note your deployment URL: `https://foodiego-api.onrender.com`

---

## Step 4: Run Validation Scripts (15 minutes)

### 4.1 Test Backend Locally First

```bash
cd backend

# Copy production-like env
cp .env.example .env.test

# Edit .env.test with your credentials
# Then run:

npm run secret:posture:check
npm run firebase:otp:drill
npm run render:deploy:validate
```

### 4.2 Test Staging Deployment

1. Go to your Render dashboard
2. Click your web service
3. Click **Environment** tab
4. Temporarily add:
   ```env
   NODE_ENV=staging
   ```
5. Click **Save Changes**
6. Wait for redeploy
7. Run:
   ```bash
   npm run test:e2e
   ```
8. Revert `NODE_ENV=staging` back to `production`

---

## Step 5: Complete Sign-Offs (15 minutes)

### 5.1 Fill Out Sign-Off Template

Open: `backend/docs/PRODUCTION_SIGN_OFF_TEMPLATE.md`

Fill in for each section:

1. **Engineering Lead** - Verify all endpoints work
2. **Security** - Verify all security checks pass
3. **Compliance** - Verify FSSAI/regulatory notes
4. **On-Call** - Verify runbooks accessible

### 5.2 Final Checklist

```markdown
## Pre-Deployment Checklist

- [ ] Supabase project created
- [ ] Supabase Storage bucket created
- [ ] Supabase RLS policies applied
- [ ] Firebase project created
- [ ] Firebase Phone auth enabled
- [ ] Firebase Web API key obtained
- [ ] Render connected to GitHub
- [ ] Render PostgreSQL created
- [ ] All env vars configured in Render
- [ ] Backend deployed to Render
- [ ] Health endpoint returns 200: https://your-api.onrender.com/api/v1/health
- [ ] `npm run secret:posture:check` passes
- [ ] `npm run firebase:otp:drill` passes
- [ ] `npm run test:e2e` passes (with running backend)
- [ ] All 4 sign-offs completed
```

---

## Quick Reference: Environment Variables

| Variable                     | Where to Get                   | Required |
| ---------------------------- | ------------------------------ | -------- |
| `DATABASE_URL`               | Render PostgreSQL              | ✅       |
| `NODE_ENV`                   | Set to `production`            | ✅       |
| `USE_POSTGRES`               | Set to `true`                  | ✅       |
| `SUPABASE_URL`               | Supabase Settings → API        | ✅       |
| `SUPABASE_STORAGE_BUCKET`    | Set to `foodiego-storage`      | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase Settings → API        | ✅       |
| `OTP_PROVIDER`               | Set to `firebase`              | ✅       |
| `FIREBASE_WEB_API_KEY`       | Firebase Project Settings      | ✅       |
| `PAYMENT_WEBHOOK_SECRET`     | Generate random 32-char string | ✅       |
| `MONITORING_SINK_URL`        | Optional for MVP               | ❌       |
| `MONITORING_SINK_AUTH_TOKEN` | Optional for MVP               | ❌       |

---

## Troubleshooting

### "Connection refused" errors

- Check Render service is running (green status)
- Verify `NODE_ENV=production` is set
- Check `USE_POSTGRES=true`

### "OTP provider mock" errors

- Verify `OTP_PROVIDER=firebase` is set
- Verify `FIREBASE_WEB_API_KEY` is correct

### "Supabase storage" errors

- Verify bucket name is exactly `foodiego-storage`
- Verify RLS policies were applied
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct

### Build failures

- Check `npm run build` works locally first
- Verify all env vars are set in Render
- Check Render logs for specific errors

---

## Next Steps After Deployment

1. **Frontend Deployment** - Deploy the React app to Vercel/Netlify
2. **Update CORS** - Add frontend domain to backend CORS config
3. **Configure DNS** - Point your domain to Render
4. **Set up CI/CD** - GitHub Actions will auto-deploy on push
5. **Monitor** - Set up monitoring dashboards
6. **Load Test** - Run `npm run perf:smoke` against production

---

## Need Help?

- Backend docs: `backend/docs/`
- Backend index: `backend/docs/00_BACKEND_INDEX.md`
- Implementation status: `backend/docs/03_BACKEND_READINESS_STATUS_2026-04-07.md`
