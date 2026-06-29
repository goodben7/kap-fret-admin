import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  userService,
  type UserFilters,
} from '@/services/user.service'
import type {
  UserCreatePayload,
  UserUpdatePayload,
  UserCredentialsPayload,
} from '@/types/user'
import { toast } from 'sonner'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => userService.getAll(filters),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => userService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Utilisateur créé')
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      userService.update(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      toast.success('Utilisateur mis à jour')
    },
  })
}

export function useChangeUserCredentials() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserCredentialsPayload }) =>
      userService.changeCredentials(id, payload),
    onSuccess: () => {
      toast.success('Mot de passe modifié')
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Utilisateur supprimé')
    },
  })
}

export function useToggleUserLock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.toggleLock(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Statut de verrouillage mis à jour')
    },
  })
}
