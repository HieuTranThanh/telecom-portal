import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { MobileCategoryNav } from './MobileCategoryNav'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <MobileCategoryNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
