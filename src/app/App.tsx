import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useDynamicMeta } from '@/features/settings/useSettings'

function DynamicMeta() {
  useDynamicMeta()
  return null
}

export default function App() {
  return (
    <>
      <DynamicMeta />
      <RouterProvider router={router} />
    </>
  )
}
