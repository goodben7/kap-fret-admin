import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode | {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

function isEmptyStateAction(
  action: NonNullable<EmptyStateProps['action']>,
): action is { label: string; onClick: () => void } {
  return typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        isEmptyStateAction(action) ? (
          <Button className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : (
          <div className="mt-4">{action}</div>
        )
      )}
      {children}
    </div>
  )
}
