import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { SnowplowInit } from '@/components/snowplow-init'
import { AssistantProvider } from '@/contexts/assistant-context'
import { Header } from '@/components/Header'
import DemoFooter from '@/components/DemoFooter'
import { AssistantSidebar } from '@/components/AssistantSidebar'
import { InterventionOrb } from '@/components/InterventionOrb'
import { ConsentManager } from '@/components/ConsentManager'
import { ChatFab } from '@/components/ChatFab'
import { siteConfig } from '@/lib/config'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteConfig.seo.title },
      { name: 'description', content: siteConfig.seo.description },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <SnowplowInit>
          <AssistantProvider>
            <div className="flex min-h-screen flex-col bg-background">
              <Header />
              <main className="flex-1">{children}</main>
              <DemoFooter />
            </div>
            <AssistantSidebar />
            <InterventionOrb />
            <ChatFab />
            <ConsentManager />
          </AssistantProvider>
        </SnowplowInit>

        <Scripts />
      </body>
    </html>
  )
}
