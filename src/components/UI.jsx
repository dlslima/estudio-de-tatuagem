import { Link } from 'react-router-dom'
import { formatarData, formatarHora, moeda, statusLabel } from '../formatos'

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

export function ButtonLink({ children, to, variant = 'primary', className = '', ...props }) {
  return <Link className={`button button-${variant} ${className}`} to={to} {...props}>{children}</Link>
}

export function TextLink({ children, to, ...props }) {
  return <Link className="text-link" to={to} {...props}>{children}</Link>
}

export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function FormField({ label, error, hint, children, className = '' }) {
  return (
    <label className={`form-field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error">{Array.isArray(error) ? error.join(' ') : error}</small>}
    </label>
  )
}

export function FormError({ error }) {
  if (!error) return null
  const details = error.data && !Array.isArray(error.data)
    ? Object.entries(error.data).flatMap(([field, messages]) => field === 'detail' || field === 'non_field_errors' ? [] : [Array.isArray(messages) ? messages.join(' ') : messages])
    : []
  const message = details.length ? details.join(' ') : error.message
  return <div className="notice notice-error" role="alert">{message}</div>
}

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{statusLabel(status)}</span>
}

export function AppointmentCard({ appointment, admin = false }) {
  const to = admin ? `/admin/sessoes/${appointment.id}` : `/sessoes/${appointment.id}`
  return (
    <Link className="appointment-card" to={to}>
      <div className="appointment-date">
        <strong>{formatarHora(appointment.inicio)}</strong>
        <span>{formatarData(appointment.inicio, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="appointment-summary">
        <strong>{appointment.servico_nome}</strong>
        <span>{admin ? `${appointment.cliente_nome || 'Cliente'} · ` : ''}{appointment.recurso_nome}</span>
        {admin && appointment.observacoes && <small>{appointment.observacoes}</small>}
      </div>
      <StatusBadge status={appointment.status} />
      <span className="card-arrow" aria-hidden="true">↗</span>
    </Link>
  )
}

export function Price({ value }) {
  return <span>{moeda(value)}</span>
}

export function Avatar({ src, name, className = '' }) {
  return src
    ? <img className={`avatar ${className}`} src={src} alt={name || ''} />
    : <span className={`avatar avatar-fallback ${className}`} aria-label={name || 'Imagem indisponível'}>{name?.charAt(0)?.toUpperCase() || '✳'}</span>
}

export function WizardProgress({ step }) {
  const steps = ['Serviço', 'Tatuador', 'Horário', 'Confirmação']
  return (
    <ol className="wizard-progress" aria-label={`Passo ${step} de 4`}>
      {steps.map((label, index) => (
        <li className={index + 1 <= step ? 'is-active' : ''} key={label}>
          <span>{index + 1}</span><small>{label}</small>
        </li>
      ))}
    </ol>
  )
}