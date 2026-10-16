const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://agendamentos.spaincentral.cloudapp.azure.com/api'
).replace(/\/+$/, '')

export const ORGANIZACAO = import.meta.env.VITE_ORGANIZACAO || 'estudio-de-tatuagem'

const ACCESS_KEY = 'access'
const REFRESH_KEY = 'refresh'
let refreshInProgress

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

function saveTokens(tokens) {
  localStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh)
}

function getMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.non_field_errors?.[0] === 'string') return data.non_field_errors[0]
  if (Array.isArray(data) && typeof data[0] === 'string') return data[0]
  return fallback
}

async function readResponse(response) {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

async function renewAccessToken() {
  if (refreshInProgress) return refreshInProgress

  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) {
    clearTokens()
    window.dispatchEvent(new Event('auth:expired'))
    return null
  }

  refreshInProgress = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/renovar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      const data = await readResponse(response)
      if (!response.ok || !data?.access) {
        clearTokens()
        window.dispatchEvent(new Event('auth:expired'))
        return null
      }
      saveTokens(data)
      return data.access
    } catch (error) {
      clearTokens()
      window.dispatchEvent(new Event('auth:expired'))
      throw error
    }
  })()

  try {
    return await refreshInProgress
  } finally {
    refreshInProgress = undefined
  }
}

async function request(path, options = {}, retry = true) {
  const url = /^https?:\/\//.test(path) ? path : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
  const { auth = true, ...fetchOptions } = options
  const headers = new Headers(options.headers)
  const token = getAccessToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)

  let body = options.body
  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body,
  })

  if (response.status === 401 && retry && auth) {
    const access = await renewAccessToken()
    if (access) return request(path, options, false)
  }

  const data = await readResponse(response)
  if (!response.ok) {
    const defaults = {
      403: 'Você não tem permissão para esta ação.',
      404: 'Não foi possível encontrar os dados solicitados.',
      429: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    }
    throw new ApiError(getMessage(data, defaults[response.status] || 'Não foi possível concluir a solicitação.'), response.status, data)
  }

  return data
}

export const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
}

export async function getAllPages(path) {
  const items = []
  let next = path
  while (next) {
    const page = await api.get(next)
    if (Array.isArray(page)) return items.concat(page)
    items.push(...(page.results || []))
    next = page.next
  }
  return items
}
