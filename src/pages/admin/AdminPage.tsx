import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronRight,
  History,
  Map,
  MapPin,
  Settings,
  Shield,
  Users,
  Banknote,
  ArrowLeftRight,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AdminModule {
  title: string
  description: string
  path: string
  icon: LucideIcon
}

interface AdminSection {
  title: string
  items: AdminModule[]
}

const adminSections: AdminSection[] = [
  {
    title: 'Accès & comptes',
    items: [
      {
        title: 'Profils',
        description: 'Rôles, permissions et droits d\'accès',
        path: '/admin/profiles',
        icon: Shield,
      },
      {
        title: 'Utilisateurs',
        description: 'Comptes agents et administrateurs',
        path: '/admin/users',
        icon: Users,
      },
    ],
  },
  {
    title: 'Organisation',
    items: [
      {
        title: 'Bureaux d\'émission',
        description: 'Points de vente et guichets',
        path: '/admin/issuing-offices',
        icon: Building2,
      },
      {
        title: 'Devises',
        description: 'CDF, USD et monnaies du bureau',
        path: '/admin/currencies',
        icon: Banknote,
      },
      {
        title: 'Taux de change',
        description: 'Conversions entre devises du bureau',
        path: '/admin/exchange-rates',
        icon: ArrowLeftRight,
      },
      {
        title: 'Transactions',
        description: 'Mouvements caisse, encaissements et décaissements',
        path: '/cash-transactions',
        icon: Receipt,
      },
    ],
  },
  {
    title: 'Audit',
    items: [
      {
        title: 'Journal d\'activité',
        description: 'Historique des actions sur toute la plateforme',
        path: '/admin/activities',
        icon: History,
      },
    ],
  },
  {
    title: 'Référentiel',
    items: [
      {
        title: 'Provinces',
        description: 'Zones géographiques et territoires',
        path: '/admin/provinces',
        icon: Map,
      },
      {
        title: 'Checkpoints',
        description: 'Escales, aéroports et lieux de transit',
        path: '/admin/checkpoints',
        icon: MapPin,
      },
    ],
  },
]

function AdminModuleCard({ module }: { module: AdminModule }) {
  const Icon = module.icon

  return (
    <Link to={module.path} className="block group">
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm transition-all active:scale-[0.99] group-hover:border-brand-orange/40 group-hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{module.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{module.description}</p>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-brand-orange"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  )
}

function AdminSectionBlock({ section }: { section: AdminSection }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {section.title}
      </h2>
      <div className="space-y-3">
        {section.items.map((module) => (
          <AdminModuleCard key={module.path} module={module} />
        ))}
      </div>
    </section>
  )
}

export function AdminPage() {
  const moduleCount = adminSections.reduce((acc, section) => acc + section.items.length, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6 lg:max-w-5xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {moduleCount} modules de configuration
        </p>
      </div>

      <div className="space-y-6">
        {adminSections.map((section) => (
          <AdminSectionBlock key={section.title} section={section} />
        ))}
      </div>
    </div>
  )
}
