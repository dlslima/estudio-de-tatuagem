import { NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { Avatar, ButtonLink } from './UI'

const clientLinks = [
  ['/inicio', 'Início'],
  ['/agendar/servico', 'Agendar'],
  ['/sessoes', 'Minhas sessões'],
  ['/tatuadores', 'Tatuadores'],
]
const adminLinks = [
  ['/admin/agenda', 'Agenda'],
  ['/admin/confirmar', 'A confirmar'],
  ['/admin/tatuadores', 'Tatuadores'],
  ['/admin/servicos', 'Serviços'],
  ['/admin/avaliacoes', 'Avaliações'],
  ['/admin/negocio', 'Estúdio'],
]

export function AppLayout({ children }) {
  const { user, isAdmin, can, logout } = useAuth()
  const navigate = useNavigate()
  const links = isAdmin
    ? adminLinks
    : clientLinks.filter(([path]) => (
      path !== '/agendar/servico' || can('api.add_agendamento')
    ) && (
      path !== '/sessoes' || can('api.view_agendamento')
    ))

  if (!user) return <Navigate to="/login" replace />

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand-lockup" to={isAdmin ? '/admin/agenda' : '/inicio'}>
          <span className="brand-symbol">✳</span>
          <span><strong>Estúdio</strong><small>de tatuagem</small></span>
        </NavLink>
        <nav className="main-nav" aria-label="Navegação principal">
          {links.map(([path, label]) => (
            <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'nav-link is-active' : 'nav-link'}>{label}</NavLink>
          ))}
        </nav>
        <div className="account-nav">
          <NavLink className="account-link" to="/perfil" aria-label="Meu perfil">
            <Avatar src={user.foto} name={user.nome} />
            <span>{user.nome?.split(' ')[0] || 'Perfil'}</span>
          </NavLink>
          <button className="logout-button" type="button" onClick={handleLogout}>Sair</button>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="site-footer"><span>Estúdio de tatuagem</span><span>Arte que fica com você.</span></footer>
      <div className="mobile-booking"><ButtonLink to={isAdmin ? '/admin/agenda' : '/agendar/servico'}>{isAdmin ? 'Abrir agenda' : 'Agendar sessão'}</ButtonLink></div>
    </div>
  )
}