import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileService, type ProfileFilters, type ProfilePayload } from '@/services/profile.service'
import { toast } from 'sonner'

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: ProfileFilters) => [...profileKeys.lists(), filters] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
}

export function useProfiles(filters: ProfileFilters = {}) {
  return useQuery({
    queryKey: profileKeys.list(filters),
    queryFn: () => profileService.getAll(filters),
  })
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => profileService.getById(id),
    enabled: !!id,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProfilePayload) => profileService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.lists() })
      toast.success('Profil créé avec succès')
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProfilePayload> }) =>
      profileService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) })
      toast.success('Profil mis à jour')
    },
  })
}
