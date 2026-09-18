import { scrapedBenefits } from './benefits-catalog'
import { CAMILA_USER_ID, DIEGO_USER_ID, VALENTINA_USER_ID } from './user-id'

export interface MenuItem {
  label: string
  href: string
}

export interface FooterLink {
  label: string
  href: string
}

export interface MegaLink {
  label: string
  href: string
}

export interface MegaColumn {
  title: string
  links: MegaLink[]
}

export interface MegaItem {
  label: string
  href?: string
  columns: MegaColumn[]
}

export interface SiteConfig {
  brand: {
    name: string
    appId: string
    tagline: string
    logo: string
    favicon: string
  }
  navigation: {
    mainMenu: MenuItem[]
    footerLinks: FooterLink[]
    utilityLeft: MenuItem[]
    utilityRight: MenuItem[]
    megaMenu: MegaItem[]
    footerColumns: { title: string; links: FooterLink[] }[]
  }
  features: {
    utmParameters: boolean
    signals: boolean
    video: boolean
    consent: boolean
  }
  marketing: {
    utmParameters: {
      sources: string[]
      campaigns: string[]
    }
  }
  business: {
    contact: { phone: string; whatsapp: string }
    social: { linkedin?: string; instagram?: string; x?: string; youtube?: string; tiktok?: string; facebook?: string }
  }
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

export const siteConfig: SiteConfig = {
  brand: {
    name: 'Banco F',
    appId: 'demo-banco-falabella-web',
    tagline: 'Atrévete a ser Gennial',
    logo: '/images/logo-palta.svg',
    favicon: '/favicon.ico',
  },
  navigation: {
    mainMenu: [
      { label: 'Inicio', href: '/' },
      { label: 'Beneficios y Fpuntos', href: '/beneficios' },
      { label: 'Cuentas', href: '/cuenta' },
    ],
    utilityLeft: [
      { label: 'Personas', href: '/' },
      { label: 'Empresa', href: '/' },
    ],
    utilityRight: [
      { label: 'Falabella', href: 'https://www.falabella.com/falabella-cl' },
      { label: 'Viajes Falabella', href: 'https://www.viajesfalabella.cl/' },
      { label: 'Seguros Falabella', href: 'https://www.segurosfalabella.com/cl/' },
      { label: 'Sodimac', href: 'https://www.sodimac.cl/' },
      { label: 'Tottus', href: 'https://www.tottus.cl/' },
      { label: 'Educación Financiera', href: '/' },
    ],
    megaMenu: [
      {
        label: 'Tarjetas CMR',
        columns: [
          {
            title: 'Acciones rápidas',
            links: [{ label: 'Solicita tu Tarjeta CMR', href: '/beneficios' }],
          },
          {
            title: 'Todas nuestras Tarjetas',
            links: [
              { label: 'CMR Mastercard', href: '/beneficios' },
              { label: 'CMR Mastercard Premium', href: '/beneficios' },
              { label: 'CMR Mastercard Elite', href: '/beneficios' },
              { label: 'CMR Adicional', href: '/beneficios' },
            ],
          },
          {
            title: 'Información',
            links: [
              { label: 'Cómo pagar tu Tarjeta CMR', href: '/cuenta' },
              { label: 'Comparar Tarjetas', href: '/beneficios' },
              { label: 'Tasas y Comisiones', href: '/' },
            ],
          },
        ],
      },
      {
        label: 'Cuentas',
        href: '/cuenta',
        columns: [
          {
            title: 'Acciones rápidas',
            links: [
              { label: 'Abre tu cuenta Banco F', href: '/cuenta' },
              { label: 'Tarjetas a domicilio', href: '/cuenta' },
              { label: 'Pago Automático (PAC)', href: '/cuenta' },
            ],
          },
          {
            title: 'Cuentas',
            links: [
              { label: 'Cuenta Corriente', href: '/cuenta' },
              { label: 'Tarjeta de Débito', href: '/cuenta' },
            ],
          },
          {
            title: 'Información',
            links: [
              { label: 'Línea de crédito', href: '/cuenta' },
              { label: 'Cuenta Vista', href: '/cuenta' },
              { label: 'Recibir sueldo', href: '/cuenta' },
            ],
          },
        ],
      },
      {
        label: 'Créditos',
        columns: [
          {
            title: 'Créditos',
            links: [
              { label: 'Crédito de Consumo', href: '/' },
              { label: 'Crédito Hipotecario', href: '/' },
              { label: 'Crédito Automotriz', href: '/' },
              { label: 'Crédito de Refinanciamiento', href: '/' },
            ],
          },
          {
            title: 'Acciones rápidas',
            links: [
              { label: 'Pagar mi Crédito', href: '/cuenta' },
              { label: 'Crédito en Mora', href: '/cuenta' },
              { label: 'Pago Anticipado', href: '/cuenta' },
            ],
          },
        ],
      },
      {
        label: 'Avance y Súper Avance',
        columns: [
          {
            title: 'Avance',
            links: [{ label: '¿Qué es un Avance?', href: '/' }],
          },
          {
            title: 'Súper Avance',
            links: [{ label: '¿Qué es un Súper Avance?', href: '/' }],
          },
        ],
      },
      {
        label: 'Beneficios y Fpuntos',
        href: '/beneficios',
        columns: [
          {
            title: 'Beneficios',
            links: [
              { label: 'Todos los Descuentos', href: '/beneficios' },
              { label: 'Cuponeras', href: '/beneficios' },
            ],
          },
          {
            title: 'Fpuntos',
            links: [{ label: 'Programa de Puntos', href: '/beneficios' }],
          },
        ],
      },
      {
        label: 'Inversiones',
        columns: [
          {
            title: 'Ahorro e inversión',
            links: [
              { label: 'Cuenta de Ahorro', href: '/cuenta' },
              { label: 'Depósito a Plazo', href: '/cuenta' },
              { label: 'Fondos Mutuos', href: '/cuenta' },
            ],
          },
          {
            title: 'Moneda extranjera',
            links: [{ label: 'Compra y Venta de Dólares', href: '/cuenta' }],
          },
        ],
      },
      {
        label: 'Seguros',
        columns: [
          {
            title: 'Seguros',
            links: [{ label: 'Todos nuestros Seguros', href: '/' }],
          },
          {
            title: 'Auto',
            links: [
              { label: 'SOAP', href: '/' },
              { label: 'Seguro Automotriz', href: '/' },
            ],
          },
          {
            title: 'Viajes',
            links: [{ label: 'Seguros de Viajes', href: '/' }],
          },
        ],
      },
      {
        label: 'Ayuda y Contacto',
        columns: [
          {
            title: 'Ayuda',
            links: [
              { label: 'Centro de Ayuda', href: '/' },
              { label: 'Oficinas y Cajeros', href: '/' },
              { label: 'Preguntas Frecuentes', href: '/' },
              { label: 'Tutoriales', href: '/' },
            ],
          },
        ],
      },
    ],
    footerColumns: [
      {
        title: 'nuestro banco',
        links: [
          { label: 'Quiénes somos', href: '/' },
          { label: 'Directorio', href: '/' },
          { label: 'Administración', href: '/' },
          { label: 'Información institucional', href: '/' },
          { label: 'Reconocimientos', href: '/' },
          { label: 'Tasas y Tarifas', href: '/' },
          { label: 'Canal de integridad', href: '/' },
          { label: 'Trabaja con nosotros', href: '/' },
          { label: 'Sostenibilidad', href: '/' },
        ],
      },
      {
        title: 'servicio al cliente',
        links: [
          { label: 'Preguntas Frecuentes', href: '/' },
          { label: 'Portabilidad', href: '/' },
          { label: 'Documentos legales', href: '/' },
          { label: 'Ayuda y Contacto', href: '/' },
          { label: 'Tutoriales', href: '/' },
          { label: 'Oficinas y Cajeros', href: '/' },
          { label: 'Portal Empresas', href: '/' },
          { label: 'Blog Gennials', href: '/' },
          { label: 'Qué hacer en caso de fraude', href: '/' },
        ],
      },
      {
        title: 'link de interes',
        links: [
          { label: 'Cuenta Corriente', href: '/cuenta' },
          { label: 'Tarjeta de Crédito', href: '/beneficios' },
          { label: 'Beneficios', href: '/beneficios' },
          { label: 'Cuponeras', href: '/beneficios' },
          { label: 'Bloquear mi tarjeta', href: '/cuenta' },
        ],
      },
    ],
    footerLinks: [
      { label: 'Ayuda y Contacto', href: '/' },
      { label: 'Documentos legales', href: '/' },
      { label: 'Privacy Policy', href: 'https://snowplow.io/privacy-policy/' },
      { label: 'Snowplow.io', href: 'https://snowplow.io' },
    ],
  },
  features: {
    utmParameters: true,
    signals: true,
    video: true,
    consent: true,
  },
  marketing: {
    utmParameters: {
      sources: ['google', 'facebook', 'linkedin', 'twitter', 'email', 'whatsapp'],
      campaigns: ['cmr-puntos-septiembre', 'fiestas-patrias-beneficios', 'viajes-verano', 'nuevos-clientes-cmr'],
    },
  },
  business: {
    contact: { phone: '+56 2 2390 6000', whatsapp: '+56 2 2390 6000' },
    social: {
      linkedin: 'https://www.linkedin.com/company/banco-falabella',
      instagram: 'https://www.instagram.com/bancofalabella/',
      x: 'https://x.com/BancoFalabella',
      youtube: 'https://www.youtube.com/bancofalabella',
      tiktok: 'https://www.tiktok.com/@bancofalabella',
      facebook: 'https://www.facebook.com/BancoFalabella',
    },
  },
  seo: {
    title: 'Banco F | Banco Digital',
    description: 'El Crédito de Consumo que necesitas a un par de clics. Abre tu CMR y tu Cuenta Corriente, y aprovecha beneficios todos los días.',
    keywords: ['banco falabella', 'cmr', 'beneficios', 'cuenta corriente', 'fpuntos', 'banca digital', 'chile'],
  },
}

// ─── Demo customer identities (login assigns one; Camila is the known-customer default) ─

export type CmrTier = 'CMR Verde' | 'CMR Lover' | 'CMR Elite'

export interface Customer {
  customerId: string
  firstName: string
  cmrTier: CmrTier | null
  comuna: string
}

export function customerHasCmrCard(customer: Customer | null | undefined): boolean {
  return customer?.cmrTier != null
}

export const currentCustomer: Customer = {
  customerId: CAMILA_USER_ID,
  firstName: 'Camila',
  cmrTier: 'CMR Lover',
  comuna: 'San Miguel',
}

// ─── Benefit catalog ──────────────────────────────────────────────────────────

export type BenefitCategory = 'Restaurantes' | 'Viajes' | 'Combustible' | 'Retail'

export interface Benefit {
  id: string
  merchant: string
  category: BenefitCategory
  discountPct: number
  offerLabel?: string
  description: string
  terms: string
  image?: string
}

export const benefits: Benefit[] = scrapedBenefits as Benefit[]

export function formatBenefitOffer(benefit: Benefit): string {
  if (benefit.offerLabel) return benefit.offerLabel
  if (benefit.discountPct > 0) return `${benefit.discountPct}% dcto`
  return 'Beneficio'
}

export function getBenefitsByCategory(category: BenefitCategory): Benefit[] {
  return benefits.filter((b) => b.category === category)
}

export function getBenefitById(id: string): Benefit | undefined {
  return benefits.find((b) => b.id === id)
}

export const banditTop3ByCustomer: Record<string, string[]> = {
  [DIEGO_USER_ID]: ['burger-king', 'copec', 'tottus'],
  [CAMILA_USER_ID]: ['turbus', 'lipigas', 'dunkin'],
  [VALENTINA_USER_ID]: ['sky-airline', 'falabella-retail', 'hoteles-decameron'],
}

export const recurringMerchantsByCustomer: Record<string, string[]> = {
  [DIEGO_USER_ID]: ['copec'],
  [CAMILA_USER_ID]: ['shell', 'tottus'],
  [VALENTINA_USER_ID]: ['falabella-retail', 'sodimac'],
}
