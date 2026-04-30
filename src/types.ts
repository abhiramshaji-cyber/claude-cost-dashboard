export interface RawRow {
  usage_date_utc: string
  model: string
  workspace: string
  api_key: string
  usage_type: string
  context_window: string
  token_type: string
  tokens: string
  cost_usd: string
  list_price_usd: string
  cost_type: string
  inference_geo: string
  speed: string
}

export interface UserSummary {
  user: string        // e.g. "abhiram.shaji"
  displayName: string // e.g. "Abhiram Shaji"
  total: number
  token: number
  ws: number
  totalTokens: number
  tokenTypeCounts: Record<string, number>  // token COUNT by type (input/output/cache_read/cache_creation)
  models: Record<string, number>
  dailyCost: Record<string, number>
  tokenTypes: Record<string, number>       // token COST by type
}

export interface AppData {
  users: UserSummary[]
  totalCost: number
  tokenCost: number
  wsCost: number
  totalTokens: number
  modelTotals: Record<string, number>
  dailyTotals: Record<string, number>
  dates: string[]
  periodStart: string
  periodEnd: string
}
