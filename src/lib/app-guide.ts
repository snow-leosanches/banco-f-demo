export interface AppPlace {
  id: string
  title: string
  aliases: string[]
  path: string
  howTo: string[]
  requiresLogin: boolean
}

/**
 * C1 situational directory for this sandbox (web mirror, not the production app).
 * Same for every login — tells the customer where to go, not what they have.
 */
export const APP_PLACES: AppPlace[] = [
  {
    id: 'beneficios',
    title: 'Mis beneficios',
    aliases: ['beneficios', 'mis beneficios', 'descuentos', 'promociones', 'ofertas', 'fpuntos', 'canje'],
    path: '/beneficios',
    requiresLogin: false,
    howTo: [
      'En el encabezado abre Beneficios y Fpuntos (también está en el menú principal).',
      'Filtra por Restaurantes, Viajes, Combustible o Retail.',
      'Entra a un comercio para ver el descuento y las condiciones.',
      'El catálogo de la página es el de marketing (completo). Para “qué beneficios tengo yo”, inicia sesión y pregúntale al Asistente.',
    ],
  },
  {
    id: 'cuenta',
    title: 'Mi cuenta / saldo',
    aliases: ['cuenta', 'saldo', 'movimientos', 'cuenta corriente', 'ahorros', 'dinero'],
    path: '/cuenta',
    requiresLogin: true,
    howTo: [
      'Inicia sesión en /login (Clientes conocidos, o ingreso manual).',
      'En el menú abre Cuentas.',
      'Ahí ves el saldo de demo, un llamado a ahorro por objetivos y movimientos recientes.',
    ],
  },
  {
    id: 'asistente',
    title: 'Asistente (chat)',
    aliases: ['asistente', 'chat', 'ayuda', 'help center', 'whatsapp', 'orb', 'hablar', 'preguntar'],
    path: '/',
    requiresLogin: false,
    howTo: [
      'En esta demo el canal de ayuda es el Asistente de la web, no WhatsApp.',
      'Abre el botón redondo de chat abajo a la derecha; se despliega la barra lateral.',
      'WhatsApp es el canal real de Banco Falabella; aquí se representa con el mismo Asistente in-app.',
    ],
  },
  {
    id: 'login',
    title: 'Iniciar sesión',
    aliases: ['login', 'iniciar sesion', 'ingresar', 'identificarme', 'clientes conocidos'],
    path: '/login',
    requiresLogin: false,
    howTo: [
      'Entra a /login o usa Iniciar sesión en el encabezado.',
      'Para la demo usa Clientes conocidos: Diego (pocos beneficios), Camila (algunos), Valentina (todos).',
    ],
  },
  {
    id: 'inicio',
    title: 'Inicio',
    aliases: ['inicio', 'home', 'portada', 'landing'],
    path: '/',
    requiresLogin: false,
    howTo: [
      'La portada tiene el carrusel de Fpuntos, accesos a beneficios y un simulador de crédito de consumo de demo.',
    ],
  },
  {
    id: 'detalle-beneficio',
    title: 'Detalle de un beneficio',
    aliases: ['detalle', 'condiciones', 'tyc', 'un comercio', 'turbus', 'tottus'],
    path: '/beneficios/{id}',
    requiresLogin: false,
    howTo: [
      'Desde /beneficios abre la tarjeta del comercio (por ejemplo TurBus).',
      'La URL queda /beneficios/turbus (o el id del comercio).',
    ],
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

export function lookupAppPlace(what: string): {
  found: boolean
  place?: Omit<AppPlace, 'aliases'>
  alsoSee: Array<{ title: string; path: string }>
  note?: string
} {
  const q = normalize(what)
  const alsoSee = APP_PLACES.map((p) => ({ title: p.title, path: p.path }))
  if (q.length < 2) {
    return { found: false, alsoSee, note: 'Indica qué quiere encontrar el cliente en la app.' }
  }

  const ranked = APP_PLACES.map((place) => {
    const aliases = place.aliases.map(normalize)
    const hit = aliases.some((alias) => q.includes(alias) || alias.includes(q) || q.split(' ').some((w) => w.length > 3 && alias.includes(w)))
    const exact = aliases.some((alias) => alias === q || q.includes(alias))
    return { place, hit, exact }
  })
    .filter((row) => row.hit)
    .sort((a, b) => Number(b.exact) - Number(a.exact))

  const best = ranked[0]?.place
  if (!best) {
    return {
      found: false,
      alsoSee,
      note: 'No hay una pantalla para eso en esta demo. No inventes menús de la app móvil real.',
    }
  }

  const { aliases: _aliases, ...place } = best
  return { found: true, place, alsoSee }
}
