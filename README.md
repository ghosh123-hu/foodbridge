# FoodShare 🥗

Connect people who want to donate excess food with those who need it.

## Stack
- **Frontend** — plain HTML/CSS/JS (no build step needed)
- **Backend** — Node.js + Express
- **Database** — PostgreSQL on [Neon](https://neon.tech)
- **Auth** — JWT (stored in localStorage)

---

## Setup (5 steps)

### 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is plenty)
2. Click **New Project** → name it `foodshare`
3. Once created, go to **Dashboard → Connection string**
4. Copy the connection string — it looks like:
   ```
   postgresql://alex:password@ep-cool-name.us-east-2.aws.neon.tech/foodshare?sslmode=require
   ```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and paste your Neon connection string + generate a JWT secret:

```bash
# Generate a secure JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Install dependencies & set up the database

```bash
cd backend
npm install

# Creates tables and inserts seed data
npm run db:setup
```

You should see:
```
✅ users table ready
✅ listings table ready
✅ Seed data inserted
🎉 Database ready!
```

### 4. Start the backend

```bash
npm run dev
# → API running at http://localhost:4000
```

Verify it's working:
```bash
curl http://localhost:4000/api/health
# {"status":"ok","time":"..."}
```

### 5. Open the frontend

In a new terminal:

```bash
cd frontend
python3 -m http.server 3000
# → open http://localhost:3000
```

Or just double-click `frontend/index.html` — it works without a server too.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, get JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/listings` | — | Browse listings (`?type=donate&category=Produce`) |
| GET | `/api/listings/stats` | — | Counts for dashboard |
| GET | `/api/listings/mine` | ✅ | Your own listings |
| POST | `/api/listings` | ✅ | Create a listing |
| PATCH | `/api/listings/:id/claim` | ✅ | Claim a listing |
| DELETE | `/api/listings/:id` | ✅ | Remove your listing |

---

## Project structure

```
foodshare/
├── backend/
│   ├── db/
│   │   ├── client.js       Neon connection
│   │   └── setup.js        Table creation + seed data
│   ├── middleware/
│   │   └── auth.js         JWT verification
│   ├── routes/
│   │   ├── auth.js         Register / login / me
│   │   └── listings.js     CRUD for listings
│   ├── server.js           Express app entry point
│   ├── .env.example        Environment variable template
│   └── package.json
└── frontend/
    └── index.html          Single-file frontend
```

---

## What's next

- **Messaging** — in-app chat or WhatsApp deep-link between donor and claimer
- **Image uploads** — let donors attach a photo (Cloudflare R2 or Supabase Storage)
- **Push notifications** — alert users when new food posts near their area
- **Map view** — show listings on a map with distance filter
- **OTP login** — phone number auth (more common in India, no password needed)
- **Deploy** — backend to Railway/Render, frontend to Vercel/Netlify
