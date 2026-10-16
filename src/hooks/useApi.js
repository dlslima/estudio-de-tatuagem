import { useCallback, useEffect, useState } from 'react'
import { api, getAllPages } from '../api/client'

const getPage = (url) => api.get(url)

function useRequest(path, enabled, load) {
  const [result, setResult] = useState(null)
  const [version, setVersion] = useState(0)
  const requestKey = `${path || ''}:${version}`

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  useEffect(() => {
    let active = true
    if (!enabled || !path) return () => { active = false }
    load(path)
      .then((data) => { if (active) setResult({ key: requestKey, data, error: null }) })
      .catch((error) => { if (active) setResult({ key: requestKey, data: null, error }) })
    return () => { active = false }
  }, [path, enabled, requestKey, load])

  const loading = enabled && Boolean(path) && result?.key !== requestKey
  return {
    data: loading || !enabled ? null : result?.data ?? null,
    loading,
    error: loading ? null : result?.key === requestKey ? result.error : null,
    reload,
  }
}

export function useApi(path, { enabled = true } = {}) {
  return useRequest(path, enabled, getPage)
}

export function useAllPages(path, { enabled = true } = {}) {
  return useRequest(path, enabled, getAllPages)
}