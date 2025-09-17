import type { ComponentProps, ReactNode } from 'react'
import { AppLayout } from './AppLayout'
import { SEO } from '../SEO'

type AppLayoutProps = ComponentProps<typeof AppLayout>

type MarketingLayoutProps = Omit<AppLayoutProps, 'children'> & {
  children: ReactNode
  seo: ComponentProps<typeof SEO>
}

export function MarketingLayout({ seo, children, ...layoutProps }: MarketingLayoutProps) {
  return (
    <AppLayout {...layoutProps}>
      <SEO {...seo} />
      {children}
    </AppLayout>
  )
}
