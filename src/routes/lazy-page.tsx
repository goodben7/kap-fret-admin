import { lazy, Suspense, type ComponentType } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function lazyPage(
  loader: () => Promise<Record<string, ComponentType>>,
  exportName: string,
) {
  const Lazy = lazy(async () => {
    const module = await loader()
    const Component = module[exportName]
    if (!Component) {
      throw new Error(`Export "${exportName}" introuvable dans le module lazy`)
    }
    return { default: Component }
  })

  return function LazyPageWrapper() {
    return (
      <Suspense
        fallback={(
          <div className="flex min-h-[40vh] items-center justify-center p-8">
            <LoadingSpinner label="Chargement..." />
          </div>
        )}
      >
        <Lazy />
      </Suspense>
    )
  }
}
