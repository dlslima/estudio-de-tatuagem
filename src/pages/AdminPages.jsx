import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, getAllPages } from '../api/client'
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
  TextLink,
} from '../components/UI'
import { AdminAppointmentProxy } from './CustomerPages'
import { useAllPages, useApi } from '../hooks/useApi'
import { formatarData, formatarHora, hojeLocal, moeda } from '../formatos'
import { useAuth } from '../useAuth'

function results(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export function AdminAgendaPage() {
  const [date, setDate] = useState(hojeLocal())
  const [resource, setResource] = useState('')
  const [version, setVersion] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const tattooers = useAllPages('/recursos/?ativo=true')
  const requestKey = `${date}:${resource}:${version}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let active = true
    const path = `/agendamentos/?data_inicio=${date}&data_fim=${date}${resource ? `&recurso=${resource}` : ''}`
    getAllPages(path).then((data) => { if (active) setItems(data) })
      .then(() => { if (active) { setError(null); setLoadedKey(requestKey) } })
      .catch((reason) => { if (active) { setError(reason); setLoadedKey(requestKey) } })
    return () => { active = false }
  }, [date, resource, requestKey])

  return (
    <>
      <PageHeading eyebrow="PAINEL DO ESTÚDIO" title="Agenda do dia" description="Acompanhe as sessões marcadas e o que precisa de atenção." action={<ButtonLink to="/admin/confirmar">Pedidos a confirmar</ButtonLink>} />
      <div className="filter-row">
        <FormField label="Dia"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormField>
        <FormField label="Tatuador">
          <select value={resource} onChange={(event) => setResource(event.target.value)}>
            <option value="">Todos os tatuadores</option>
            {results(tattooers.data).map((artist) => <option key={artist.id} value={artist.id}>{artist.nome}</option>)}
          </select>
        </FormField>
      </div>
      {tattooers.error && <ErrorState error={tattooers.error} onRetry={tattooers.reload} />}
      <p className="eyebrow result-caption">{formatarData(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {items.length} {items.length === 1 ? 'sessão' : 'sessões'}</p>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={() => setVersion((current) => current + 1)} /> : items.length ? <div className="appointment-list">{items.map((item) => <AppointmentCard appointment={item} admin key={item.id} />)}</div> : <EmptyState title="Nenhuma sessão neste dia" description="Escolha outra data para consultar a agenda." />}
    </>
  )
}

export function AdminConfirmationsPage() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [loadedVersion, setLoadedVersion] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [version, setVersion] = useState(0)
  const loading = loadedVersion !== version

  useEffect(() => {
    let active = true
    getAllPages('/agendamentos/?status=solicitado&ordering=inicio')
      .then((data) => {
        if (active) {
          setItems(data)
          setError(null)
          setLoadedVersion(version)
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason)
          setLoadedVersion(version)
        }
      })
    return () => { active = false }
  }, [version])

  async function act(id, action) {
    if (action === 'cancelar' && !window.confirm('Deseja cancelar este pedido?')) return
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/agendamentos/${id}/${action}/`)
      setVersion((current) => current + 1)
    } catch (reason) {
      setError(reason)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeading eyebrow="PRECISA DA SUA ATENÇÃO" title="A confirmar" description="Revise os pedidos recentes e confirme os horários com seus tatuadores." action={<ButtonLink to="/admin/agenda" variant="outline">Ver agenda</ButtonLink>} />
      {error && <ErrorState error={error} onRetry={() => setVersion((current) => current + 1)} />}
      {loading ? <Loading /> : items.length ? <div className="admin-request-list">
        {items.map((item) => <Card className="request-card" key={item.id}>
          <div className="request-main">
            <div className="request-time"><strong>{formatarHora(item.inicio)}</strong><span>{formatarData(item.inicio, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
            <div><h2>{item.servico_nome}</h2><p>{item.cliente_nome} · {item.recurso_nome}</p><small>{item.observacoes}</small></div>
          </div>
          <div className="request-actions"><ButtonLink to={`/admin/sessoes/${item.id}`} variant="outline">Detalhes</ButtonLink>{can('api.confirmar_agendamento') && <Button type="button" disabled={busyId === item.id} onClick={() => act(item.id, 'confirmar')}>{busyId === item.id ? 'Salvando...' : 'Confirmar'}</Button>}{can('api.cancelar_agendamento') && <Button type="button" variant="quiet" disabled={busyId === item.id} onClick={() => act(item.id, 'cancelar')}>Cancelar</Button>}</div>
        </Card>)}
      </div> : !error && <EmptyState title="Nenhum pedido para confirmar" description="Quando alguém solicitar uma sessão, ela vai aparecer aqui." />}
    </>
  )
}

export function AdminAppointmentPage() {
  return <AdminAppointmentProxy />
}

export function AdminBusinessPage() {
  const { refreshUser } = useAuth()
  const { data, loading, error, reload } = useApi('/organizacao/')
  const [draft, setDraft] = useState(null)
  const [logo, setLogo] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const initialValues = { nome: data?.nome || '', descricao: data?.descricao || '' }
  const values = draft || initialValues

  function updateValue(field, value) {
    setDraft((current) => ({ ...(current || initialValues), [field]: value }))
  }

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  async function submit(event) {
    event.preventDefault()
    setSaveError(null)
    setSuccess(false)
    setBusy(true)
    try {
      if (logo) {
        const form = new FormData()
        form.append('nome', values.nome)
        form.append('descricao', values.descricao)
        form.append('logo', logo)
        await api.patch('/organizacao/', form)
      } else {
        await api.patch('/organizacao/', { ...values, ...(removeLogo ? { logo: null } : {}) })
      }
      setSuccess(true)
      reload()
      await refreshUser()
    } catch (reason) {
      setSaveError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <PageHeading eyebrow="IDENTIDADE DO ESTÚDIO" title="Dados do negócio" description="Apresente o estúdio com as informações que seus clientes vão encontrar." />
      <Card className="form-card">
        <div className="business-preview">{data.logo ? <img src={data.logo} alt={`Logo de ${data.nome}`} /> : <span className="brand-symbol">✳</span>}<div><strong>{values.nome || 'Nome do estúdio'}</strong><p>{values.descricao || 'Sua descrição aparece no início do app.'}</p></div></div>
        <form className="form-stack" onSubmit={submit}>
          <FormError error={saveError} />
          {success && <div className="notice notice-success">Informações atualizadas com sucesso.</div>}
          <FormField label="Nome do estúdio" error={saveError?.data?.nome}><input required value={values.nome} onChange={(event) => updateValue('nome', event.target.value)} /></FormField>
          <FormField label="Descrição" error={saveError?.data?.descricao}><textarea rows="4" value={values.descricao} onChange={(event) => updateValue('descricao', event.target.value)} /></FormField>
          <FormField label="Logo" error={saveError?.data?.logo}><input type="file" accept="image/*" onChange={(event) => { setLogo(event.target.files?.[0] || null); setRemoveLogo(false) }} /></FormField>
          {data.logo && <button className="text-button align-start" type="button" onClick={() => { setRemoveLogo(true); setLogo(null) }}>Remover logo atual</button>}
          <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar dados do estúdio'}</Button>
        </form>
      </Card>
    </div>
  )
}

export function AdminResourcesPage() {
  const [active, setActive] = useState('true')
  const { data, loading, error, reload } = useAllPages(`/recursos/?ativo=${active}`)
  return (
    <>
      <PageHeading eyebrow="EQUIPE CRIATIVA" title="Tatuadores" description="Gerencie os perfis, a capacidade e a disponibilidade da equipe." action={<ButtonLink to="/admin/tatuadores/novo">+ Novo tatuador</ButtonLink>} />
      <div className="filter-tabs">{[['true', 'Ativos'], ['false', 'Inativos']].map(([value, label]) => <button key={value} className={active === value ? 'is-active' : ''} type="button" onClick={() => setActive(value)}>{label}</button>)}</div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : results(data).length ? <div className="admin-entity-list">
        {results(data).map((artist) => <div className="entity-row" key={artist.id}><Avatar src={artist.foto} name={artist.nome} /><div className="entity-copy"><strong>{artist.nome}</strong><span>{artist.bio || 'Sem descrição'}</span><small>Capacidade: {artist.capacidade} · {artist.ativo ? 'Ativo' : 'Inativo'}</small></div><Link className="button button-outline" to={`/admin/tatuadores/${artist.id}`}>Editar</Link><Link className="button button-quiet" to={`/admin/tatuadores/${artist.id}/horarios`}>Horários</Link></div>)}
      </div> : <EmptyState title={active === 'true' ? 'Cadastre o primeiro tatuador' : 'Nenhum tatuador inativo'} description="Crie os perfis da equipe para que os clientes possam conhecer seus estilos." action={active === 'true' && <ButtonLink to="/admin/tatuadores/novo">Cadastrar tatuador</ButtonLink>} />}
    </>
  )
}

export function AdminResourceFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const detail = useApi(editing ? `/recursos/${id}/` : null, { enabled: editing })
  const [draft, setDraft] = useState(null)
  const [foto, setFoto] = useState(null)
  const [removeFoto, setRemoveFoto] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const initialValues = {
    nome: detail.data?.nome || '',
    bio: detail.data?.bio || '',
    capacidade: String(detail.data?.capacidade || 1),
    ativo: detail.data?.ativo ?? true,
  }
  const values = draft || initialValues

  function updateValue(field, value) {
    setDraft((current) => ({ ...(current || initialValues), [field]: value }))
  }

  if (detail.loading) return <Loading />
  if (detail.error) return detail.error.status === 404
    ? <NotFoundState to="/admin/tatuadores" label="os tatuadores" />
    : <ErrorState error={detail.error} onRetry={detail.reload} />

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (removeFoto && editing && !foto) {
        await api.patch(`/recursos/${id}/`, { ...values, capacidade: Number(values.capacidade), foto: null })
      } else {
        const form = new FormData()
        Object.entries(values).forEach(([key, value]) => form.append(key, String(value)))
        if (foto) form.append('foto', foto)
        if (editing) await api.patch(`/recursos/${id}/`, form)
        else await api.post('/recursos/', form)
      }
      navigate('/admin/tatuadores')
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <TextLink to="/admin/tatuadores">← Tatuadores</TextLink>
      <PageHeading eyebrow="EQUIPE DO ESTÚDIO" title={editing ? 'Editar tatuador' : 'Novo tatuador'} description="Conte aos clientes sobre o artista e os estilos que ele trabalha." />
      <form className="form-stack form-card" onSubmit={submit}>
        <FormError error={error} />
        {editing && detail.data.foto && !removeFoto && <img className="form-image-preview" src={detail.data.foto} alt={`Foto de ${detail.data.nome}`} />}
        <FormField label="Nome" error={error?.data?.nome}><input required value={values.nome} onChange={(event) => updateValue('nome', event.target.value)} /></FormField>
        <FormField label="Bio e estilos" error={error?.data?.bio}><textarea rows="4" value={values.bio} onChange={(event) => updateValue('bio', event.target.value)} placeholder="Ex.: fineline, blackwork e botânica..." /></FormField>
        <FormField label="Foto de perfil" error={error?.data?.foto}><input type="file" accept="image/*" onChange={(event) => { setFoto(event.target.files?.[0] || null); setRemoveFoto(false) }} /></FormField>
        {editing && detail.data.foto && <button className="text-button align-start" type="button" onClick={() => { setRemoveFoto(true); setFoto(null) }}>Remover foto atual</button>}
        <FormField label="Capacidade simultânea" error={error?.data?.capacidade} hint="Quantidade de sessões que pode atender ao mesmo tempo."><input type="number" min="1" required value={values.capacidade} onChange={(event) => updateValue('capacidade', event.target.value)} /></FormField>
        <label className="check-field"><input type="checkbox" checked={values.ativo} onChange={(event) => updateValue('ativo', event.target.checked)} /> Tatuador ativo para agendamentos</label>
        <div className="wizard-actions">{editing && <ButtonLink to={`/admin/tatuadores/${id}/horarios`} variant="outline">Gerenciar horários</ButtonLink>}<Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar tatuador'}</Button></div>
      </form>
    </div>
  )
}

