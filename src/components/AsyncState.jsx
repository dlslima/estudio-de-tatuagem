import { Link } from 'react-router-dom'

export function Loading({ label = 'Carregando...' }) {
  return <div className="state-message" role="status"><span className="spinner" />{label}</div>
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>{error?.message || 'Não foi possível carregar as informações.'}</p>
      {onRetry && <button className="text-button" type="button" onClick={onRetry}>Tentar de novo</button>}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">✳</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function NotFoundState({ to, label }) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">✳</span>
      <h3>Não encontrado</h3>
      <p>O item pode ter sido removido ou não está disponível.</p>
      <Link className="button button-outline" to={to}>Voltar para {label}</Link>
    </div>
  )
}
