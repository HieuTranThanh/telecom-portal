import { usePortalSettings } from '@/features/settings/useSettings'

export function Footer() {
  const { data: settings } = usePortalSettings()
  const supportEmail = settings?.support_email
  const supportPhone = settings?.support_phone

  return (
    <footer className="border-t bg-background mt-12">
      <div className="px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Đầu mối hỗ trợ:{' '}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="text-foreground hover:underline">{supportEmail}</a>
            ) : (
              <span className="text-foreground">Phòng Kỹ thuật</span>
            )}
            {supportPhone && (
              <> · <a href={`tel:${supportPhone}`} className="text-foreground hover:underline">{supportPhone}</a></>
            )}
          </p>
          <p className="text-xs opacity-60">© {new Date().getFullYear()} MobiFone</p>
        </div>
      </div>
    </footer>
  )
}
