import type { Language } from '@/contexts/language-context'
import type { Benefit, BenefitCategory } from '@/lib/config'

const CATEGORY_LABELS_EN: Record<BenefitCategory, string> = {
  Restaurantes: 'Restaurants',
  Viajes: 'Travel',
  Combustible: 'Fuel',
  Retail: 'Retail',
}

export function translateCategory(category: BenefitCategory, language: Language): string {
  return language === 'en' ? CATEGORY_LABELS_EN[category] : category
}

// The scraped catalog's `description`/`terms`/`offerLabel` fields are built
// from a small, repeating vocabulary (day names + a handful of discount-jargon
// phrases + one fixed legal sentence). A handful of fields don't fit that
// template at all — those get an exact override below. Everything else runs
// through the ordered phrase-substitution table, longest/most-specific
// pattern first. This is a best-effort mechanical translation of ~200 scraped
// marketing fragments, not a human-reviewed one: a long tail of one-off
// (sometimes already truncated at the scrape) fragments will keep a few
// untranslated Spanish words.
const EXACT_OVERRIDES: Record<string, string> = {
  'Un beneficio por cuenta CMR al día. No acumulable con otras promociones.':
    'One benefit per CMR account per day. Not combinable with other promotions.',
  'Pagando con tarjetas CMR o Débito Banco Falabella. No acumulable con otras promociones.':
    'Pay with a CMR or Banco Falabella Debit card. Not combinable with other promotions.',
  'No aplica a mercancía. Pagando con tarjetas CMR o Débito Banco Falabella.':
    'Does not apply to merchandise. Pay with a CMR or Banco Falabella Debit card.',
  'Reserva anticipada de al menos 7 días.': 'Advance booking of at least 7 days.',
  'Aplica a tarifas Basic y Light. Sujeto a disponibilidad.':
    'Applies to Basic and Light fares. Subject to availability.',
  'No acumulable con Cyber ofertas.': 'Not combinable with Cyber deals.',
  'Excluye productos en liquidación.': 'Excludes clearance items.',
  'Aplica a compras sobre $20.000.': 'Applies to purchases over $20,000.',
  'Descuento exclusivo CMR en tienda online.': 'Exclusive CMR discount in the online store.',
  'Descuento en supermercado pagando en cuotas CMR.': 'Supermarket discount paying in CMR installments.',
  'Descuento en herramientas y jardín.': 'Discount on tools and garden supplies.',
  '2x1 en hamburguesas clásicas los martes.': '2x1 on classic burgers on Tuesdays.',
  'Ahorra en vuelos nacionales pagando en cuotas CMR.': 'Save on domestic flights paying in CMR installments.',
}