export function AdminAvailabilityPage() {
  const { id } = useParams()
  const artist = useApi(`/recursos/${id}/`)
  const availability = useAllPages(`/disponibilidades/?recurso=${id}`)
  const [values, setValues] = useState({ dia_semana: '1', hora_inicio: '10:00', hora_fim: '20:00' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const days = [
    { name: 'Segunda-feira', short: 'Seg' },
    { name: 'Terça-feira', short: 'Ter' },
    { name: 'Quarta-feira', short: 'Qua' },
    { name: 'Quinta-feira', short: 'Qui' },
    { name: 'Sexta-feira', short: 'Sex' },
    { name: 'Sábado', short: 'Sáb' },
    { name: 'Domingo', short: 'Dom' },
  ]

  function resetForm() {
    setEditingId(null)
    setValues({ dia_semana: '1', hora_inicio: '10:00', hora_fim: '20:00' })
  }

  async function save(event) {
    event.preventDefault()
    setError(null)
    if (values.hora_inicio >= values.hora_fim) {
      setError(new Error('O horário de término deve ser posterior ao horário de início.'))
      return
    }
    setBusy(true)
    try {
      const body = { ...values, dia_semana: Number(values.dia_semana), recurso: Number(id) }
      if (editingId) await api.patch(`/disponibilidades/${editingId}/`, body)
      else await api.post('/disponibilidades/', body)
      resetForm()
      availability.reload()
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item) {
    if (!window.confirm('Remover esta faixa de horário?')) return
    setError(null)
    try {
      await api.delete(`/disponibilidades/${item.id}/`)
      availability.reload()
    } catch (reason) {
      setError(reason)
    }
  }

  if (artist.loading || availability.loading) return <Loading />
  if (artist.error) return artist.error.status === 404
    ? <NotFoundState to="/admin/tatuadores" label="os tatuadores" />
    : <ErrorState error={artist.error} onRetry={artist.reload} />
  if (availability.error) return <ErrorState error={availability.error} onRetry={availability.reload} />
  const rows = results(availability.data)

  return (
    <div className="content-narrow">
      <TextLink to={`/admin/tatuadores/${id}`}>← Editar tatuador</TextLink>
      <PageHeading eyebrow="DISPONIBILIDADE" title={`Horários de ${artist.data.nome}`} description="Defina os períodos em que os clientes podem marcar sessões." />
      {error && <FormError error={error} />}
      {rows.length ? <div className="availability-list">{rows.map((item) => <div className="availability-row" key={item.id}><div><strong>{days[item.dia_semana]?.name || 'Dia não identificado'}</strong><span>{item.hora_inicio} – {item.hora_fim}</span></div><button className="text-button" type="button" onClick={() => { setEditingId(item.id); setValues({ dia_semana: String(item.dia_semana), hora_inicio: item.hora_inicio, hora_fim: item.hora_fim }) }}>Editar</button><button className="text-button danger-text" type="button" onClick={() => remove(item)}>Remover</button></div>)}</div> : <EmptyState title="Sem horários cadastrados" description="Sem disponibilidade, os clientes não conseguem agendar com este tatuador." />}
      <form className="form-stack form-card" onSubmit={save}>
        <h2>{editingId ? 'Editar faixa de horário' : 'Adicionar horário'}</h2>
        <fieldset className="weekday-calendar">
          <legend>Dia da semana</legend>
          <div className="weekday-calendar-grid">
            {days.map((day, index) => (
              <button
                aria-label={day.name}
                aria-pressed={values.dia_semana === String(index)}
                className={values.dia_semana === String(index) ? 'weekday-calendar-day is-selected' : 'weekday-calendar-day'}
                key={day.name}
                onClick={() => setValues((current) => ({ ...current, dia_semana: String(index) }))}
                type="button"
              >
                {day.short}
              </button>
            ))}
          </div>
          <small className="field-hint">Este horário se repete toda semana neste dia.</small>
        </fieldset>
        <div className="time-inputs"><FormField label="Início"><input type="time" required value={values.hora_inicio} onChange={(event) => setValues((current) => ({ ...current, hora_inicio: event.target.value }))} /></FormField><FormField label="Fim"><input type="time" required value={values.hora_fim} onChange={(event) => setValues((current) => ({ ...current, hora_fim: event.target.value }))} /></FormField></div>
        <div className="wizard-actions">{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar edição</Button>}<Button type="submit" disabled={busy}>{busy ? 'Salvando...' : editingId ? 'Salvar horário' : 'Confirmar'}</Button></div>
      </form>
    </div>
  )
}

export function AdminServicesPage() {
  const [active, setActive] = useState('true')
  const { data, loading, error, reload } = useAllPages(`/servicos/?ativo=${active}`)
  return (
    <>
      <PageHeading eyebrow="O QUE O ESTÚDIO OFERECE" title="Serviços" description="Organize os formatos de sessão, valores e artistas disponíveis." action={<ButtonLink to="/admin/servicos/novo">+ Novo serviço</ButtonLink>} />
      <div className="filter-tabs">{[['true', 'Ativos'], ['false', 'Inativos']].map(([value, label]) => <button key={value} className={active === value ? 'is-active' : ''} type="button" onClick={() => setActive(value)}>{label}</button>)}</div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : results(data).length ? <div className="admin-entity-list">
        {results(data).map((service) => <div className="entity-row service-entity" key={service.id}>{service.imagem ? <img className="entity-image" src={service.imagem} alt="" /> : <span className="entity-image entity-placeholder">✳</span>}<div className="entity-copy"><strong>{service.nome}</strong><span>{service.descricao}</span><small>{service.duracao_min} min · {moeda(service.preco)} · {service.ativo ? 'Ativo' : 'Inativo'}</small></div><Link className="button button-outline" to={`/admin/servicos/${service.id}`}>Editar</Link></div>)}
      </div> : <EmptyState title={active === 'true' ? 'Cadastre o primeiro serviço' : 'Nenhum serviço inativo'} description="Inclua os tipos de sessão oferecidos pelo estúdio." action={active === 'true' && <ButtonLink to="/admin/servicos/novo">Cadastrar serviço</ButtonLink>} />}
    </>
  )
}

export function AdminServiceFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const detail = useApi(editing ? `/servicos/${id}/` : null, { enabled: editing })
  const tattooers = useAllPages('/recursos/?ativo=true')
  const [draft, setDraft] = useState(null)
  const [imagem, setImagem] = useState(null)
  const [removeImagem, setRemoveImagem] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const initialValues = {
    nome: detail.data?.nome || '',
    descricao: detail.data?.descricao || '',
    duracao_min: String(detail.data?.duracao_min || 60),
    preco: String(detail.data?.preco ?? '0'),
    recursos: detail.data?.recursos || [],
    ativo: detail.data?.ativo ?? true,
  }
  const values = draft || initialValues

  function updateValue(field, value) {
    setDraft((current) => ({ ...(current || initialValues), [field]: value }))
  }

  if (detail.loading || tattooers.loading) return <Loading />
  if (detail.error) return detail.error.status === 404
    ? <NotFoundState to="/admin/servicos" label="os serviços" />
    : <ErrorState error={detail.error} onRetry={detail.reload} />
  if (tattooers.error) return <ErrorState error={tattooers.error} onRetry={tattooers.reload} />

  function toggleResource(resourceId) {
    const idNumber = Number(resourceId)
    setDraft((current) => {
      const base = current || initialValues
      return {
        ...base,
        recursos: base.recursos.includes(idNumber)
          ? base.recursos.filter((item) => item !== idNumber)
          : [...base.recursos, idNumber],
      }
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const body = { ...values, duracao_min: Number(values.duracao_min), preco: Number(values.preco) }
    try {
      const service = editing ? await api.patch(`/servicos/${id}/`, body) : await api.post('/servicos/', body)
      const serviceId = service?.id || id
      if (imagem && serviceId) {
        const form = new FormData()
        form.append('imagem', imagem)
        await api.patch(`/servicos/${serviceId}/`, form)
      } else if (removeImagem && serviceId) {
        await api.patch(`/servicos/${serviceId}/`, { imagem: null })
      }
      navigate('/admin/servicos')
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-narrow">
      <TextLink to="/admin/servicos">← Serviços</TextLink>
      <PageHeading eyebrow="CATÁLOGO DO ESTÚDIO" title={editing ? 'Editar serviço' : 'Novo serviço'} description="Defina as informações que os clientes vão usar para escolher a sessão." />
      <form className="form-stack form-card" onSubmit={submit}>
        <FormError error={error} />
        {editing && detail.data.imagem && !removeImagem && <img className="form-image-preview" src={detail.data.imagem} alt={`Imagem de ${detail.data.nome}`} />}
        <FormField label="Nome do serviço" error={error?.data?.nome}><input required value={values.nome} onChange={(event) => updateValue('nome', event.target.value)} /></FormField>
        <FormField label="Descrição" error={error?.data?.descricao}><textarea rows="4" value={values.descricao} onChange={(event) => updateValue('descricao', event.target.value)} /></FormField>
        <div className="time-inputs"><FormField label="Duração (minutos)" error={error?.data?.duracao_min}><input type="number" min="1" required value={values.duracao_min} onChange={(event) => updateValue('duracao_min', event.target.value)} /></FormField><FormField label="Preço (R$)" error={error?.data?.preco}><input type="number" min="0" step="0.01" required value={values.preco} onChange={(event) => updateValue('preco', event.target.value)} /></FormField></div>
        <FormField label="Imagem do serviço" error={error?.data?.imagem}><input type="file" accept="image/*" onChange={(event) => { setImagem(event.target.files?.[0] || null); setRemoveImagem(false) }} /></FormField>
        {editing && detail.data.imagem && <button className="text-button align-start" type="button" onClick={() => { setRemoveImagem(true); setImagem(null) }}>Remover imagem atual</button>}
        <fieldset className="resource-selector"><legend>Tatuadores que oferecem este serviço</legend>{results(tattooers.data).map((artist) => <label key={artist.id}><input type="checkbox" checked={values.recursos.includes(artist.id)} onChange={() => toggleResource(artist.id)} /><span>{artist.nome}</span></label>)}{!results(tattooers.data).length && <small>Cadastre um tatuador antes de vincular ao serviço.</small>}</fieldset>
        <label className="check-field"><input type="checkbox" checked={values.ativo} onChange={(event) => updateValue('ativo', event.target.checked)} /> Serviço ativo para agendamentos</label>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar serviço'}</Button>
      </form>
    </div>
  )
}

export function AdminReviewsPage() {
  const tattooers = useAllPages('/recursos/')
  const [resource, setResource] = useState('')
  const [rating, setRating] = useState('')
  const [items, setItems] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
  const [error, setError] = useState(null)
  const [next, setNext] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [version, setVersion] = useState(0)
  const query = `${resource ? `&recurso=${resource}` : ''}${rating ? `&nota=${rating}` : ''}`
  const path = query ? `/avaliacoes/?${query.slice(1)}` : '/avaliacoes/'
  const requestKey = `${path}:${version}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let active = true
    api.get(path).then((data) => {
      if (active) {
        setItems(results(data))
        setNext(Array.isArray(data) ? null : data.next)
        setError(null)
        setLoadedKey(requestKey)
      }
    }).catch((reason) => { if (active) { setError(reason); setLoadedKey(requestKey) } })
    return () => { active = false }
  }, [path, requestKey])

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const page = await api.get(next)
      setItems((current) => current.concat(results(page)))
      setNext(page.next)
    } catch (reason) {
      setError(reason)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <>
      <PageHeading eyebrow="VOZES DA COMUNIDADE" title="Avaliações" description="Veja o que os clientes acharam das sessões no estúdio." />
      <div className="filter-row">
        <FormField label="Tatuador"><select value={resource} onChange={(event) => setResource(event.target.value)}><option value="">Todos</option>{results(tattooers.data).map((artist) => <option value={artist.id} key={artist.id}>{artist.nome}</option>)}</select></FormField>
        <FormField label="Nota"><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Todas</option>{[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} estrelas</option>)}</select></FormField>
      </div>
      {tattooers.error && <ErrorState error={tattooers.error} onRetry={tattooers.reload} />}
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={() => setVersion((current) => current + 1)} /> : items.length ? <div className="review-list">{items.map((review) => <Card className="review-card" key={review.id}><div><span className="review-stars">{'★'.repeat(review.nota)}{'☆'.repeat(5 - review.nota)}</span><time>{formatarData(review.inicio)}</time></div><p>{review.comentario || 'Sem comentário.'}</p><small>{review.cliente_nome} · {review.recurso_nome} · {review.servico_nome}</small></Card>)}</div> : <EmptyState title="Ainda sem avaliações" description="As avaliações dos clientes vão aparecer aqui." />}
      {next && !loading && <Button type="button" variant="outline" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Carregando...' : 'Carregar mais avaliações'}</Button>}
    </>
  )
}