import PortalLayout from '@/components/portal/PortalLayout'

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>
}