const PHRASE_RULES: [RegExp, string][] = [
  // Multi-word phrases first, most specific to least.
  [/\bTodos los días\b/g, 'Every day'],
  [/\bCUOTAS SIN INTERÉS\b/g, 'INTEREST-FREE INSTALLMENTS'],
  [/\bSIN INTERÉS\b/g, 'INTEREST-FREE'],
  [/\bCUOTAS\b/g, 'INSTALLMENTS'],
  [/\bVálido para comercios seleccionados\b/g, 'Valid at select merchants'],
  [/\bcomercios seleccionados\b/g, 'select merchants'],
  [/\bservicios seleccionados\b/g, 'select services'],
  [/\bregiones seleccionadas\b/g, 'select regions'],
  [/\bplanes seleccionados\b/gi, 'select plans'],
  [/\bEn el pago de\b/g, 'On'],
  [/\bautomotriz\b/gi, 'auto'],
  [/\bcontribuciones\b/gi, 'property taxes'],
  [/\bSIN TOPE\b/g, 'UNCAPPED'],
  [/\bDESCUENTO\b/g, 'DISCOUNT'],
  [/\bDCTO\b/g, 'OFF'],
  [/\bDcto\b/g, 'Discount'],
  [/\bdcto\b/g, 'discount'],
  [/\bDescuento\b/g, 'Discount'],
  [/\bdescuento\b/g, 'discount'],
  [/\bBeneficios\b/g, 'Benefits'],
  [/\bBeneficio\b/g, 'Benefit'],
  [/\bbeneficio\b/g, 'benefit'],
  [/\bHASTA EL TRIPLE\b/g, 'TRIPLE'],
  [/\bAL AÑO\b/g, 'PER YEAR'],
  [/\bPLAN ELITE\b/g, 'ELITE PLAN'],
  [/\bILIMITADOS\b/g, 'UNLIMITED'],
  [/\bGRATIS\b/g, 'FREE'],
  [/\bGratis\b/g, 'Free'],
  [/\bHASTA\b/g, 'UP TO'],
  [/\bHasta\b/g, 'Up to'],
  [/\bhasta\b/g, 'up to'],
  [/\bDesde\b/g, 'From'],
  [/\b2 [Ii]ngresos\b/g, '2 entries'],
  [/\bIngresos\b/g, 'Entries'],
  [/\bingresos\b/g, 'entries'],
  [/\bExclusivos\b/g, 'Exclusive'],
  [/\bExclusivo\b/g, 'Exclusive'],
  [/\bexclusivo\b/g, 'exclusive'],
  [/\bPresencial\b/g, 'In-store'],
  [/\bpresencial\b/g, 'in-store'],
  [/\bNuevo\b/g, 'New'],
  [/\bSuscripción\b/g, 'Subscription'],
  [/\banual y mensual\b/g, 'annual and monthly'],
  [/\bPrimeros\b/g, 'First'],
  [/\bmeses de\b/g, 'months of'],
  [/\bdel mes\b/g, 'of the month'],
  [/\btu Tarjeta CMR\b/g, 'your CMR Card'],
  [/\bTarjeta CMR\b/g, 'CMR Card'],
  [/\bcon tus tarjetas\b/g, 'with your cards'],
  [/\bPagando con\b/g, 'Paying with'],
  [/\bSujeto a disponibilidad\b/g, 'Subject to availability'],
  [/\bAplica a\b/g, 'Applies to'],
  [/\btarifas\b/g, 'fares'],
  [/\bReserva anticipada\b/g, 'Advance booking'],
  [/\bal menos\b/g, 'at least'],
  [/\bal día\b/g, 'per day'],
  [/\bsegún local\b/g, 'per location'],
  [/\bdías\b/g, 'days'],
  [/\bdía\b/g, 'day'],
  [/\bRevisa\b/g, 'Check'],
  [/\bCanjea\b/g, 'Redeem'],
  [/\bcanjea\b/g, 'redeem'],
  [/\bCanje\b/g, 'Redemption'],
  [/\btotem\b/gi, 'kiosk'],
  [/\bpor la app\b/g, 'via the app'],
  [/\bAcumula más\b/g, 'Get more'],
  [/\bmás\b/g, 'more'],
  // Day and month names.
  [/\bLunes\b/g, 'Monday'],
  [/\bMartes\b/g, 'Tuesday'],
  [/\bMiércoles\b/g, 'Wednesday'],
  [/\bJueves\b/g, 'Thursday'],
  [/\bViernes\b/g, 'Friday'],
  [/\bSábado\b/g, 'Saturday'],
  [/\bDomingo\b/g, 'Sunday'],
  [/\bHoy\b/g, 'Today'],
  [/\bMañana\b/g, 'Tomorrow'],
  [/\benero\b/gi, 'January'],
  [/\bfebrero\b/gi, 'February'],
  [/\bmarzo\b/gi, 'March'],
  [/\babril\b/gi, 'April'],
  [/\bmayo\b/gi, 'May'],
  [/\bjunio\b/gi, 'June'],
  [/\bjulio\b/gi, 'July'],
  [/\bagosto\b/gi, 'August'],
  [/\bseptiembre\b/gi, 'September'],
  [/\boctubre\b/gi, 'October'],
  [/\bnoviembre\b/gi, 'November'],
  [/\bdiciembre\b/gi, 'December'],
  // Day-range connector, only once day names are already in English.
  [
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) a (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,
    '$1 to $2',
  ],
  // Generic single-word prepositions/conjunctions last, as a catch-all.
  [/\ben\b/g, 'in'],
  [/\bcon\b/g, 'with'],
  [/\by\b/g, 'and'],
  [/\bde\b/g, 'of'],
]

function translatePhrase(text: string): string {
  const exact = EXACT_OVERRIDES[text]
  if (exact) return exact
  let out = text
  for (const [pattern, replacement] of PHRASE_RULES) {
    out = out.replace(pattern, replacement)
  }
  return out
}

export function translateBenefit(benefit: Benefit, language: Language): Benefit {
  if (language === 'es') return benefit
  return {
    ...benefit,
    description: translatePhrase(benefit.description),
    terms: translatePhrase(benefit.terms),
    offerLabel: benefit.offerLabel ? translatePhrase(benefit.offerLabel) : benefit.offerLabel,
  }
}
