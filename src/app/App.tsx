import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { router } from '@/routes'

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryProvider>
  )
}
