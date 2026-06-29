import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { ROLES } from '@/constants/roles'

import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TicketsListPage } from '@/pages/tickets/TicketsListPage'
import { TicketCreatePage } from '@/pages/tickets/TicketCreatePage'
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage'
import { TicketEditPage } from '@/pages/tickets/TicketEditPage'
import { CheckInsListPage } from '@/pages/checkins/CheckInsListPage'
import { CheckInCreatePage } from '@/pages/checkins/CheckInCreatePage'
import { CheckInDetailPage } from '@/pages/checkins/CheckInDetailPage'
import { CheckInEditPage } from '@/pages/checkins/CheckInEditPage'
import { FreightListPage } from '@/pages/freight/FreightListPage'
import { FreightCreatePage } from '@/pages/freight/FreightCreatePage'
import { FreightDetailPage } from '@/pages/freight/FreightDetailPage'
import { FreightEditPage } from '@/pages/freight/FreightEditPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { SuperAdminSetupPage } from '@/pages/admin/SuperAdminSetupPage'
import { IssuingOfficesPage } from '@/pages/admin/IssuingOfficesPage'
import { IssuingOfficeFormPage } from '@/pages/admin/IssuingOfficeFormPage'
import { IssuingOfficeDetailPage } from '@/pages/admin/IssuingOfficeDetailPage'
import { ProvincesPage } from '@/pages/admin/ProvincesPage'
import { ProvinceFormPage } from '@/pages/admin/ProvinceFormPage'
import { ProvinceDetailPage } from '@/pages/admin/ProvinceDetailPage'
import { CheckpointsPage } from '@/pages/admin/CheckpointsPage'
import { CheckpointFormPage } from '@/pages/admin/CheckpointFormPage'
import { CheckpointDetailPage } from '@/pages/admin/CheckpointDetailPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { UserFormPage } from '@/pages/admin/UserFormPage'
import { UserEditPage } from '@/pages/admin/UserEditPage'
import { ProfilesPage } from '@/pages/admin/ProfilesPage'
import { ProfileFormPage } from '@/pages/admin/ProfileFormPage'
import { ActivitiesPage } from '@/pages/admin/ActivitiesPage'
import { CurrenciesPage } from '@/pages/admin/CurrenciesPage'
import { CurrencyFormPage } from '@/pages/admin/CurrencyFormPage'
import { CurrencyDetailPage } from '@/pages/admin/CurrencyDetailPage'
import { ExchangeRatesPage } from '@/pages/admin/ExchangeRatesPage'
import { ExchangeRateFormPage } from '@/pages/admin/ExchangeRateFormPage'
import { ExchangeRateDetailPage } from '@/pages/admin/ExchangeRateDetailPage'
import { CashRegistersPage } from '@/pages/admin/CashRegistersPage'
import { CashRegisterFormPage } from '@/pages/admin/CashRegisterFormPage'
import { CashRegisterDetailPage } from '@/pages/admin/CashRegisterDetailPage'
import { CashTransactionsListPage } from '@/pages/cash-transactions/CashTransactionsListPage'
import { CashTransactionCreatePage } from '@/pages/cash-transactions/CashTransactionCreatePage'
import { CashTransactionDetailPage } from '@/pages/cash-transactions/CashTransactionDetailPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { NoIssuingOfficePage } from '@/pages/info/NoIssuingOfficePage'
import { UnauthorizedPage } from '@/pages/info/UnauthorizedPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute requireIssuingOffice={false} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/no-issuing-office', element: <NoIssuingOfficePage /> },
          { path: '/unauthorized', element: <UnauthorizedPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM, ROLES.MGR]} />,
            children: [{ path: '/dashboard', element: <DashboardPage /> }],
          },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM, ROLES.TKT]} />,
            children: [
              { path: '/tickets', element: <TicketsListPage /> },
              { path: '/tickets/new', element: <TicketCreatePage /> },
              { path: '/tickets/:id', element: <TicketDetailPage /> },
              { path: '/tickets/:id/edit', element: <TicketEditPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM, ROLES.CHK]} />,
            children: [
              { path: '/checkins', element: <CheckInsListPage /> },
              { path: '/checkins/new', element: <CheckInCreatePage /> },
              { path: '/checkins/:id', element: <CheckInDetailPage /> },
              { path: '/checkins/:id/edit', element: <CheckInEditPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM, ROLES.FRT]} />,
            children: [
              { path: '/freight', element: <FreightListPage /> },
              { path: '/freight/new', element: <FreightCreatePage /> },
              { path: '/freight/:id', element: <FreightDetailPage /> },
              { path: '/freight/:id/edit', element: <FreightEditPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM, ROLES.MGR, ROLES.TKT, ROLES.CHK, ROLES.FRT]} />,
            children: [
              { path: '/cash-transactions', element: <CashTransactionsListPage /> },
              { path: '/cash-transactions/new', element: <CashTransactionCreatePage /> },
              { path: '/cash-transactions/:id', element: <CashTransactionDetailPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={[ROLES.SPADM, ROLES.ADM]} requireIssuingOffice={false} />,
            children: [
              { path: '/admin', element: <AdminPage /> },
              { path: '/admin/setup', element: <SuperAdminSetupPage /> },
              { path: '/admin/profiles', element: <ProfilesPage /> },
              { path: '/admin/profiles/new', element: <ProfileFormPage /> },
              { path: '/admin/profiles/:id/edit', element: <ProfileFormPage /> },
              { path: '/admin/issuing-offices', element: <IssuingOfficesPage /> },
              { path: '/admin/issuing-offices/new', element: <IssuingOfficeFormPage /> },
              { path: '/admin/issuing-offices/:id', element: <IssuingOfficeDetailPage /> },
              { path: '/admin/issuing-offices/:id/edit', element: <IssuingOfficeFormPage /> },
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/users/new', element: <UserFormPage /> },
              { path: '/admin/users/:id/edit', element: <UserEditPage /> },
              { path: '/admin/provinces', element: <ProvincesPage /> },
              { path: '/admin/provinces/new', element: <ProvinceFormPage /> },
              { path: '/admin/provinces/:id', element: <ProvinceDetailPage /> },
              { path: '/admin/provinces/:id/edit', element: <ProvinceFormPage /> },
              { path: '/admin/checkpoints', element: <CheckpointsPage /> },
              { path: '/admin/checkpoints/new', element: <CheckpointFormPage /> },
              { path: '/admin/checkpoints/:id', element: <CheckpointDetailPage /> },
              { path: '/admin/checkpoints/:id/edit', element: <CheckpointFormPage /> },
              { path: '/admin/currencies', element: <CurrenciesPage /> },
              { path: '/admin/currencies/new', element: <CurrencyFormPage /> },
              { path: '/admin/currencies/:id', element: <CurrencyDetailPage /> },
              { path: '/admin/currencies/:id/edit', element: <CurrencyFormPage /> },
              { path: '/admin/exchange-rates', element: <ExchangeRatesPage /> },
              { path: '/admin/exchange-rates/new', element: <ExchangeRateFormPage /> },
              { path: '/admin/exchange-rates/:id', element: <ExchangeRateDetailPage /> },
              { path: '/admin/cash-registers', element: <CashRegistersPage /> },
              { path: '/admin/cash-registers/new', element: <CashRegisterFormPage /> },
              { path: '/admin/cash-registers/:id', element: <CashRegisterDetailPage /> },
              { path: '/admin/cash-registers/:id/edit', element: <CashRegisterFormPage /> },
              { path: '/admin/activities', element: <ActivitiesPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
