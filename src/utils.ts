import type { RawRow, UserSummary, AppData } from './types'

export function extractUser(apiKey: string): string {
  const m = apiKey.match(/claude_code_key_(.+)_[a-z0-9]{4}$/)
  return m ? m[1] : apiKey
}

export function toDisplayName(user: string): string {
  const parts = user.split('.')
  if (parts.length >= 2) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  }
  return user.charAt(0).toUpperCase() + user.slice(1)
}

export function fmt(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(2) + 'k'
  if (n >= 100) return '$' + n.toFixed(0)
  return '$' + n.toFixed(2)
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

export function fmtExact(n: number): string {
  return '$' + n.toFixed(2)
}

// Prices in USD per million tokens (MTok)
const MODEL_PRICING: Record<string, {
  input: number
  cache_write_5m: number
  cache_write_1h: number
  cache_read: number
  output: number
}> = {
  'claude opus 4.7':   { input: 5,    cache_write_5m: 6.25,  cache_write_1h: 10,  cache_read: 0.50, output: 25   },
  'claude opus 4.6':   { input: 5,    cache_write_5m: 6.25,  cache_write_1h: 10,  cache_read: 0.50, output: 25   },
  'claude opus 4.5':   { input: 5,    cache_write_5m: 6.25,  cache_write_1h: 10,  cache_read: 0.50, output: 25   },
  'claude opus 4.1':   { input: 15,   cache_write_5m: 18.75, cache_write_1h: 30,  cache_read: 1.50, output: 75   },
  'claude opus 4':     { input: 15,   cache_write_5m: 18.75, cache_write_1h: 30,  cache_read: 1.50, output: 75   },
  'claude opus 3':     { input: 15,   cache_write_5m: 18.75, cache_write_1h: 30,  cache_read: 1.50, output: 75   },
  'claude sonnet 4.6': { input: 3,    cache_write_5m: 3.75,  cache_write_1h: 6,   cache_read: 0.30, output: 15   },
  'claude sonnet 4.5': { input: 3,    cache_write_5m: 3.75,  cache_write_1h: 6,   cache_read: 0.30, output: 15   },
  'claude sonnet 4':   { input: 3,    cache_write_5m: 3.75,  cache_write_1h: 6,   cache_read: 0.30, output: 15   },
  'claude sonnet 3.7': { input: 3,    cache_write_5m: 3.75,  cache_write_1h: 6,   cache_read: 0.30, output: 15   },
  'claude haiku 4.5':  { input: 1,    cache_write_5m: 1.25,  cache_write_1h: 2,   cache_read: 0.10, output: 5    },
  'claude haiku 3.5':  { input: 0.80, cache_write_5m: 1,     cache_write_1h: 1.6, cache_read: 0.08, output: 4    },
  'claude haiku 3':    { input: 0.25, cache_write_5m: 0.30,  cache_write_1h: 0.50,cache_read: 0.03, output: 1.25 },
}

function getPricePerMTok(model: string, tokenType: string): number {
  const key = model.toLowerCase()
    .replace(/\s*\(latest\)/g, '')
    .replace(/\s*\(deprecated\)/g, '')
    .trim()
  const p = MODEL_PRICING[key]
  if (!p) return 0
  if (tokenType === 'input_no_cache')       return p.input
  if (tokenType === 'input_cache_write_5m') return p.cache_write_5m
  if (tokenType === 'input_cache_write_1h') return p.cache_write_1h
  if (tokenType === 'input_cache_read')     return p.cache_read
  if (tokenType === 'output')               return p.output
  return 0
}

export function processRows(rows: RawRow[]): AppData {
  const userMap: Record<string, UserSummary> = {}
  const modelTotals: Record<string, number> = {}
  const dailyTotals: Record<string, number> = {}
  let totalCost = 0, tokenCost = 0, wsCost = 0, totalTokens = 0

  for (const r of rows) {
    const cost = parseFloat(r.cost_usd) || 0
    if (!cost) continue

    const user = extractUser(r.api_key || '')
    const model = r.model === '--' ? 'Web Search' : r.model
    const date = r.usage_date_utc
    const isWS = r.cost_type === 'web_search'

    const pricePerMTok = getPricePerMTok(r.model, r.token_type)
    const tokens = pricePerMTok > 0 ? Math.round((cost / pricePerMTok) * 1_000_000) : 0

    totalCost += cost
    if (isWS) wsCost += cost; else tokenCost += cost
    if (!isWS) totalTokens += tokens

    if (!userMap[user]) {
      userMap[user] = {
        user,
        displayName: toDisplayName(user),
        total: 0, token: 0, ws: 0, totalTokens: 0,
        tokenTypeCounts: {},
        models: {}, dailyCost: {}, tokenTypes: {},
      }
    }
    const u = userMap[user]
    u.total += cost
    if (isWS) u.ws += cost; else u.token += cost
    if (!isWS) {
      u.totalTokens += tokens
      u.tokenTypeCounts[r.token_type] = (u.tokenTypeCounts[r.token_type] || 0) + tokens
    }
    u.models[model] = (u.models[model] || 0) + cost
    u.dailyCost[date] = (u.dailyCost[date] || 0) + cost
    if (!isWS) u.tokenTypes[r.token_type] = (u.tokenTypes[r.token_type] || 0) + cost

    modelTotals[model] = (modelTotals[model] || 0) + cost
    dailyTotals[date] = (dailyTotals[date] || 0) + cost
  }

  const users = Object.values(userMap).sort((a, b) => b.total - a.total)
  const dates = Object.keys(dailyTotals).sort()

  return {
    users, totalCost, tokenCost, wsCost, totalTokens,
    modelTotals, dailyTotals, dates,
    periodStart: dates[0] || '', periodEnd: dates[dates.length - 1] || '',
  }
}

export const CHART_COLORS = [
  '#6366f1','#06b6d4','#f59e0b','#10b981','#ef4444',
  '#8b5cf6','#3b82f6','#ec4899','#14b8a6','#f97316',
  '#84cc16','#a78bfa','#67e8f9','#fcd34d','#6ee7b7',
]
