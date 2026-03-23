## Short roadmap: Spliit → Supabase → `split.ishanr.com`

---

# 1) Create Supabase project

* Go to Supabase → New project
* Copy:

  * **Project URL**
  * **Anon public key**
  * **DB connection string**

---

# 2) Set up database schema

Spliit expects its own tables, so:

### Option A (preferred)

* Check Spliit repo for:

  * `prisma/schema.prisma` or SQL migrations
* Run migrations against Supabase Postgres

### Option B (manual fallback)

* Start Spliit locally with Postgres
* Dump schema:

```bash
pg_dump -s -U postgres spliit > schema.sql
```

* Import into Supabase SQL editor

---

# 3) Configure Spliit to use Supabase DB

Update `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@db.PROJECT.supabase.co:5432/postgres
```

Use:

* Supabase **direct connection string** (not pooler if issues)

---

# 4) Update Spliit for production build

```bash
npm install
npm run build
```

Test locally:

```bash
npm start
```

---

# 5) Deploy Spliit

## Option A — Docker (recommended)

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

Run:

```bash
docker build -t spliit .
docker run -p 3000:3000 --env-file .env spliit
```

---

## Option B — VPS (simpler)

```bash
npm install
npm run build
pm2 start npm --name spliit -- start
```

---

# 6) Domain setup (`split.ishanr.com`)

### Nginx config:

```nginx
server {
  server_name split.ishanr.com;

  location / {
    proxy_pass http://localhost:3000;
  }
}
```

---

## Enable HTTPS

```bash
sudo certbot --nginx -d split.ishanr.com
```

---

# 7) Test end-to-end

* Open: `https://split.ishanr.com`
* Create group
* Add expense
* Verify in Supabase → Table editor

---

# 8) Optional (recommended)

* Enable Supabase backups
* Restrict DB to server IP
* Use connection pooling if scaling

---

# Final architecture

```text
Browser → split.ishanr.com (Spliit)
                ↓
         Supabase Postgres
```

---

# Key notes

* Supabase = only DB (no need for its auth/storage unless you extend)
* Spliit remains unchanged (just DB swap)
* Keep DB credentials secure (never expose client-side)

---