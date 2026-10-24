# Hotel Food Ordering Website — Setup Guide

## Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL + Realtime)
- **Images:** Cloudinary CDN

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Go to **SQL Editor** and paste the entire contents of `supabase/schema.sql`, then click **Run**.
3. Go to **Database → Extensions** and enable **pg_cron** (needed for the daily reset).
4. Go to **Database → Replication** and make sure `orders` is listed under the realtime publication.
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Create admin account
In **Authentication → Users**, click **Invite user** (or **Add user**) and create your admin email/password. That account will have full admin access via RLS.

---

## Step 2 — Create a Cloudinary account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up (free tier is generous).
2. From your **Dashboard**, copy your **Cloud Name** → `VITE_CLOUDINARY_CLOUD_NAME`.
3. Go to **Settings → Upload → Upload presets** → click **Add upload preset**.
   - **Preset name:** `hotel_menu_unsigned`
   - **Signing Mode:** `Unsigned`
   - **Folder:** `hotel-menu`
   - Save.
4. Copy the preset name → `VITE_CLOUDINARY_UPLOAD_PRESET`.

---

## Step 3 — Configure environment variables

Create a `.env` file in the project root (copy from `.env.example`):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=hotel_menu_unsigned
```

> **Never commit this file.** It is already in `.gitignore`.

---

## Step 4 — Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` for the customer menu.  
Open `http://localhost:5173/admin/login` for the admin panel.

---

## Step 5 — Deploy (Vercel / Netlify)

### Vercel
```bash
npm install -g vercel
vercel
```
Add all four environment variables in **Project Settings → Environment Variables**.

### Netlify
```bash
npm run build
# drag-and-drop the dist/ folder to Netlify, or use Netlify CLI
```

---

## Daily Reset

The pg_cron job runs at **00:00 IST** every night and automatically restores food items that were marked unavailable for that day. Items that are **permanently deleted** are never restored. No manual action needed.

---

## URLs

| Page | URL |
|------|-----|
| Customer Menu | `/` |
| Admin Login | `/admin/login` |
| Admin Dashboard | `/admin` |

---

## Checklist

- [ ] Supabase project created
- [ ] `schema.sql` executed
- [ ] pg_cron extension enabled
- [ ] Admin user created in Supabase Auth
- [ ] Cloudinary account created with unsigned upload preset
- [ ] `.env` file created with all 4 variables
- [ ] `npm install && npm run dev` runs without errors
- [ ] Admin can add food items with photos
- [ ] Customer can browse menu and place orders
- [ ] Admin sees orders in real time
