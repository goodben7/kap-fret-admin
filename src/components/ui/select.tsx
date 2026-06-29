import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FocusEventHandler,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  onBlur?: FocusEventHandler<HTMLButtonElement>
  name?: string
  error?: string
  label?: string
  placeholder?: string
  variant?: 'default' | 'filter'
  /** Ouvre la liste vers le haut (utile en bas de panneau / bottom sheet) */
  placement?: 'bottom' | 'top'
  disabled?: boolean
  className?: string
  id?: string
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    className,
    options,
    error,
    label,
    placeholder,
    id: idProp,
    variant = 'default',
    placement = 'bottom',
    disabled,
    value: valueProp,
    defaultValue,
    onChange,
    onBlur,
    name,
  },
  ref,
) {
  const generatedId = useId()
  const selectId = idProp ?? label?.toLowerCase().replace(/\s+/g, '-') ?? generatedId
  const isFilter = variant === 'filter'
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')

  useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement)

  const isControlled = valueProp !== undefined
  const value = isControlled ? valueProp : internalValue

  const selectedOption = options.find((opt) => opt.value === value)
  const displayLabel = selectedOption?.label ?? placeholder ?? 'Sélectionner...'
  const isPlaceholder = !selectedOption

  const emitChange = useCallback(
    (nextValue: string) => {
      if (!isControlled) setInternalValue(nextValue)
      onChange?.({
        target: { value: nextValue, name: name ?? '' },
      } as ChangeEvent<HTMLSelectElement>)
    },
    [isControlled, name, onChange],
  )

  const close = useCallback(() => {
    setIsOpen(false)
    onBlur?.({ target: buttonRef.current } as FocusEvent<HTMLButtonElement>)
  }, [onBlur])

  const selectOption = (nextValue: string) => {
    emitChange(nextValue)
    close()
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target)) close()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  const toggle = () => {
    if (disabled) return
    setIsOpen((open) => !open)
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label id={`${selectId}-label`} htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          aria-invalid={!!error}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            'flex w-full items-center justify-between text-sm transition-all',
            'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            isFilter
              ? cn(
                  'h-11 rounded-xl border px-3.5 font-medium',
                  isOpen
                    ? 'border-input bg-background shadow-sm ring-2 ring-primary/20'
                    : 'border-transparent bg-muted/40 hover:bg-muted/55',
                  !isOpen && 'focus-visible:ring-2 focus-visible:ring-ring/30',
                )
              : cn(
                  'h-10 rounded-md border border-input bg-background px-3 py-2',
                  isOpen && 'ring-2 ring-ring/20',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                ),
            error && 'border-destructive ring-destructive/20',
            className,
          )}
        >
          <span className={cn('truncate text-left', isPlaceholder && 'text-muted-foreground font-normal')}>
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              'ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180 text-primary',
            )}
          />
        </button>

        {isOpen && (
          <ul
            role="listbox"
            aria-labelledby={label ? `${selectId}-label` : undefined}
            className={cn(
              'absolute z-[100] max-h-56 w-full overflow-y-auto overscroll-contain',
              'border border-border/80 bg-popover p-1 shadow-lg',
              isFilter ? 'rounded-xl' : 'rounded-md',
              placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value || '__empty__'} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm text-left transition-colors',
                      'active:scale-[0.99] hover:bg-accent/80',
                      isSelected && 'bg-primary/10 text-primary font-semibold',
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'

export { Select }
