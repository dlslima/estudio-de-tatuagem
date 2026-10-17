import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { api, ORGANIZACAO } from '../api/client'
import { Button, FormError, FormField } from '../components/UI'

function AuthFrame({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-art">
        <Link className="brand-lockup brand-light" to="/">
          <span className="brand-symbol">✳</span><span><strong>Estúdio</strong><small>de tatuagem</small></span>
        </Link>
        <div className="auth-art-copy">
          <p className="eyebrow">ARTE NA PELE, HISTÓRIAS PARA SEMPRE</p>
          <h1>Uma ideia.<br />Sua pele.<br /><em>Sua história.</em></h1>
          <p>Encontre seu estilo, conheça nossos artistas e marque sua próxima sessão.</p>
        </div>
        <div className="auth-illustration" aria-hidden="true"><span>✳</span><i /><b>ONE<br />OF<br />A KIND</b></div>
        <span className="auth-art-note">feito para ser só seu</span>
      </section>
      <section className="auth-form-wrap">{children}</section>
    </main>
  )
}

export function EntryPage() {
  return (
    <AuthFrame>
      <div className="auth-content">
        <p className="eyebrow">BEM-VINDO AO ESTÚDIO</p>
        <h2>Vamos transformar<br />sua ideia em arte.</h2>
        <p className="muted">Conheça os tatuadores, escolha seu serviço e encontre um horário para começar.</p>
        <div className="auth-actions">
          <Link className="button button-primary button-wide" to="/login">Entrar na minha conta <span>→</span></Link>
          <Link className="button button-outline button-wide" to="/cadastro">Criar uma conta</Link>
        </div>
        <div className="auth-footnote"><span className="tiny-star">✳</span> Atendimento por agendamento</div>
      </div>
    </AuthFrame>
  )
}

export function AuthPage() {
  const { login, restoreError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await login(email, senha)
      navigate(location.state?.from || (user.permissoes?.includes('api.change_organizacao') ? '/admin/agenda' : '/inicio'), { replace: true })
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame>
      <div className="auth-content">
        <Link className="back-link" to="/">← Voltar</Link>
        <p className="eyebrow">SUA PRÓXIMA IDEIA COMEÇA AQUI</p>
        <h2>Que bom ter você<br />de volta.</h2>
        <p className="muted">Entre para continuar seu caminho com a gente.</p>
        <form className="form-stack" onSubmit={submit}>
          <FormError error={error || restoreError} />
          <FormField label="E-mail" error={error?.data?.email}>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </FormField>
          <FormField label="Senha" error={error?.data?.senha}>
            <input type="password" autoComplete="current-password" required value={senha} onChange={(event) => setSenha(event.target.value)} />
          </FormField>
          <div className="form-underlink"><Link to="/esqueci-senha">Esqueci minha senha</Link></div>
          <Button className="button-wide" type="submit" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</Button>
        </form>
        <p className="auth-switch">Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
      </div>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ nome: '', email: '', senha: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register(values)
      navigate('/inicio', { replace: true })
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame>
      <div className="auth-content">
        <Link className="back-link" to="/">← Voltar</Link>
        <p className="eyebrow">BORA CRIAR ALGO ÚNICO?</p>
        <h2>Crie sua conta.</h2>
        <p className="muted">Assim você acompanha seus pedidos e suas sessões num só lugar.</p>
        <form className="form-stack" onSubmit={submit}>
          <FormError error={error} />
          <FormField label="Seu nome" error={error?.data?.nome}>
            <input name="nome" autoComplete="name" required value={values.nome} onChange={update} />
          </FormField>
          <FormField label="E-mail" error={error?.data?.email}>
            <input name="email" type="email" autoComplete="email" required value={values.email} onChange={update} />
          </FormField>
          <FormField label="Crie uma senha" error={error?.data?.senha} hint="Use uma senha segura com pelo menos 8 caracteres.">
            <input name="senha" type="password" autoComplete="new-password" minLength="8" required value={values.senha} onChange={update} />
          </FormField>
          <Button className="button-wide" type="submit" disabled={busy}>{busy ? 'Criando conta...' : 'Criar conta'}</Button>
        </form>
        <p className="auth-switch">Já tem uma conta? <Link to="/login">Entrar</Link></p>
      </div>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post('/auth/redefinir-senha/', { organizacao: ORGANIZACAO, email }, { auth: false })
      setSent(true)
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame>
      <div className="auth-content">
        <Link className="back-link" to="/login">← Voltar ao login</Link>
        <p className="eyebrow">RECUPERAÇÃO DE ACESSO</p>
        <h2>Esqueceu a senha?</h2>
        {sent ? (
          <div className="notice notice-success">
            Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.
            <button className="text-button" type="button" onClick={() => navigate('/login')}>Voltar ao login</button>
          </div>
        ) : (
          <>
            <p className="muted">Informe seu e-mail e enviaremos as instruções de recuperação.</p>
            <form className="form-stack" onSubmit={submit}>
              <FormError error={error} />
              <FormField label="E-mail" error={error?.data?.email}>
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormField>
              <Button className="button-wide" type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Enviar instruções'}</Button>
            </form>
          </>
        )}
      </div>
    </AuthFrame>
  )
}