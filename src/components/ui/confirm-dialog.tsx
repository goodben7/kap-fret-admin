import * as Dialog from '@radix-ui/react-dialog'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { AlertTriangle, CheckCircle2, RotateCcw, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export type ConfirmDialogVariant = 'success' | 'warning' | 'destructive' | 'default'

const VARIANT_STYLES: Record<
  ConfirmDialogVariant,
  { icon: LucideIcon; iconBg: string; iconColor: string; confirmClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  warning: {
    icon: RotateCcw,
    iconBg: 'bg-brand-orange/15',
    iconColor: 'text-brand-orange',
    confirmClass: 'bg-brand-orange hover:bg-brand-orange/90 text-white',
  },
  destructive: {
    icon: AlertTriangle,
    iconBg: 'bg-destructive/15',
    iconColor: 'text-destructive',
    confirmClass: 'bg-destructive hover:bg-destructive/90 text-white',
  },
  default: {
    icon: CheckCircle2,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    confirmClass: '',
  },
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: ConfirmDialogVariant
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  variant = 'default',
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  loading = false,
  children,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant]
  const Icon = styles.icon

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-2xl border border-border/80 bg-background p-0 shadow-2xl outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          )}
        >
          <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fermer"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>

            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span
                className={cn(
                  'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                  styles.iconBg,
                  styles.iconColor,
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
              </span>

              <Dialog.Title className="text-lg font-bold tracking-tight sm:text-xl">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>

            {children && (
              <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4">{children}</div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                className={cn('h-11 rounded-xl font-semibold', styles.confirmClass)}
                onClick={() => void onConfirm()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderIcon />
                    Traitement...
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
