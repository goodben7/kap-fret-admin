import { Modal } from '@/components/ui/modal'
import { OfficeAdminAccessModalContent } from '@/components/forms/OfficeAdminAccessModalContent'
import { useCreateOfficeAdminAccess } from '@/hooks/useIssuingOffices'
import type { IssuingOffice } from '@/types/issuing-office'
import type { OfficeAdminAccessFormData } from '@/schemas/issuing-office.schema'

interface OfficeAdminCreateModalProps {
  office: IssuingOffice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OfficeAdminCreateModal({ office, open, onOpenChange }: OfficeAdminCreateModalProps) {
  const createAdmin = useCreateOfficeAdminAccess()

  const handleCreateAdmin = async (formData: OfficeAdminAccessFormData) => {
    if (!office) return
    await createAdmin.mutateAsync({
      officeId: office.id,
      payload: {
        ...formData,
        holderId: office.id,
        holderType: 'ISSUING_OFFICE',
      },
    })
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Créer l'administrateur du bureau"
      description="Compte admin rattaché à ce bureau d'émission"
      className="max-w-lg"
    >
      {office && (
        <OfficeAdminAccessModalContent
          office={office}
          onSubmit={handleCreateAdmin}
          onCancel={() => onOpenChange(false)}
          isLoading={createAdmin.isPending}
        />
      )}
    </Modal>
  )
}
