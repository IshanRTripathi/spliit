# MCP Server MVP for OpenClaw

This service exposes DB-connected admin tools for OpenClaw.

## Environment variables

- `MCP_API_KEY` (required): shared secret sent as `x-api-key` header from OpenClaw
- `MCP_PORT` (optional): default `4000`
- `MCP_DATABASE_URL` (optional): if not set, falls back to `POSTGRES_URL_NON_POOLING`, then `POSTGRES_PRISMA_URL`

## Start

```bash
npm run mcp:start
```

## Endpoints

- `GET /health`
- `GET /mcp/tools` -> list tools
- `GET /mcp/skills` -> skill prompt metadata
- `POST /mcp/call` -> run a tool

## Auth

Every request must include:

```text
x-api-key: <MCP_API_KEY>
```

## Example OpenClaw request

```json
{
  "name": "add_expense",
  "args": {
    "groupId": "group-id",
    "title": "Dinner",
    "amount": 2400,
    "paidByParticipantId": "participant-id-1",
    "paidForParticipantIds": ["participant-id-1", "participant-id-2", "participant-id-3"]
  }
}
```

## Available tools

- `create_group`
- `add_expense`
- `get_balances`
- `admin_sql` (full admin fallback)
