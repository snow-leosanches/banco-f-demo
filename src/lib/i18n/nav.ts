import type { Language } from '@/contexts/language-context'

/**
 * `siteConfig.navigation` labels are plain Spanish strings used as both the
 * display text and (for utility bar items) part of a `key` prop. Rather than
 * restructure that config into `{ es, en }` pairs everywhere it's consumed,
 * we keep it as the Spanish source of truth and translate at render time via
 * this flat lookup, keyed by the exact Spanish label.
 */
const NAV_LABELS_EN: Record<string, string> = {
  // Utility bar / main menu
  Inicio: 'Home',
  'Beneficios y Fpuntos': 'Benefits & Fpuntos',
  Cuentas: 'Accounts',
  Personas: 'Individuals',
  Empresa: 'Business',
  Falabella: 'Falabella',
  'Viajes Falabella': 'Falabella Travel',
  'Seguros Falabella': 'Falabella Insurance',
  Sodimac: 'Sodimac',
  Tottus: 'Tottus',
  'Educación Financiera': 'Financial Education',

  // Mega menu top-level labels
  'Tarjetas CMR': 'CMR Cards',
  Créditos: 'Loans',
  'Avance y Súper Avance': 'Cash Advance & Super Advance',
  Inversiones: 'Investments',
  Seguros: 'Insurance',
  'Ayuda y Contacto': 'Help & Contact',

  // Column titles
  'Acciones rápidas': 'Quick actions',
  'Todas nuestras Tarjetas': 'All our Cards',
  Información: 'Information',
  Avance: 'Cash Advance',
  'Súper Avance': 'Super Advance',
  Beneficios: 'Benefits',
  Fpuntos: 'Fpuntos',
  'Ahorro e inversión': 'Savings & investment',
  'Moneda extranjera': 'Foreign currency',
  Auto: 'Auto',
  Ayuda: 'Help',

  // Mega menu links
  'Solicita tu Tarjeta CMR': 'Apply for your CMR Card',
  'CMR Mastercard': 'CMR Mastercard',
  'CMR Mastercard Premium': 'CMR Mastercard Premium',
  'CMR Mastercard Elite': 'CMR Mastercard Elite',
  'CMR Adicional': 'CMR Additional Card',
  'Cómo pagar tu Tarjeta CMR': 'How to pay your CMR Card',
  'Comparar Tarjetas': 'Compare Cards',
  'Tasas y Comisiones': 'Rates & Fees',
  'Abre tu cuenta Banco F': 'Open your Banco F account',
  'Tarjetas a domicilio': 'Cards delivered to your door',
  'Pago Automático (PAC)': 'Automatic Payment (PAC)',
  'Cuenta Corriente': 'Checking Account',
  'Tarjeta de Débito': 'Debit Card',
  'Línea de crédito': 'Credit line',
  'Cuenta Vista': 'Vista Account',
  'Recibir sueldo': 'Receive your paycheck',
  'Crédito de Consumo': 'Consumer Loan',
  'Crédito Hipotecario': 'Mortgage Loan',
  'Crédito Automotriz': 'Auto Loan',
  'Crédito de Refinanciamiento': 'Refinancing Loan',
  'Pagar mi Crédito': 'Pay my Loan',
  'Crédito en Mora': 'Past-due Loan',
  'Pago Anticipado': 'Early Payment',
  '¿Qué es un Avance?': 'What is a Cash Advance?',
  '¿Qué es un Súper Avance?': 'What is a Super Advance?',
  'Todos los Descuentos': 'All Discounts',
  Cuponeras: 'Coupon books',
  'Programa de Puntos': 'Points Program',
  'Cuenta de Ahorro': 'Savings Account',
  'Depósito a Plazo': 'Term Deposit',
  'Fondos Mutuos': 'Mutual Funds',
  'Compra y Venta de Dólares': 'Buy & Sell US Dollars',
  'Todos nuestros Seguros': 'All our Insurance',
  SOAP: 'Mandatory Auto Insurance (SOAP)',
  'Seguro Automotriz': 'Auto Insurance',
  Viajes: 'Travel',
  'Seguros de Viajes': 'Travel Insurance',
  'Centro de Ayuda': 'Help Center',
  'Oficinas y Cajeros': 'Branches & ATMs',
  'Preguntas Frecuentes': 'FAQ',
  Tutoriales: 'Tutorials',

  // Footer columns
  'nuestro banco': 'our bank',
  'servicio al cliente': 'customer service',
  'link de interes': 'quick links',
  'Quiénes somos': 'About us',
  Directorio: 'Board of Directors',
  Administración: 'Management',
  'Información institucional': 'Corporate information',
  Reconocimientos: 'Awards',
  'Tasas y Tarifas': 'Rates & Fees',
  'Canal de integridad': 'Integrity channel',
  'Trabaja con nosotros': 'Work with us',
  Sostenibilidad: 'Sustainability',
  Portabilidad: 'Portability',
  'Documentos legales': 'Legal documents',
  'Portal Empresas': 'Business Portal',
  'Blog Gennials': 'Gennials Blog',
  'Qué hacer en caso de fraude': 'What to do in case of fraud',
  'Tarjeta de Crédito': 'Credit Card',
  'Bloquear mi tarjeta': 'Block my card',
}

export function translateLabel(label: string, language: Language): string {
  if (language === 'es') return label
  return NAV_LABELS_EN[label] ?? label
}
