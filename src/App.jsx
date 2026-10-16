import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import { Loading } from './components/AsyncState'
import { AppLayout } from './components/Layout'
import { AuthPage, EntryPage, ForgotPasswordPage, RegisterPage } from './pages/AuthPages'
import {
  ArtistDetailPage,
  ArtistsPage,
  BookingConfirmationPage,
  BookingSentPage,
  BookingServicePage,
  BookingTattooerPage,
  BookingTimePage,
  CustomerHomePage,
  MyAppointmentsPage,
  AppointmentDetailPage,
  RateAppointmentPage,
  ProfilePage,
  ChangePasswordPage,
} from './pages/CustomerPages'
import {
  AdminAgendaPage,
  AdminBusinessPage,
  AdminConfirmationsPage,
  AdminReviewsPage,
  AdminResourceFormPage,
  AdminResourcesPage,
  AdminServiceFormPage,
  AdminServicesPage,
  AdminAvailabilityPage,
  AdminAppointmentPage,
} from './pages/AdminPages'
import './App.css'

function PrivateRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading label="Preparando seu espaço..." />
  return user ? <AppLayout><Outlet /></AppLayout> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function PublicRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Loading label="Preparando seu espaço..." />
  return user ? <Navigate to={isAdmin ? '/admin/agenda' : '/inicio'} replace /> : children
}

function AdminRoute() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/inicio" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><EntryPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/esqueci-senha" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route element={<PrivateRoutes />}>
        <Route path="/inicio" element={<CustomerHomePage />} />
        <Route path="/agendar/servico" element={<BookingServicePage />} />
        <Route path="/agendar/tatuador" element={<BookingTattooerPage />} />
        <Route path="/agendar/horario" element={<BookingTimePage />} />
        <Route path="/agendar/confirmar" element={<BookingConfirmationPage />} />
        <Route path="/agendar/enviado" element={<BookingSentPage />} />
        <Route path="/sessoes" element={<MyAppointmentsPage />} />
        <Route path="/sessoes/:id" element={<AppointmentDetailPage />} />
        <Route path="/sessoes/:id/avaliar" element={<RateAppointmentPage />} />
        <Route path="/tatuadores" element={<ArtistsPage />} />
        <Route path="/tatuadores/:id" element={<ArtistDetailPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/perfil/senha" element={<ChangePasswordPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/agenda" element={<AdminAgendaPage />} />
          <Route path="/admin/confirmar" element={<AdminConfirmationsPage />} />
          <Route path="/admin/sessoes/:id" element={<AdminAppointmentPage />} />
          <Route path="/admin/negocio" element={<AdminBusinessPage />} />
          <Route path="/admin/tatuadores" element={<AdminResourcesPage />} />
          <Route path="/admin/tatuadores/novo" element={<AdminResourceFormPage />} />
          <Route path="/admin/tatuadores/:id" element={<AdminResourceFormPage />} />
          <Route path="/admin/tatuadores/:id/horarios" element={<AdminAvailabilityPage />} />
          <Route path="/admin/servicos" element={<AdminServicesPage />} />
          <Route path="/admin/servicos/novo" element={<AdminServiceFormPage />} />
          <Route path="/admin/servicos/:id" element={<AdminServiceFormPage />} />
          <Route path="/admin/avaliacoes" element={<AdminReviewsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
