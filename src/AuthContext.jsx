import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { api, clearTokens, getAccessToken, ORGANIZACAO } from './api/client'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getAccessToken()))
  const [restoreError, setRestoreError] = useState(null)

  const loadUser = async () => {
    if (!getAccessToken()) {
      setUser(null)
      setLoading(false)
      return null
    }

    setLoading(true)
    try {
      const currentUser = await api.get('/auth/eu/')
      setUser(currentUser)
      return currentUser
    } catch (error) {
      clearTokens()
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const restore = async () => {
      if (!getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const currentUser = await api.get('/auth/eu/')
        if (active) setUser(currentUser)
      } catch (error) {
        clearTokens()
        if (active) {
          setUser(null)
          setRestoreError(error)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    const expire = () => {
      setUser(null)
      setLoading(false)
      setRestoreError(new Error('Sua sessão expirou. Entre novamente para continuar.'))
    }
    window.addEventListener('auth:expired', expire)
    restore()
    return () => {
      active = false
      window.removeEventListener('auth:expired', expire)
    }
  }, [])

  const login = async (email, senha) => {
    const tokens = await api.post('/auth/login/', { organizacao: ORGANIZACAO, email, senha }, { auth: false })
    localStorage.setItem('access', tokens.access)
    localStorage.setItem('refresh', tokens.refresh)
    setRestoreError(null)
    return loadUser()
  }

  const value = useMemo(() => ({
    user,
    loading,
    restoreError,
    isAdmin: Boolean(user?.permissoes?.includes('api.change_organizacao')),
    can: (permission) => Boolean(user?.permissoes?.includes(permission)),
    login,
    async register(values) {
      await api.post('/auth/cadastro/', { ...values, organizacao: ORGANIZACAO }, { auth: false })
      return login(values.email, values.senha)
    },
    async logout() {
      clearTokens()
      setUser(null)
    },
    async refreshUser() {
      return loadUser()
    },
  }), [user, loading, restoreError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
