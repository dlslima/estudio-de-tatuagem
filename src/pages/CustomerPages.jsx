import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { api } from '../api/client'
import { ErrorState, EmptyState, Loading, NotFoundState } from '../components/AsyncState'
import {
  AppointmentCard,
  Avatar,
  Button,
  ButtonLink,
  Card,
  FormError,
  FormField,
  PageHeading,
  Price,
  StatusBadge,
  TextLink,
  WizardProgress,
} from '../components/UI'
import { useAllPages, useApi } from '../hooks/useApi'
import { formatarData, formatarHora, hojeLocal, moeda, ontemLocal } from '../formatos'

const BOOKING_KEY = 'tattoo-booking'

function readBooking() {
  const saved = sessionStorage.getItem(BOOKING_KEY)
  if (!saved) return {}
  try {
    return JSON.parse(saved)
  } catch {
    sessionStorage.removeItem(BOOKING_KEY)
    return {}
  }
}

function saveBooking(value) {
  sessionStorage.setItem(BOOKING_KEY, JSON.stringify(value))
}

function listOf(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export function CustomerHomePage() {
  const [currentTimestamp] = useState(() => Date.now())
  const org = useApi('/organizacao/')
  const appointments = useApi(`/agendamentos/?data_inicio=${hojeLocal()}`)
  if (org.loading || appointments.loading) return <Loading />
  if (org.error) return <ErrorState error={org.error} onRetry={org.reload} />
  if (appointments.error) return <ErrorState error={appointments.error} onRetry={appointments.reload} />
  const upcoming = listOf(appointments.data)
    .filter((item) => ['solicitado', 'confirmado'].includes(item.status) && Date.parse(item.inicio) >= currentTimestamp)
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0]

  return (
    <div className="customer-home">
      <section className="welcome-banner">
        <div className="welcome-copy">
          {org.data.logo && <img className="welcome-logo" src={org.data.logo} alt={`Logo de ${org.data.nome}`} />}
          <p className="eyebrow">BEM-VINDO{org.data?.nome ? ` AO ${org.data.nome.toUpperCase()}` : ' AO ESTÚDIO'}</p>
          <h1>Tem uma ideia<br />que merece <em>ficar?</em></h1>
          <p>Encontre seu tatuador, escolha o serviço e vamos criar algo que é só seu.</p>
          <ButtonLink to="/agendar/servico">Agendar uma sessão <span aria-hidden="true">↗</span></ButtonLink>
        </div>
        <div className="welcome-stamp"><span>ARTE</span><span>COM</span><span>INTENÇÃO</span><i>✳</i></div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">SEU PRÓXIMO CAPÍTULO</p><h2>Próxima sessão</h2></div>
          <TextLink to="/sessoes">Ver todas as sessões <span>→</span></TextLink>
        </div>
        {upcoming ? <AppointmentCard appointment={upcoming} /> : (
          <Card className="next-empty">
            <div><span className="line-icon">✳</span><h3>Ainda não tem sessão marcada.</h3><p>Seu próximo desenho pode começar com uma conversa.</p></div>
            <ButtonLink to="/agendar/servico" variant="outline">Encontrar um horário <span>→</span></ButtonLink>
          </Card>
        )}
      </section>

      <section className="studio-note">
        <span className="eyebrow">UM BOM COMEÇO</span>
        <p>Tem uma ideia em mente? No campo de observações, conte pra gente o desenho, o local do corpo e o tamanho aproximado. Assim o artista já pode se preparar.</p>
      </section>
    </div>
  )
}

