import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { z } from 'zod'

const port = Number(process.env.MCP_PORT ?? 4000)
const apiKey = process.env.MCP_API_KEY
const connectionString =
  process.env.MCP_DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_PRISMA_URL

if (!apiKey) {
  throw new Error('MCP_API_KEY is required')
}

if (!connectionString) {
  throw new Error(
    'MCP_DATABASE_URL or POSTGRES_URL_NON_POOLING or POSTGRES_PRISMA_URL is required',
  )
}

const pool = new Pool({ connectionString })

const toolList = [
  {
    name: 'admin_sql',
    description:
      'Execute any SQL statement for admin operations. Use with care.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string' },
        params: { type: 'array', items: { type: ['string', 'number', 'boolean', 'null'] } },
      },
      required: ['sql'],
    },
  },
  {
    name: 'create_group',
    description: 'Create a new group with participants',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'participants'],
    },
  },
  {
    name: 'add_expense',
    description: 'Create a new expense and split evenly',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'string' },
        title: { type: 'string' },
        amount: { type: 'number' },
        paidByParticipantId: { type: 'string' },
        paidForParticipantIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['groupId', 'title', 'amount', 'paidByParticipantId', 'paidForParticipantIds'],
    },
  },
  {
    name: 'get_balances',
    description: 'Get participant balances for a group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'string' },
      },
      required: ['groupId'],
    },
  },
]

const adminSqlSchema = z.object({
  sql: z.string().min(1),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).default([]),
})

const createGroupSchema = z.object({
  name: z.string().min(1).max(200),
  participants: z.array(z.string().min(1).max(100)).min(1),
})

const addExpenseSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().min(1).max(500),
  amount: z.number().int().positive(),
  paidByParticipantId: z.string().min(1),
  paidForParticipantIds: z.array(z.string().min(1)).min(1),
})

const getBalancesSchema = z.object({
  groupId: z.string().min(1),
})

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(data),
})

const readJsonBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')
  if (!body) return {}
  return JSON.parse(body)
}

const runAdminSql = async (input) => {
  const { sql, params } = adminSqlSchema.parse(input)
  const result = await pool.query(sql, params)
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
  }
}

const runCreateGroup = async (input) => {
  const { name, participants } = createGroupSchema.parse(input)
  const groupId = randomUUID()
  const participantRows = participants.map((participantName) => ({
    id: randomUUID(),
    name: participantName,
  }))

  await pool.query('BEGIN')
  try {
    await pool.query('INSERT INTO "Group" (id, name) VALUES ($1, $2)', [groupId, name])
    for (const participant of participantRows) {
      await pool.query(
        'INSERT INTO "Participant" (id, name, "groupId") VALUES ($1, $2, $3)',
        [participant.id, participant.name, groupId],
      )
    }
    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }

  return {
    groupId,
    participants: participantRows,
  }
}

const runAddExpense = async (input) => {
  const { groupId, title, amount, paidByParticipantId, paidForParticipantIds } =
    addExpenseSchema.parse(input)

  const expenseId = randomUUID()
  await pool.query('BEGIN')
  try {
    await pool.query(
      `INSERT INTO "Expense"
      (id, "groupId", title, amount, "paidById", "categoryId", "splitMode", "isReimbursement", "expenseDate")
      VALUES ($1, $2, $3, $4, $5, 0, 'EVENLY', false, CURRENT_DATE)`,
      [expenseId, groupId, title, amount, paidByParticipantId],
    )

    for (const participantId of paidForParticipantIds) {
      await pool.query(
        `INSERT INTO "ExpensePaidFor" ("expenseId", "participantId", shares)
         VALUES ($1, $2, 1)`,
        [expenseId, participantId],
      )
    }

    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }

  return {
    expenseId,
    groupId,
    title,
    amount,
    paidByParticipantId,
    paidForParticipantIds,
  }
}

const runGetBalances = async (input) => {
  const { groupId } = getBalancesSchema.parse(input)
  const result = await pool.query(
    `SELECT
      p.id AS "participantId",
      p.name AS "participantName",
      COALESCE(SUM(CASE WHEN e."paidById" = p.id THEN e.amount ELSE 0 END), 0) AS "paidTotal",
      COALESCE(SUM(CASE WHEN epf."participantId" = p.id THEN e.amount / NULLIF(split_counts.count, 0) ELSE 0 END), 0) AS "owedTotal"
    FROM "Participant" p
    LEFT JOIN "Expense" e ON e."groupId" = p."groupId"
    LEFT JOIN (
      SELECT "expenseId", COUNT(*)::numeric AS count
      FROM "ExpensePaidFor"
      GROUP BY "expenseId"
    ) split_counts ON split_counts."expenseId" = e.id
    LEFT JOIN "ExpensePaidFor" epf ON epf."expenseId" = e.id
    WHERE p."groupId" = $1
    GROUP BY p.id, p.name
    ORDER BY p.name ASC`,
    [groupId],
  )

  return result.rows.map((row) => ({
    ...row,
    paidTotal: Number(row.paidTotal),
    owedTotal: Number(row.owedTotal),
    balance: Number(row.paidTotal) - Number(row.owedTotal),
  }))
}

const handleToolCall = async (name, args) => {
  switch (name) {
    case 'admin_sql':
      return runAdminSql(args)
    case 'create_group':
      return runCreateGroup(args)
    case 'add_expense':
      return runAddExpense(args)
    case 'get_balances':
      return runGetBalances(args)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

const requestHandler = async (req, res) => {
  try {
    if (req.headers['x-api-key'] !== apiKey) {
      const response = json(401, { error: 'Unauthorized' })
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      const response = json(200, { ok: true })
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
      return
    }

    if (req.method === 'GET' && req.url === '/mcp/tools') {
      const response = json(200, { tools: toolList })
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
      return
    }

    if (req.method === 'GET' && req.url === '/mcp/skills') {
      const response = json(200, {
        name: 'whatsapp-expense-admin',
        prompt:
          'Translate WhatsApp instructions into MCP tool calls. Prefer structured tools first. Use admin_sql only if no structured tool fits.',
        examples: [
          'Split 2400 dinner in Goa among Ishan, Riya, Adi. Ishan paid.',
          'Show balances for Goa trip group',
          'Delete expense <id>',
        ],
      })
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
      return
    }

    if (req.method === 'POST' && req.url === '/mcp/call') {
      const body = await readJsonBody(req)
      const schema = z.object({
        name: z.string().min(1),
        args: z.record(z.any()).default({}),
      })
      const { name, args } = schema.parse(body)
      const result = await handleToolCall(name, args)
      const response = json(200, { ok: true, result })
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
      return
    }

    const response = json(404, { error: 'Not found' })
    res.writeHead(response.statusCode, response.headers)
    res.end(response.body)
  } catch (error) {
    const response = json(400, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    res.writeHead(response.statusCode, response.headers)
    res.end(response.body)
  }
}

createServer(requestHandler).listen(port, () => {
  console.log(`MCP server listening on ${port}`)
})
