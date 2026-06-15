/** Client-configured replacement for N/A applicable/achieved scores (default keeps legacy "0"). */
export const DEFAULT_NA_SCORE_VALUE = '0'

export function isNaResponse(response: string | undefined | null): boolean {
  if (!response) return false
  const text = response.toLowerCase().trim()
  return text === 'na' || text === 'n/a' || text === 'not'
}

export function getClientNaScoreValue(client?: { na_score_value?: string | null } | null): string {
  console.log('client69', client)

  const value = client?.na_score_value
  if (value === undefined || value === null || String(value).trim() === '') {
    return DEFAULT_NA_SCORE_VALUE
  }
  return String(value).trim()
}

/** Numeric contribution when summing section/overall totals. Non-numeric values count as 0. */
export function naScoreToNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

/** Cell value for Excel/display: numbers stay numeric, text (e.g. N/A) is preserved. Never returns NaN. */
export function formatScoreForExport(value: string | number | undefined | null): string | number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const trimmed = String(value).trim()
  if (trimmed === '') return 0
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : trimmed
}

export function applyNaScores<T extends { applicable_score?: unknown; achieved_score?: unknown }>(
  data: T,
  naScoreValue: string
): T {
  data.applicable_score = naScoreValue as T['applicable_score']
  data.achieved_score = naScoreValue as T['achieved_score']
  return data
}

/** True when every answered question in the section has an N/A response. */
export function sectionHasOnlyNaResponses(section: {
  data?: Array<{ response?: string }>
}): boolean {
  const rows =
    section.data?.filter((row) => row.response && String(row.response).trim() !== '') ?? []
  if (rows.length === 0) return false
  return rows.every((row) => isNaResponse(row.response))
}

/** Set section-level applicable/achieved totals to the client N/A display value. */
export function applySectionNaTotals(
  section: {
    total_applicable_score?: unknown
    total_achieved_score?: unknown
    achieved?: string
  },
  naScoreValue: string
): void {
  section.total_applicable_score = naScoreValue
  section.total_achieved_score = naScoreValue
  section.achieved = 'N/A'
}

/** After numeric totals are computed, override with N/A when the section is all N/A responses. */
export function finalizeSectionTotals(
  section: {
    data?: Array<{ response?: string }>
    total_applicable_score?: unknown
    total_achieved_score?: unknown
    achieved?: string
  },
  client?: { na_score_value?: string | null } | null
): void {
  if (!sectionHasOnlyNaResponses(section)) return
  applySectionNaTotals(section, getClientNaScoreValue(client))
}
