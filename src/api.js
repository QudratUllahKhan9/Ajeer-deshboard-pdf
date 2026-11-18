// One place for every backend call.
export const API = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function req(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    cache: 'no-store',
    ...opts
  })
  const ct = res.headers.get('content-type') || ''
  const body = ct.includes('json') ? await res.json().catch(() => ({})) : { raw: await res.text() }
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status} @ ${path}`)
  return body
}

export const saveRecord = (data) => req('/api/permits', { method: 'POST', body: JSON.stringify(data) })
export const updateRecord = (id, data) => req(`/api/permits/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
export const getRecord = (id) => req(`/api/permits/${encodeURIComponent(id)}`)
export const listRecords = (q = '') => req(`/api/permits${q ? '?q=' + encodeURIComponent(q) : ''}`)
export const getSettings = () => req('/api/settings')
export const setDomain = (baseUrl) =>
  req('/api/settings/domain', { method: 'PUT', headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_TOKEN || 'change-me' }, body: JSON.stringify({ baseUrl }) })

export const qrSrc = (permitId) => `${API}/qr/${encodeURIComponent(permitId)}.png`
export const nowId = () => Math.random().toString(16).slice(2, 10)