export function BookingServicePage() {
  const location = useLocation()
  const { data, loading, error, reload } = useAllPages('/servicos/?ativo=true')
  const services = listOf(data)
  const preferredTattooer = location.state?.recurso || null
  return (
    <div className="content-narrow">
      <PageHeading eyebrow="VAMOS COMEÇAR" title="Escolha seu serviço" description="Cada desenho tem seu tempo. Escolha o que combina com a sua ideia." />
      <WizardProgress step={1} />
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : services.length ? (
        <div className="service-grid">
          {services.map((service) => (
            <Link className="service-card" key={service.id} to={preferredTattooer ? '/agendar/horario' : '/agendar/tatuador'} onClick={() => saveBooking({ servico: service, recurso: preferredTattooer, inicio: null, enviado: null })}>
              {service.imagem ? <img src={service.imagem} alt="" /> : <div className="service-art"><span>✳</span></div>}
              <div className="service-card-copy">
                <span className="eyebrow">SERVIÇO</span>
                <h2>{service.nome}</h2>
                <p>{service.descricao}</p>
                <div className="service-meta"><span>{service.duracao_min} min</span><strong><Price value={service.preco} /></strong></div>
              </div>
              <span className="service-arrow">↗</span>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="Nenhum serviço disponível" description="Ainda não há serviços para agendar. Volte em breve." />}
    </div>
  )
}

export function BookingTattooerPage() {
  const navigate = useNavigate()
  const booking = readBooking()
  const query = booking.servico?.id ? `?servicos=${booking.servico.id}` : ''
  const { data, loading, error, reload } = useAllPages(query ? `/recursos/${query}` : null, { enabled: Boolean(query) })
  const tattooers = listOf(data)

  function choose(tattooer) {
    saveBooking({ ...booking, recurso: tattooer || null, inicio: null })
    navigate('/agendar/horario')
  }

  if (!booking.servico) return <NavigateToService />

  return (
    <div className="content-narrow">
      <PageHeading eyebrow="PASSO 2 DE 4" title="Com quem você quer criar?" description={`Artistas que realizam ${booking.servico.nome}. Você também pode deixar a escolha em aberto.`} />
      <WizardProgress step={2} />
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <button className="artist-choice-any" type="button" onClick={() => choose(null)}>
            <span className="any-symbol">✳</span><span><strong>Qualquer tatuador</strong><small>Escolha um horário entre os artistas disponíveis.</small></span><b>→</b>
          </button>
          {tattooers.length ? <div className="artist-grid">
            {tattooers.map((artist) => (
              <button className="artist-card" key={artist.id} type="button" onClick={() => choose(artist)}>
                <Avatar src={artist.foto} name={artist.nome} />
                <span className="artist-card-copy"><strong>{artist.nome}</strong><small>{artist.bio || 'Tatuador(a)'}</small><em>Escolher artista <span>↗</span></em></span>
              </button>
            ))}
          </div> : <EmptyState title="Nenhum tatuador realiza este serviço" />}
        </>
      )}
      <TextLink to="/agendar/servico">← Voltar aos serviços</TextLink>
    </div>
  )
}

function NavigateToService() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/agendar/servico', { replace: true }) }, [navigate])
  return <Loading />
}

