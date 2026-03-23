## End-to-end architecture (Spliit + OpenClaw + MCP)

```text
User (chat / WhatsApp / UI)
        ↓
OpenClaw (openclaw.ishanr.com)
        ↓  (MCP tools)
MCP Server (api.ishanr.com)
        ↓
Postgres DB (shared)
        ↑
Spliit (split.ishanr.com)
```

* **Spliit** → frontend + reads/writes DB
* **DB (Postgres)** → single source of truth
* **MCP server** → safe CRUD + business logic
* **OpenClaw** → AI interface + automation

---

# Phase 1 — Prepare Spliit (local → production-ready)

## 1. Inspect Spliit config

Inside your cloned repo:

```bash
ls
```

Look for:

* `.env`
* `docker-compose.yml`
* DB config (likely SQLite by default)

---

## 2. Switch to Postgres (important)

SQLite is not suitable for multi-service access.

### Update environment

```env
DATABASE_URL=postgresql://user:password@db:5432/spliit
```

---

## 3. Dockerize Spliit + Postgres

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  spliit:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/spliit
    depends_on:
      - db

  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: spliit
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 4. Run locally

```bash
docker compose up -d
```

Verify:

```text
http://localhost:3000
```

Create:

* group
* expenses

---

## 5. Inspect DB schema

Connect:

```bash
docker exec -it <db_container> psql -U postgres
```

Then:

```sql
\dt
```

Identify key tables:

* groups
* expenses
* users
* balances (or equivalent)

---

# Phase 2 — Build MCP server (core layer)

---

## 1. Create new service

```bash
mkdir mcp-server
cd mcp-server
npm init -y
```

Install:

```bash
npm install express pg @modelcontextprotocol/sdk zod
```

---

## 2. Project structure

```text
mcp-server/
  ├── index.js
  ├── db.js
  ├── tools/
  │     ├── addExpense.js
  │     ├── getBalances.js
  │     └── splitExpense.js
  ├── validators/
  └── .env
```

---

## 3. DB connection

```javascript
// db.js
import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

---

## 4. Core MCP tools

### Tool 1 — Add expense (raw)

```javascript
// tools/addExpense.js
import { pool } from "../db.js";

export async function addExpense({ description, amount, group_id }) {
  const result = await pool.query(
    `INSERT INTO expenses (description, amount, group_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [description, amount, group_id]
  );

  return result.rows[0];
}
```

---

### Tool 2 — Smart split (recommended)

```javascript
// tools/splitExpense.js
export function splitExpense({ amount, participants }) {
  const share = amount / participants.length;

  return participants.map(p => ({
    user: p,
    amount: share
  }));
}
```

---

### Tool 3 — Get balances

```javascript
// tools/getBalances.js
import { pool } from "../db.js";

export async function getBalances(group_id) {
  const result = await pool.query(
    `SELECT * FROM balances WHERE group_id = $1`,
    [group_id]
  );

  return result.rows;
}
```

---

## 5. MCP server definition

```javascript
// index.js
import express from "express";
import { createMCPServer } from "@modelcontextprotocol/sdk";
import { addExpense } from "./tools/addExpense.js";

const app = express();
app.use(express.json());

const server = createMCPServer({
  tools: [
    {
      name: "add_expense",
      description: "Add expense",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          group_id: { type: "string" }
        },
        required: ["description", "amount"]
      },
      handler: addExpense
    }
  ]
});

app.use("/mcp", server);

app.listen(4000, () => {
  console.log("MCP running on 4000");
});
```

---

# Phase 3 — Deploy services

---

## Domains

| Service  | Domain              |
| -------- | ------------------- |
| Spliit   | split.ishanr.com    |
| OpenClaw | openclaw.ishanr.com |
| MCP API  | api.ishanr.com      |

---

## Reverse proxy (Nginx example)

```nginx
server {
  server_name api.ishanr.com;

  location / {
    proxy_pass http://localhost:4000;
  }
}
```

---

# Phase 4 — Connect OpenClaw

---

## OpenClaw config

```json
{
  "mcpServers": [
    {
      "url": "https://api.ishanr.com/mcp",
      "apiKey": "secure_key"
    }
  ]
}
```

---

## Example usage

Input:

```text
"Split ₹2400 dinner between 3 people"
```

Flow:

1. OpenClaw parses
2. Calls `split_expense`
3. Calls `add_expense`
4. DB updated
5. Spliit reflects instantly

---

# Phase 5 — Production hardening

---

## 1. Add auth

* JWT or API key on MCP
* Optional user mapping (OpenClaw → Spliit user)

---

## 2. Add validation (critical)

Use `zod`:

```javascript
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive()
});
```

---

## 3. Add audit logs

Store:

* who triggered action
* timestamp
* changes

---

## 4. Background jobs

* recompute balances
* send reminders
* monthly summaries

---

# Phase 6 — Optional enhancements

---

## AI features via OpenClaw

* Receipt → expense (OCR + LLM)
* “Who owes me?”
* Auto reminders
* Expense categorization

---

## Add event-driven flow

```text
DB insert → event → OpenClaw → notifications
```

---

# Final system summary

| Layer      | Responsibility  |
| ---------- | --------------- |
| Spliit     | UI              |
| Postgres   | Data            |
| MCP server | Logic + API     |
| OpenClaw   | AI + automation |

---

# Key design principles (important)

* Never expose DB directly
* Keep logic in MCP, not LLM
* Keep Spliit as “dumb UI”
* Let OpenClaw orchestrate

---

If needed next:

* exact SQL schema mapping for Spliit
* ready Docker Compose for all 3 services
* OpenClaw skill templates for WhatsApp / receipts
