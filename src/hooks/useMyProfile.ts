import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/user.service'
import type { UserCredentialsPayload, UserUpdatePayload } from '@/types/user'

export function useUpdateMyProfile() {
  const { user, refreshUser } = useAuth()

  return useMutation({
    mutationFn: (payload: UserUpdatePayload) => {
      if (!user?.id) throw new Error('Utilisateur non connecté')
      return userService.update(String(user.id), payload)
    },
    onSuccess: async () => {
      await refreshUser()
      toast.success('Profil mis à jour')
    },
  })
}

export function useChangeMyPassword() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: UserCredentialsPayload) => {
      if (!user?.id) throw new Error('Utilisateur non connecté')
      return userService.changeCredentials(String(user.id), payload)
    },
    onSuccess: () => {
      toast.success('Mot de passe modifié')
    },
  })
}
