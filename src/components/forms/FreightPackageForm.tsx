import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { freightPackageSchema, type FreightPackageFormData } from '@/schemas/freight.schema'
import {
  NATURE_OF_GOODS,
  NATURE_OF_GOODS_LABELS,
  PACKAGING_TYPE,
  PACKAGING_TYPE_LABELS,
} from '@/constants/freight'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface FreightPackageFormProps {
  defaultValues?: Partial<FreightPackageFormData>
  onSubmit: (data: FreightPackageFormData) => void
  isLoading?: boolean
  onCancel?: () => void
}

export function FreightPackageForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: FreightPackageFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FreightPackageFormData>({
    resolver: zodResolver(freightPackageSchema),
    defaultValues: {
      packagingType: PACKAGING_TYPE.CARTON,
      natureOfGoods: NATURE_OF_GOODS.GENERAL_CARGO,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="N° colis" error={errors.packageNumber?.message} {...register('packageNumber')} />
      <Select
        label="Emballage"
        options={Object.entries(PACKAGING_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        error={errors.packagingType?.message}
        {...register('packagingType')}
      />
      <Select
        label="Nature"
        options={Object.entries(NATURE_OF_GOODS_LABELS).map(([value, label]) => ({ value, label }))}
        error={errors.natureOfGoods?.message}
        {...register('natureOfGoods')}
      />
      <Input
        label="Poids unitaire (kg)"
        type="number"
        step="0.01"
        error={errors.unitWeight?.message}
        {...register('unitWeight')}
      />
      <Input
        label="Poids total (kg)"
        type="number"
        step="0.01"
        error={errors.totalWeight?.message}
        {...register('totalWeight')}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
