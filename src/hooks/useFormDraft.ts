import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReset, UseFormWatch } from 'react-hook-form'
import { clearFormDraft, loadFormDraft, saveFormDraft } from '@/lib/form-draft'

interface UseFormDraftOptions<T extends FieldValues> {
  key: string
  watch: UseFormWatch<T>
  reset: UseFormReset<T>
  /** Désactiver (ex. mode édition). */
  enabled?: boolean
  debounceMs?: number
}

/**
 * Restaure un brouillon au montage et sauvegarde périodiquement les valeurs du formulaire.
 * Appeler `clearFormDraft(key)` après un submit réussi.
 */
export function useFormDraft<T extends FieldValues>({
  key,
  watch,
  reset,
  enabled = true,
  debounceMs = 600,
}: UseFormDraftOptions<T>): void {
  const restored = useRef(false)
  const values = watch()

  useEffect(() => {
    if (!enabled || restored.current) return
    restored.current = true
    const draft = loadFormDraft<T>(key)
    if (draft && typeof draft === 'object') {
      reset({ ...draft } as T, { keepDefaultValues: false })
    }
  }, [enabled, key, reset])

  useEffect(() => {
    if (!enabled || !restored.current) return
    const timer = window.setTimeout(() => {
      saveFormDraft(key, values)
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [enabled, key, values, debounceMs])
}

export { clearFormDraft }
