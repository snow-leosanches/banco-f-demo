export interface KnowledgeArticle {
  id: string
  title: string
  aliases: string[]
  summary: string
  details: string[]
}

/**
 * C0 informational catalog. Same for every login — no customer assembly.
 * Covers the deck example ("what is a mutual fund") plus Banco F products
 * the Asistente is likely to be asked about in this sandbox.
 */
export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'fondo-mutuo',
    title: 'Fondo mutuo',
    aliases: ['fondo mutuo', 'fondos mutuos', 'mutual fund', 'mutual funds', 'fondo de inversion', 'inversiones'],
    summary:
      'Un fondo mutuo reúne plata de muchas personas y la invierte un gestor profesional en una canasta de instrumentos (acciones, bonos u otros), según el riesgo del fondo.',
    details: [
      'Tú compras cuotas del fondo; el valor de cada cuota sube o baja con el mercado.',
      'No es un depósito a plazo: no hay tasa fija ni capital garantizado por el banco.',
      'En esta demo Banco F aún no opera un módulo de inversiones; la explicación es educativa (clase C0), no una oferta.',
    ],
  },
  {
    id: 'cmr',
    title: 'Tarjeta CMR',
    aliases: ['cmr', 'tarjeta cmr', 'tarjeta', 'mastercard'],
    summary:
      'CMR es la tarjeta de Banco F / Falabella. Con ella pagas en el ecosistema (Falabella, Tottus, Sodimac, comercios adheridos) y accedes al programa de beneficios.',
    details: [
      'En esta demo hay tres tramos: CMR Verde, CMR Lover y CMR Elite.',
      'El tramo cambia qué descuentos están vigentes para el cliente (el Asistente lo consulta con listMyBenefits).',
    ],
  },
  {
    id: 'fpuntos',
    title: 'Fpuntos',
    aliases: ['fpuntos', 'f puntos', 'cmr puntos', 'puntos', 'canje'],
    summary:
      'Fpuntos (antes CMR Puntos) son puntos que se acumulan al comprar con CMR y se canjean en Falabella.com, Tottus, Sodimac y viajes.',
    details: [
      'En el home de la demo verás campañas de canje (Fiestas Patrias, destinos).',
      'Un cliente puede elegir descuento en efectivo o acumular Fpuntos; eso cambia el ahorro en la cuenta (caso Valentina).',
    ],
  },
  {
    id: 'cuenta-corriente',
    title: 'Cuenta corriente Banco F',
    aliases: ['cuenta corriente', 'cuenta', 'saldo', 'cuenta bancaria'],
    summary:
      'La Cuenta Corriente Banco F de esta demo no cobra mantención. Muestra saldo, movimientos y un llamado a ahorro por objetivos.',
    details: [
      'Para verla hay que iniciar sesión y entrar a Cuentas.',
      'Los sueldos y gastos que cita el Asistente en preguntas de ahorro salen de herramientas mock, no del listado de movimientos de la página.',
    ],
  },
  {
    id: 'beneficios',
    title: 'Programa de beneficios',
    aliases: ['beneficio', 'beneficios', 'descuentos', 'promociones', 'ofertas cmr'],
    summary:
      'El programa de beneficios CMR agrupa descuentos en restaurantes, viajes, combustible y retail. El catálogo de marketing es el mismo para todos; lo que “tienes este mes” depende del login.',
    details: [
      'En la web: Beneficios y Fpuntos, con filtros por categoría.',
      'Para la lista personalizada, inicia sesión y pregúntale al Asistente “qué beneficios tengo”.',
    ],
  },
  {
    id: 'deposito-plazo',
    title: 'Depósito a plazo',
    aliases: ['deposito a plazo', 'dap', 'plazo fijo'],
    summary:
      'Un depósito a plazo es un ahorro por un tiempo fijo, con una tasa acordada. A diferencia de un fondo mutuo, el banco te dice de antemano cuánto ganas si lo mantienes hasta el vencimiento.',
    details: [
      'Sirve para comparar cuando alguien pregunta si un fondo mutuo es “lo mismo que un depósito”.',
      'Esta demo no simula la contratación de un DAP.',
    ],
  },
  {
    id: 'credito-consumo',
    title: 'Crédito de consumo',
    aliases: ['credito de consumo', 'credito', 'simulacion', 'simular credito'],
    summary:
      'Un crédito de consumo es un préstamo de libre disposición que se paga en cuotas. En el home hay un simulador de demo (RUT + Asistente).',
    details: ['No origina un crédito real. Es solo para mostrar el flujo conversacional.'],
  },
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function lookupProductKnowledge(topic: string): {
  found: boolean
  article?: Omit<KnowledgeArticle, 'aliases'>
  related: string[]
  note?: string
} {
  const q = normalize(topic)
  if (q.length < 2) {
    return { found: false, related: KNOWLEDGE_ARTICLES.map((a) => a.title), note: 'Indica un producto o concepto.' }
  }

  const ranked = KNOWLEDGE_ARTICLES.map((article) => {
    const aliases = article.aliases.map(normalize)
    const hit = aliases.some((alias) => q.includes(alias) || alias.includes(q) || q.split(' ').some((w) => w.length > 3 && alias.includes(w)))
    const exact = aliases.some((alias) => alias === q || q.includes(alias))
    return { article, hit, exact }
  })
    .filter((row) => row.hit)
    .sort((a, b) => Number(b.exact) - Number(a.exact))

  const related = KNOWLEDGE_ARTICLES.map((a) => a.title)
  const best = ranked[0]?.article
  if (!best) {
    return {
      found: false,
      related,
      note: 'No hay un artículo para ese tema en el catálogo C0 de la demo. No inventes una definición.',
    }
  }

  const { aliases: _aliases, ...article } = best
  return { found: true, article, related }
}
