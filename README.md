# Voter Information Portal — Vercel Edition

Single Vercel deployment. React frontend + MongoDB-backed serverless API, all in one project.

## ⚠️ First: rotate your MongoDB password

You shared the password in chat earlier — assume it's leaked.

1. Atlas → **Database Access** → edit user `radiant` → **Edit Password** → set a new one
2. Use the new password in `.env` (local) AND Vercel env vars (production)
3. URL-encode special chars: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`

## Project structure

```
.
├── api/                       ← Vercel serverless functions
│   ├── _lib/mongo.ts          ← Cached MongoDB client (shared)
│   ├── health.ts              ← GET /api/health
│   ├── search.ts              ← GET /api/search
│   ├── voter/[epic].ts        ← GET/PUT /api/voter/:epic
│   └── part/[partNo].ts       ← GET /api/part/:partNo
├── src/                       ← React frontend (Vite)
│   ├── App.tsx
│   ├── components/VoterCard.tsx
│   ├── services/apiService.ts
│   └── ...
├── .env.example
├── package.json
├── vercel.json
└── vite.config.ts
```

The `api/` folder is automatically picked up by Vercel — each `.ts` file becomes its own serverless function. No Express server needed in production.

## Local development

You have two ways to run locally.

### Option A — Use `vercel dev` (recommended, mimics production)

```bash
npm install
npm install -g vercel        # one-time
cp .env.example .env         # then fill in your password
vercel link                  # one-time, links project to your Vercel account
vercel dev
```

This runs the frontend AND the serverless functions together at `http://localhost:3000`. API calls to `/api/*` work exactly as they will in production.

### Option B — Just run the frontend (Vite only)

If you don't want to set up the Vercel CLI yet, you can deploy first and just run the frontend pointing at the deployed API:

```bash
npm install
echo 'VITE_API_BASE=https://your-app.vercel.app' > .env.local
npm run preview      # or build and serve
```

## Deployment to Vercel

### One-time setup

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Vercel auto-detects Vite → keep defaults → **Deploy**
4. After first deploy, go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `MONGO_URI` | `mongodb+srv://radiant:YOUR_NEW_PASSWORD@electoral.qgwtgva.mongodb.net/?appName=Electoral` |
| `DB_NAME` | `elections` |
| `MONGO_COLLECTION` | `voters_ac34` |

5. Click **Redeploy** so the new env vars apply

### Whitelist Vercel in MongoDB Atlas

Vercel functions run from variable IPs. The simplest path:

- Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
- Tighter alternative: enable **Atlas Private Endpoint** (requires paid Atlas tier)

Without this, every API call will time out with `ServerSelectionTimeoutError`.

## Verify it works

After deploying, hit:
```
https://your-app.vercel.app/api/health
```

You should see:
```json
{"ok":true,"docs":287900,"db":"elections","collection":"voters_ac34"}
```

If you see `MONGO_URI environment variable is not set`, you forgot Step 4 above. Re-add the env var and redeploy.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Sanity check |
| GET | `/api/voter/:epic` | Lookup by EPIC number (returns array, since some EPICs are duplicated) |
| GET | `/api/part/:partNo?page=1&limit=200` | Voters in a polling part |
| GET | `/api/search?q=...&gender=M&minAge=20&maxAge=40&page=1` | Smart search (auto-detects EPIC, mobile, name) |
| PUT | `/api/voter/:epic` | Update Aadhaar + Mobile (body: `{adharNumber, mobileNumber}`) |

## Performance notes

- **Cold start**: ~500-1500 ms on the first request after idle (Vercel spins up the function). Warm requests are 50-200 ms.
- **MongoDB connection caching**: `api/_lib/mongo.ts` caches the client across warm invocations, so subsequent calls reuse the connection.
- **Indexes**: All search queries use the indexes you created earlier (`epic_idx`, `name_text_idx`, `part_serial_idx`, etc.) so even on cold start the actual query is <50 ms.

## Free tier limits

- **Vercel Hobby**: 100 GB bandwidth/month, plenty for a voter lookup site
- **Vercel function invocations**: 100k/day free
- **MongoDB Atlas M0**: 512 MB storage, your data uses ~100 MB

## ⚠️ Aadhaar disclosure (production reminder)

The current `/api/voter/:epic` returns the full Aadhaar number. If this site goes public, mask it server-side (e.g. `XXXX-XXXX-1234`) — the Aadhaar Act in India regulates disclosure. Easy to add to `toClientShape()` in `api/_lib/mongo.ts`:

```ts
AdharNumber: doc.aadhaar ? `XXXX-XXXX-${String(doc.aadhaar).slice(-4)}` : '',
```
