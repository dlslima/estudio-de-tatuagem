export function formatarData(value, options = {}) {
  if (!value) return ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  const formatOptions = Object.keys(options).length ? options : { dateStyle: 'long' }
  return new Intl.DateTimeFormat('pt-BR', formatOptions).format(date)
}

export function formatarHora(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function hojeLocal() {
  const hoje = new Date()
  const offset = hoje.getTimezoneOffset() * 60000
  return new Date(hoje.getTime() - offset).toISOString().slice(0, 10)
}

export function ontemLocal() {
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  const offset = ontem.getTimezoneOffset() * 60000
  return new Date(ontem.getTime() - offset).toISOString().slice(0, 10)
}

export function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function statusLabel(status) {
  return ({
    solicitado: 'Solicitada',
    confirmado: 'Confirmada',
    concluido: 'Concluída',
    cancelado: 'Cancelada',
  })[status] || status
}