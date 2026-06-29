import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { provinceKeys } from '@/hooks/useProvinces'
import { checkpointService, type CheckpointFilters } from '@/services/checkpoint.service'
import { getCheckpointId, getCheckpointLabel, getCheckpointLabelFromRef } from '@/lib/checkpoint'
import type { Checkpoint, CheckpointPayload } from '@/types/checkpoint'

export const checkpointKeys = {
  all: ['checkpoints'] as const,
  lists: () => [...checkpointKeys.all, 'list'] as const,
  list: (filters: CheckpointFilters) => [...checkpointKeys.lists(), filters] as const,
  detail: (id: string | number) => [...checkpointKeys.all, 'detail', id] as const,
}

export function useCheckpoints(filters: CheckpointFilters = {}) {
  return useQuery({
    queryKey: checkpointKeys.list(filters),
    queryFn: () => checkpointService.getAll(filters),
  })
}

export function useCheckpoint(id: string | number) {
  return useQuery({
    queryKey: checkpointKeys.detail(id),
    queryFn: () => checkpointService.getById(id),
    enabled: !!id,
  })
}

/** Label du checkpoint (objet embarqué ou GET /api/checkpoints/{id}) */
export function useCheckpointLabel(checkpoint: string | Checkpoint | undefined) {
  const embeddedLabel = getCheckpointLabelFromRef(checkpoint)
  const checkpointId = getCheckpointId(checkpoint)

  const { data, isLoading } = useQuery({
    queryKey: checkpointKeys.detail(checkpointId ?? ''),
    queryFn: () => checkpointService.getById(checkpointId!),
    enabled: !embeddedLabel && !!checkpointId,
  })

  if (embeddedLabel) return { label: embeddedLabel, isLoading: false }
  if (isLoading) return { label: null as string | null, isLoading: true }
  if (data) return { label: getCheckpointLabel(data), isLoading: false }
  return { label: '—', isLoading: false }
}

export function useCreateCheckpoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckpointPayload) => checkpointService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkpointKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.all })
      toast.success('Checkpoint créé')
    },
  })
}

export function useUpdateCheckpoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CheckpointPayload> }) =>
      checkpointService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: checkpointKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: checkpointKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: provinceKeys.all })
      toast.success('Checkpoint mis à jour')
    },
  })
}
