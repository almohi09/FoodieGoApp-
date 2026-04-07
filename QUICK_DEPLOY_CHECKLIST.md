# Quick-Start Deployment Checklist

**Time: 2-4 hours**

---

## Phase 1: Supabase (20 min) ☑️

- [ ] Create account at supabase.com
- [ ] Create project named `foodiego`
- [ ] Create storage bucket named `foodiego-storage`
- [ ] Go to SQL Editor
- [ ] Paste SQL from `backend/docs/supabase/STORAGE_RLS_POLICIES.md`
- [ ] Click **Run**
- [ ] Copy `SUPABASE_URL` from Settings → API
- [ ] Copy `SUPABASE_SERVICE_ROLE_KEY` from Settings → API

## Phase 2: Firebase (15 min) 🔥

- [ ] Create account at console.firebase.google.com
- [ ] Create project named `foodiego`
- [ ] Go to Authentication → Phone → Enable
- [ ] Go to Project Settings → Add Web App
- [ ] Copy `Web API Key`

## Phase 3: Render (30 min) 🚀

- [ ] Create account at dashboard.render.com
- [ ] New + → PostgreSQL → Create `foodiego-db`
- [ ] Copy **Internal Database URL**
- [ ] New + → Blueprint → Connect GitHub repo
- [ ] Or: New + → Web Service → Connect repo
- [ ] Add environment variables:

```bash
NODE_ENV=production
USE_POSTGRES=true
DATABASE_URL=postgresql://... (from Render PostgreSQL)

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_STORAGE_BUCKET=foodiego-storage
SUPABASE_SERVICE_ROLE_KEY=eyJ...

OTP_PROVIDER=firebase
FIREBASE_WEB_API_KEY=AIzaSy...

PAYMENT_WEBHOOK_SECRET=any_random_32_char_string
```

- [ ] Click **Save** or **Create**
- [ ] Wait for deploy (~3 min)
- [ ] Copy URL (e.g., `https://foodiego-api.onrender.com`)

## Phase 4: Test (10 min) ✅

Open terminal in `backend` folder:

```bash
# Test with production env
npm run secret:posture:check
npm run firebase:otp:drill
npm run render:deploy:validate
```

## Phase 5: Sign-Off (5 min) 📝

- [ ] Open `backend/docs/PRODUCTION_SIGN_OFF_TEMPLATE.md`
- [ ] Fill in Engineering Lead section
- [ ] Fill in Security section
- [ ] Fill in Compliance section
- [ ] Fill in On-Call section
- [ ] Get signatures

---

## Success Criteria

✅ Backend deployed and healthy:

```
https://your-api.onrender.com/api/v1/health
```

Should return `{"status":"ok"}`

✅ Supabase Storage working:

- Upload a test file via API

✅ Firebase OTP working:

- Send OTP via API
- Should not return mock OTP response

---

## If Something Goes Wrong

| Problem       | Solution                                |
| ------------- | --------------------------------------- |
| Build fails   | Check env vars in Render                |
| 503 errors    | `USE_POSTGRES=true` not set             |
| OTP fails     | `OTP_PROVIDER=firebase` + valid API key |
| Storage fails | Check bucket name + RLS policies        |

---

**Done!** 🎉
