import { lazyPage } from '@/routes/lazy-page'

export const LoginPage = lazyPage(() => import('@/pages/auth/LoginPage'), 'LoginPage')
export const DashboardPage = lazyPage(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage')

export const TicketsListPage = lazyPage(() => import('@/pages/tickets/TicketsListPage'), 'TicketsListPage')
export const TicketCreatePage = lazyPage(() => import('@/pages/tickets/TicketCreatePage'), 'TicketCreatePage')
export const TicketDetailPage = lazyPage(() => import('@/pages/tickets/TicketDetailPage'), 'TicketDetailPage')
export const TicketEditPage = lazyPage(() => import('@/pages/tickets/TicketEditPage'), 'TicketEditPage')

export const CheckInsListPage = lazyPage(() => import('@/pages/checkins/CheckInsListPage'), 'CheckInsListPage')
export const CheckInCreatePage = lazyPage(() => import('@/pages/checkins/CheckInCreatePage'), 'CheckInCreatePage')
export const CheckInDetailPage = lazyPage(() => import('@/pages/checkins/CheckInDetailPage'), 'CheckInDetailPage')
export const CheckInEditPage = lazyPage(() => import('@/pages/checkins/CheckInEditPage'), 'CheckInEditPage')

export const FreightListPage = lazyPage(() => import('@/pages/freight/FreightListPage'), 'FreightListPage')
export const FreightCreatePage = lazyPage(() => import('@/pages/freight/FreightCreatePage'), 'FreightCreatePage')
export const FreightDetailPage = lazyPage(() => import('@/pages/freight/FreightDetailPage'), 'FreightDetailPage')
export const FreightEditPage = lazyPage(() => import('@/pages/freight/FreightEditPage'), 'FreightEditPage')

export const CashTransactionsListPage = lazyPage(
  () => import('@/pages/cash-transactions/CashTransactionsListPage'),
  'CashTransactionsListPage',
)
export const CashTransactionCreatePage = lazyPage(
  () => import('@/pages/cash-transactions/CashTransactionCreatePage'),
  'CashTransactionCreatePage',
)
export const CashTransactionDetailPage = lazyPage(
  () => import('@/pages/cash-transactions/CashTransactionDetailPage'),
  'CashTransactionDetailPage',
)

export const AdminPage = lazyPage(() => import('@/pages/admin/AdminPage'), 'AdminPage')
export const SuperAdminSetupPage = lazyPage(() => import('@/pages/admin/SuperAdminSetupPage'), 'SuperAdminSetupPage')
export const IssuingOfficesPage = lazyPage(() => import('@/pages/admin/IssuingOfficesPage'), 'IssuingOfficesPage')
export const IssuingOfficeFormPage = lazyPage(() => import('@/pages/admin/IssuingOfficeFormPage'), 'IssuingOfficeFormPage')
export const IssuingOfficeDetailPage = lazyPage(
  () => import('@/pages/admin/IssuingOfficeDetailPage'),
  'IssuingOfficeDetailPage',
)
export const ProvincesPage = lazyPage(() => import('@/pages/admin/ProvincesPage'), 'ProvincesPage')
export const ProvinceFormPage = lazyPage(() => import('@/pages/admin/ProvinceFormPage'), 'ProvinceFormPage')
export const ProvinceDetailPage = lazyPage(() => import('@/pages/admin/ProvinceDetailPage'), 'ProvinceDetailPage')
export const CheckpointsPage = lazyPage(() => import('@/pages/admin/CheckpointsPage'), 'CheckpointsPage')
export const CheckpointFormPage = lazyPage(() => import('@/pages/admin/CheckpointFormPage'), 'CheckpointFormPage')
export const CheckpointDetailPage = lazyPage(() => import('@/pages/admin/CheckpointDetailPage'), 'CheckpointDetailPage')
export const UsersPage = lazyPage(() => import('@/pages/admin/UsersPage'), 'UsersPage')
export const UserFormPage = lazyPage(() => import('@/pages/admin/UserFormPage'), 'UserFormPage')
export const UserEditPage = lazyPage(() => import('@/pages/admin/UserEditPage'), 'UserEditPage')
export const ProfilesPage = lazyPage(() => import('@/pages/admin/ProfilesPage'), 'ProfilesPage')
export const ProfileFormPage = lazyPage(() => import('@/pages/admin/ProfileFormPage'), 'ProfileFormPage')
export const ActivitiesPage = lazyPage(() => import('@/pages/admin/ActivitiesPage'), 'ActivitiesPage')
export const CurrenciesPage = lazyPage(() => import('@/pages/admin/CurrenciesPage'), 'CurrenciesPage')
export const CurrencyFormPage = lazyPage(() => import('@/pages/admin/CurrencyFormPage'), 'CurrencyFormPage')
export const CurrencyDetailPage = lazyPage(() => import('@/pages/admin/CurrencyDetailPage'), 'CurrencyDetailPage')
export const ExchangeRatesPage = lazyPage(() => import('@/pages/admin/ExchangeRatesPage'), 'ExchangeRatesPage')
export const ExchangeRateFormPage = lazyPage(() => import('@/pages/admin/ExchangeRateFormPage'), 'ExchangeRateFormPage')
export const ExchangeRateDetailPage = lazyPage(
  () => import('@/pages/admin/ExchangeRateDetailPage'),
  'ExchangeRateDetailPage',
)
export const CashRegistersPage = lazyPage(() => import('@/pages/admin/CashRegistersPage'), 'CashRegistersPage')
export const CashRegisterFormPage = lazyPage(() => import('@/pages/admin/CashRegisterFormPage'), 'CashRegisterFormPage')
export const CashRegisterDetailPage = lazyPage(
  () => import('@/pages/admin/CashRegisterDetailPage'),
  'CashRegisterDetailPage',
)

export const ProfilePage = lazyPage(() => import('@/pages/profile/ProfilePage'), 'ProfilePage')
export const NoIssuingOfficePage = lazyPage(() => import('@/pages/info/NoIssuingOfficePage'), 'NoIssuingOfficePage')
export const UnauthorizedPage = lazyPage(() => import('@/pages/info/UnauthorizedPage'), 'UnauthorizedPage')
