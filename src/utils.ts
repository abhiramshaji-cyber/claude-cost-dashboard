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

export function fmtExact(n: number): string {
  return '$' + n.toFixed(2)
}

export function processRows(rows: RawRow[]): AppData {
  const userMap: Record<string, UserSummary> = {}
  const modelTotals: Record<string, number> = {}
  const dailyTotals: Record<string, number> = {}
  let totalCost = 0, tokenCost = 0, wsCost = 0

  for (const r of rows) {
    const cost = parseFloat(r.cost_usd) || 0
    if (!cost) continue

    const user = extractUser(r.api_key || '')
    const model = r.model === '--' ? 'Web Search' : r.model
    const date = r.usage_date_utc
    const isWS = r.cost_type === 'web_search'

    totalCost += cost
    if (isWS) wsCost += cost; else tokenCost += cost

    if (!userMap[user]) {
      userMap[user] = {
        user,
        displayName: toDisplayName(user),
        total: 0, token: 0, ws: 0,
        models: {}, dailyCost: {}, tokenTypes: {},
      }
    }
    const u = userMap[user]
    u.total += cost
    if (isWS) u.ws += cost; else u.token += cost
    u.models[model] = (u.models[model] || 0) + cost
    u.dailyCost[date] = (u.dailyCost[date] || 0) + cost
    if (!isWS) u.tokenTypes[r.token_type] = (u.tokenTypes[r.token_type] || 0) + cost

    modelTotals[model] = (modelTotals[model] || 0) + cost
    dailyTotals[date] = (dailyTotals[date] || 0) + cost
  }

  const users = Object.values(userMap).sort((a, b) => b.total - a.total)
  const dates = Object.keys(dailyTotals).sort()

  return {
    users, totalCost, tokenCost, wsCost,
    modelTotals, dailyTotals, dates,
    periodStart: dates[0] || '', periodEnd: dates[dates.length - 1] || '',
  }
}

export const CHART_COLORS = [
  '#6366f1','#06b6d4','#f59e0b','#10b981','#ef4444',
  '#8b5cf6','#3b82f6','#ec4899','#14b8a6','#f97316',
  '#84cc16','#a78bfa','#67e8f9','#fcd34d','#6ee7b7',
]