export function BookingTimePage() {
  const navigate = useNavigate()
  const booking = readBooking()
  const [date, setDate] = useState('')
  const [selectedWeekday, setSelectedWeekday] = useState(null)
  const [selected, setSelected] = useState(null)
  const resourceQuery = booking.recurso?.id ? `&recurso=${booking.recurso.id}` : ''
  const url = booking.servico?.id && date ? `/horarios-livres/?servico=${booking.servico.id}&data=${date}${resourceQuery}` : null
  const { data, loading, error, reload } = useApi(url, { enabled: Boolean(url) })
  const schedulePath = booking.recurso?.id ? `/disponibilidades/?recurso=${booking.recurso.id}` : '/disponibilidades/'
  const schedules = useAllPages(schedulePath, { enabled: Boolean(booking.servico?.id) })
  const serviceResources = useAllPages(
    booking.servico?.id && !booking.recurso?.id ? `/recursos/?servicos=${booking.servico.id}` : null,
    { enabled: Boolean(booking.servico?.id && !booking.recurso?.id) },
  )
  const availableResources = booking.recurso?.id ? [booking.recurso] : listOf(serviceResources.data)
  const resourceById = new Map(availableResources.map((resource) => [String(resource.id), resource]))
  const scheduleRows = listOf(schedules.data)
  const today = hojeLocal()
  const eligibleSchedules = scheduleRows.filter((item) => resourceById.has(String(item.recurso)))
  const weekdayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
  const weekdayIndices = [...new Set(eligibleSchedules.map((item) => Number(item.dia_semana)))]
    .filter((weekday) => weekday >= 0 && weekday < weekdayNames.length)
    .sort((a, b) => a - b)
  const daySchedules = eligibleSchedules.filter((item) => Number(item.dia_semana) === selectedWeekday)
  const serviceDuration = Number(booking.servico.duracao_min)
  const availableGroups = (Array.isArray(data) ? data : [])
    .map((group) => {
      const resourceSchedules = daySchedules.filter((item) => String(item.recurso) === String(group.recurso.id))
      const horarios = Number.isInteger(serviceDuration) && serviceDuration > 0
        ? group.horarios.filter((slot) => {
          const [slotHour, slotMinute] = formatarHora(slot).split(':').map(Number)
          const slotMinutes = slotHour * 60 + slotMinute
          return resourceSchedules.some((item) => {
            const [startHour, startMinute] = item.hora_inicio.split(':').map(Number)
            const [endHour, endMinute] = item.hora_fim.split(':').map(Number)
            const startMinutes = startHour * 60 + startMinute
            const endMinutes = endHour * 60 + endMinute
            return slotMinutes >= startMinutes
              && slotMinutes <= endMinutes
              && (slotMinutes - startMinutes) % serviceDuration === 0
          })
        })
        : []
      return { ...group, horarios }
    })
    .filter((group) => group.horarios.length)
  const schedulesByResource = new Map()
  for (const item of daySchedules) {
    const resourceId = String(item.recurso)
    if (!schedulesByResource.has(resourceId)) schedulesByResource.set(resourceId, [])
    schedulesByResource.get(resourceId).push(item)
  }
  const scheduleError = schedules.error || serviceResources.error
  const scheduleLoading = schedules.loading || serviceResources.loading

  function formatDateKey(value) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function selectWeekday(weekday) {
    const todayDate = new Date(`${today}T12:00:00`)
    const currentWeekday = (todayDate.getDay() + 6) % 7
    const daysUntil = (weekday - currentWeekday + 7) % 7
    todayDate.setDate(todayDate.getDate() + daysUntil)
    setSelectedWeekday(weekday)
    setDate(formatDateKey(todayDate))
    setSelected(null)
  }

  function choose(slot, resource) {
    setSelected({ inicio: slot, recurso: resource })
    if (booking.erroAgendamento) {
      const remaining = { ...booking }
      delete remaining.erroAgendamento
      saveBooking(remaining)
    }
  }

  function continueToConfirm() {
    if (!selected) return
    saveBooking({ ...booking, inicio: selected.inicio, recurso: selected.recurso })
    navigate('/agendar/confirmar')
  }

  if (!booking.servico) return <NavigateToService />
  return (
    <div className="content-narrow">
      <PageHeading eyebrow="PASSO 3 DE 4" title="Escolha o melhor horário" description="Os horários exibidos já consideram a disponibilidade do artista." />
      <WizardProgress step={3} />
      <Card className="date-picker-card">
        <div className="weekday-availability">
          <h2>Escolha um dia da semana</h2>
          {scheduleLoading ? <Loading /> : scheduleError ? (
            <ErrorState error={scheduleError} onRetry={schedules.error ? schedules.reload : serviceResources.reload} />
          ) : eligibleSchedules.length ? (
            <>
              <div className="weekday-availability-options">
                {weekdayIndices.map((weekday) => (
                  <button
                    aria-pressed={selectedWeekday === weekday}
                    className={selectedWeekday === weekday ? 'weekday-availability-option is-selected' : 'weekday-availability-option'}
                    key={weekday}
                    onClick={() => selectWeekday(weekday)}
                    type="button"
                  >
                    {weekdayNames[weekday]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Sem horários cadastrados" description="Ainda não há disponibilidade configurada para os tatuadores deste serviço." />
          )}
        </div>
      </Card>
      {date && !scheduleLoading && !scheduleError && daySchedules.length > 0 && (
        <section className="configured-schedules" aria-label="Horários definidos pelos tatuadores">
          <div className="configured-schedules-heading">
            <p className="eyebrow">DISPONIBILIDADE CADASTRADA</p>
            <h2>{formatarData(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          </div>
          <div className="configured-schedule-list">
            {[...schedulesByResource].map(([resourceId, items]) => {
              const resource = resourceById.get(resourceId)
              if (!resource) return null
              return (
                <div className="configured-schedule" key={resourceId}>
                  <div className="configured-schedule-person">
                    <Avatar src={resource.foto} name={resource.nome} />
                    <strong>{resource.nome}</strong>
                  </div>
                  <div className="configured-schedule-times">
                    {items.map((item) => <span key={item.id}>{item.hora_inicio.slice(0, 5)} – {item.hora_fim.slice(0, 5)}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="calendar-availability-hint">Selecione abaixo um horário livre dentro desses períodos.</p>
        </section>
      )}
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="available-list">
          {availableGroups.map((group) => (
            <section className="available-group" key={group.recurso.id}>
              <div className="available-person"><Avatar src={group.recurso.foto} name={group.recurso.nome} /><div><strong>{group.recurso.nome}</strong><small>{formatarData(date, { weekday: 'long', day: 'numeric', month: 'long' })}</small></div></div>
              <div className="time-slots">{group.horarios.map((slot) => {
                const active = selected?.inicio === slot && selected?.recurso?.id === group.recurso.id
                return <button className={active ? 'time-slot is-selected' : 'time-slot'} key={slot} type="button" onClick={() => choose(slot, group.recurso)}>{formatarHora(slot)}</button>
              })}</div>
            </section>
          ))}
          {date && !availableGroups.length && <EmptyState title="Sem horários livres neste dia" description="Não há horários livres compatíveis com a duração do serviço neste período. Tente outra data." />}
          {!date && <EmptyState title="Escolha um dia da semana" description="Selecione um dos dias cadastrados para consultar os horários livres." />}
        </div>
      )}
        {booking.erroAgendamento && <div className="notice notice-error" role="alert">{booking.erroAgendamento}</div>}
      <div className="wizard-actions">
        <TextLink to="/agendar/tatuador">← Voltar</TextLink>
        <Button type="button" disabled={!selected} onClick={continueToConfirm}>Continuar <span>→</span></Button>
      </div>
    </div>
  )
}

export function BookingConfirmationPage() {
  const navigate = useNavigate()
  const booking = readBooking()
  const [observacoes, setObservacoes] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!booking.servico || !booking.inicio || !booking.recurso?.id) return <NavigateToService />

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const appointment = await api.post('/agendamentos/', {
        servico: booking.servico.id,
        recurso: booking.recurso.id,
        inicio: booking.inicio,
        observacoes,
      })
      saveBooking({ ...booking, observacoes, enviado: appointment })
      navigate('/agendar/enviado')
    } catch (reason) {
      setError(reason)
      if (reason.status === 400) {
        const fieldErrors = reason.data?.inicio
        saveBooking({
          ...booking,
          erroAgendamento: Array.isArray(fieldErrors) ? fieldErrors.join(' ') : reason.message,
        })
        navigate('/agendar/horario', { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <PageHeading eyebrow="PASSO 4 DE 4" title="Confira sua sessão" description="Revise os detalhes e conte um pouco sobre a sua ideia." />
      <WizardProgress step={4} />
      <Card className="booking-summary">
        <span className="eyebrow">SEU AGENDAMENTO</span>
        <h2>{booking.servico.nome}</h2>
        <dl>
          <div><dt>Tatuador</dt><dd>{booking.recurso.nome}</dd></div>
          <div><dt>Data</dt><dd>{formatarData(booking.inicio, { weekday: 'long', day: 'numeric', month: 'long' })}</dd></div>
          <div><dt>Horário</dt><dd>{formatarHora(booking.inicio)}</dd></div>
          <div><dt>Duração</dt><dd>{booking.servico.duracao_min} minutos</dd></div>
          <div><dt>Valor</dt><dd>{moeda(booking.servico.preco)}</dd></div>
        </dl>
      </Card>
      <form className="form-stack booking-notes" onSubmit={submit}>
        <FormError error={error} />
        <FormField label="Fale sobre sua ideia" hint="Conte o desenho, o local do corpo e o tamanho aproximado.">
          <textarea rows="5" required value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Ex.: uma rosa em fineline no antebraço, com cerca de 10 cm..." />
        </FormField>
        <div className="wizard-actions"><TextLink to="/agendar/horario">← Voltar</TextLink><Button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Solicitar sessão'} <span>→</span></Button></div>
      </form>
    </div>
  )
}

export function BookingSentPage() {
  const booking = readBooking()
  const appointment = booking.enviado
  if (!appointment) return <NavigateToService />
  return (
    <div className="success-page">
      <span className="success-symbol">✳</span>
      <p className="eyebrow">PEDIDO ENVIADO</p>
      <h1>Sua ideia está<br /><em>em movimento.</em></h1>
      <p>Seu pedido foi registrado. O estúdio vai confirmar sua sessão em breve.</p>
      <Card className="success-summary">
        <StatusBadge status={appointment.status || 'solicitado'} />
        <strong>{appointment.servico_nome || booking.servico.nome}</strong>
        <span>{appointment.recurso_nome || booking.recurso.nome}</span>
        <span>{formatarData(appointment.inicio || booking.inicio)} · {formatarHora(appointment.inicio || booking.inicio)}</span>
      </Card>
      <div className="success-actions">
        <ButtonLink to={`/sessoes/${appointment.id}`}>Ver sessão</ButtonLink>
        <ButtonLink to="/inicio" variant="outline">Voltar ao início</ButtonLink>
      </div>
    </div>
  )
}

export function MyAppointmentsPage() {
  const [tab, setTab] = useState('upcoming')
  const [version, setVersion] = useState(0)
  const [items, setItems] = useState([])
  const [next, setNext] = useState(null)
  const [loadedKey, setLoadedKey] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const requestKey = `${tab}:${version}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let active = true
    const path = tab === 'upcoming'
      ? `/agendamentos/?data_inicio=${hojeLocal()}`
      : `/agendamentos/?data_fim=${ontemLocal()}&ordering=-inicio`
    api.get(path).then((data) => {
      if (active) {
        setItems(listOf(data))
        setNext(Array.isArray(data) ? null : data.next)
        setError(null)
        setLoadedKey(requestKey)
      }
    }).catch((reason) => { if (active) { setError(reason); setLoadedKey(requestKey) } })
    return () => { active = false }
  }, [tab, version, requestKey])

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const page = await api.get(next)
      setItems((current) => current.concat(listOf(page)))
      setNext(page.next)
    } catch (reason) {
      setError(reason)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <PageHeading eyebrow="SEU CAMINHO NO ESTÚDIO" title="Minhas sessões" description="Acompanhe seus próximos encontros e revisite os que já aconteceram." action={<ButtonLink to="/agendar/servico">+ Agendar</ButtonLink>} />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'is-active' : ''} onClick={() => setTab('upcoming')}>Próximas</button>
        <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'is-active' : ''} onClick={() => setTab('history')}>Histórico</button>
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={() => setVersion((current) => current + 1)} /> : items.length ? (
        <div className="appointment-list">{items.map((item) => <AppointmentCard appointment={item} key={item.id} />)}</div>
      ) : <EmptyState title="Nenhuma sessão aqui" description={tab === 'upcoming' ? 'Quando uma sessão for marcada, ela vai aparecer nesta lista.' : 'Suas sessões concluídas aparecerão aqui.'} action={tab === 'upcoming' && <ButtonLink to="/agendar/servico">Agendar uma sessão</ButtonLink>} />}
      {next && !loading && <Button className="load-more" variant="outline" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Carregando...' : 'Carregar mais sessões'}</Button>}
    </>
  )
}

function AppointmentDetail({ admin = false }) {
  const { id } = useParams()
  const { can } = useAuth()
  const { data, loading, error, reload } = useApi(`/agendamentos/${id}/`)
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)
  if (loading) return <Loading />
  if (error) return error.status === 404
    ? <NotFoundState to={admin ? '/admin/agenda' : '/sessoes'} label={admin ? 'a agenda' : 'suas sessões'} />
    : <ErrorState error={error} onRetry={reload} />
  const booking = data

  async function runAction(action) {
    if (action === 'cancelar' && !window.confirm('Tem certeza que deseja cancelar esta sessão?')) return
    setBusy(true)
    setActionError(null)
    try {
      await api.post(`/agendamentos/${id}/${action}/`)
      reload()
    } catch (reason) {
      setActionError(reason)
    } finally {
      setBusy(false)
    }
  }

  const canCancel = ['solicitado', 'confirmado'].includes(booking.status) &&
    can('api.cancelar_agendamento')

  return (
    <div className="content-narrow">
      <TextLink to={admin ? '/admin/agenda' : '/sessoes'}>← Voltar para {admin ? 'agenda' : 'minhas sessões'}</TextLink>
      <PageHeading eyebrow={admin ? 'DETALHES DO AGENDAMENTO' : 'SUA SESSÃO'} title={booking.servico_nome} description={`${formatarData(booking.inicio, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatarHora(booking.inicio)}`} />
      <Card className="detail-card">
        <div className="detail-top"><StatusBadge status={booking.status} /><span>{booking.recurso_nome}</span></div>
        <dl>
          {admin && <div><dt>Cliente</dt><dd>{booking.cliente_nome}</dd></div>}
          <div><dt>Tatuador</dt><dd>{booking.recurso_nome}</dd></div>
          <div><dt>Data e horário</dt><dd>{formatarData(booking.inicio)} às {formatarHora(booking.inicio)}</dd></div>
          <div><dt>Horário de término</dt><dd>{formatarHora(booking.fim)}</dd></div>
          <div><dt>Ideia e observações</dt><dd className="detail-notes">{booking.observacoes || 'Nenhuma observação informada.'}</dd></div>
          {booking.nota && <div><dt>Avaliação</dt><dd>{'★'.repeat(booking.nota)}{'☆'.repeat(5 - booking.nota)}{booking.comentario ? ` · ${booking.comentario}` : ''}</dd></div>}
        </dl>
      </Card>
      {actionError && <FormError error={actionError} />}
      <div className="detail-actions">
        {admin && booking.status === 'solicitado' && can('api.confirmar_agendamento') && <Button disabled={busy} type="button" onClick={() => runAction('confirmar')}>Confirmar sessão</Button>}
        {admin && booking.status === 'confirmado' && can('api.concluir_agendamento') && <Button disabled={busy} type="button" onClick={() => runAction('concluir')}>Marcar como concluída</Button>}
        {canCancel && <Button variant="outline" disabled={busy} type="button" onClick={() => runAction('cancelar')}>Cancelar sessão</Button>}
        {!admin && booking.status === 'concluido' && !booking.nota && can('api.avaliar_agendamento') && <ButtonLink to={`/sessoes/${id}/avaliar`}>Avaliar sessão</ButtonLink>}
        {admin && <ButtonLink to="/admin/agenda" variant="outline">Voltar à agenda</ButtonLink>}
      </div>
    </div>
  )
}

export function AppointmentDetailPage() {
  return <AppointmentDetail />
}

export function AdminAppointmentProxy() {
  return <AppointmentDetail admin />
}

export function RateAppointmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post(`/agendamentos/${id}/avaliar/`, { nota, comentario })
      navigate(`/sessoes/${id}`, { replace: true })
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <PageHeading eyebrow="SUA VOZ IMPORTA" title="Como foi sua sessão?" description="Sua avaliação ajuda outras pessoas a conhecerem o trabalho do artista." />
      <form className="rating-form" onSubmit={submit}>
        <FormError error={error} />
        <fieldset className="star-rating">
          <legend>Sua nota</legend>
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} estrela${value > 1 ? 's' : ''}`} aria-pressed={nota === value} className={value <= nota ? 'is-selected' : ''} onClick={() => setNota(value)}>★</button>)}
        </fieldset>
        <FormField label="Deixe um comentário">
          <textarea rows="5" value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Conte um pouco sobre sua experiência..." />
        </FormField>
        <Button type="submit" disabled={busy || nota < 1}>{busy ? 'Enviando...' : 'Enviar avaliação'}</Button>
      </form>
    </div>
  )
}

export function ArtistsPage() {
  const { data, loading, error, reload } = useAllPages('/recursos/?ativo=true')
  const artists = listOf(data)
  return (
    <>
      <PageHeading eyebrow="QUEM VAI CRIAR COM VOCÊ" title="Conheça os tatuadores" description="Cada artista tem seu traço, sua história e um jeito único de transformar ideias em arte." />
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : artists.length ? (
        <div className="artist-grid artist-grid-large">
          {artists.map((artist) => <Link className="artist-profile-card" to={`/tatuadores/${artist.id}`} key={artist.id}>
            <Avatar src={artist.foto} name={artist.nome} />
            <div><h2>{artist.nome}</h2><p>{artist.bio}</p><span>Conheça o trabalho <b>↗</b></span></div>
          </Link>)}
        </div>
      ) : <EmptyState title="Nenhum tatuador cadastrado" description="Estamos preparando algo especial. Volte em breve." />}
    </>
  )
}

export function ArtistDetailPage() {
  const { id } = useParams()
  const artist = useApi(`/recursos/${id}/`)
  const services = useAllPages(`/servicos/?ativo=true&recursos=${id}`)
  const reviews = useAllPages(`/avaliacoes/?recurso=${id}`)
  if (artist.loading) return <Loading />
  if (artist.error) return artist.error.status === 404
    ? <NotFoundState to="/tatuadores" label="os tatuadores" />
    : <ErrorState error={artist.error} onRetry={artist.reload} />
  const feedback = listOf(reviews.data)
  return (
    <div className="content-narrow">
      <TextLink to="/tatuadores">← Todos os tatuadores</TextLink>
      <section className="artist-profile-hero">
        <Avatar src={artist.data.foto} name={artist.data.nome} />
        <div><p className="eyebrow">SEU ARTISTA</p><h1>{artist.data.nome}</h1><p>{artist.data.bio}</p><ButtonLink to="/agendar/servico" state={{ recurso: artist.data }}>Agendar com este tatuador <span>↗</span></ButtonLink></div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">O QUE PODEMOS CRIAR</p><h2>Serviços</h2></div></div>
        {services.loading ? <Loading /> : services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : listOf(services.data).length ? <div className="service-mini-list">{listOf(services.data).map((service) => <div key={service.id}><strong>{service.nome}</strong><span>{service.duracao_min} min</span><span>{moeda(service.preco)}</span></div>)}</div> : <p className="muted">Nenhum serviço disponível no momento.</p>}
      </section>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">QUEM JÁ CRIOU AQUI</p><h2>Avaliações</h2></div></div>
        {reviews.loading ? <Loading /> : reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.reload} /> : feedback.length ? <div className="review-list">{feedback.map((item) => <ReviewCard review={item} key={item.id} />)}</div> : <EmptyState title="Ainda sem avaliações" description="As avaliações das sessões concluídas vão aparecer aqui." />}
      </section>
    </div>
  )
}

function ReviewCard({ review }) {
  return <Card className="review-card"><div><span className="review-stars">{'★'.repeat(review.nota)}{'☆'.repeat(5 - review.nota)}</span><time>{formatarData(review.inicio)}</time></div><p>{review.comentario || 'Sem comentário.'}</p><small>{review.cliente_nome} · {review.servico_nome}</small></Card>
}

export function ProfilePage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState(user.nome || '')
  const [foto, setFoto] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(event) {
    event.preventDefault()
    setError(null)
    setSuccess('')
    setBusy(true)
    try {
      if (foto) {
        const form = new FormData()
        form.append('nome', nome)
        form.append('foto', foto)
        await api.patch('/auth/eu/', form)
      } else {
        await api.patch('/auth/eu/', { nome, ...(removePhoto ? { foto: null } : {}) })
      }
      await refreshUser()
      setFoto(null)
      setRemovePhoto(false)
      setSuccess('Seus dados foram atualizados.')
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="content-narrow">
      <PageHeading eyebrow="SUA CONTA" title="Meu perfil" description="Mantenha seus dados atualizados para acompanhar suas sessões." />
      <Card className="profile-card">
        <div className="profile-overview"><Avatar src={removePhoto ? null : user.foto} name={user.nome} className="avatar-large" /><div><strong>{user.nome}</strong><span>{user.email}</span><small>{user.organizacao?.nome || 'Estúdio de tatuagem'}</small></div></div>
        <form className="form-stack" onSubmit={save}>
          <FormError error={error} />
          {success && <div className="notice notice-success">{success}</div>}
          <FormField label="Nome" error={error?.data?.nome}><input required value={nome} onChange={(event) => setNome(event.target.value)} /></FormField>
          <FormField label="Foto de perfil" error={error?.data?.foto}><input type="file" accept="image/*" onChange={(event) => { setFoto(event.target.files?.[0] || null); setRemovePhoto(false) }} /></FormField>
          {user.foto && <button className="text-button align-start" type="button" onClick={() => { setRemovePhoto(true); setFoto(null) }}>Remover foto atual</button>}
          <Button disabled={busy} type="submit">{busy ? 'Salvando...' : 'Salvar alterações'}</Button>
        </form>
      </Card>
      <div className="profile-links"><Link to="/perfil/senha">Alterar senha <span>→</span></Link><button type="button" onClick={signOut}>Sair da conta <span>↗</span></button></div>
    </div>
  )
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError(null)
    if (values.nova_senha !== values.confirmacao) {
      setError({ message: 'A confirmação da nova senha não confere.', data: { confirmacao: ['As senhas devem ser iguais.'] } })
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/alterar-senha/', { senha_atual: values.senha_atual, nova_senha: values.nova_senha })
      setSuccess(true)
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <TextLink to="/perfil">← Meu perfil</TextLink>
      <PageHeading eyebrow="SEGURANÇA DA CONTA" title="Alterar senha" description="Escolha uma senha forte que você ainda não tenha usado." />
      {success ? <Card className="notice notice-success">Senha alterada com sucesso. <button className="text-button" type="button" onClick={() => navigate('/perfil')}>Voltar ao perfil</button></Card> : (
        <form className="form-stack form-card" onSubmit={submit}>
          <FormError error={error} />
          <FormField label="Senha atual" error={error?.data?.senha_atual}><input type="password" name="senha_atual" autoComplete="current-password" required value={values.senha_atual} onChange={update} /></FormField>
          <FormField label="Nova senha" error={error?.data?.nova_senha}><input type="password" name="nova_senha" autoComplete="new-password" minLength="8" required value={values.nova_senha} onChange={update} /></FormField>
          <FormField label="Confirme a nova senha" error={error?.data?.confirmacao}><input type="password" name="confirmacao" autoComplete="new-password" minLength="8" required value={values.confirmacao} onChange={update} /></FormField>
          <div className="wizard-actions"><TextLink to="/perfil">Cancelar</TextLink><Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</Button></div>
        </form>
      )}
    </div>
  )
}