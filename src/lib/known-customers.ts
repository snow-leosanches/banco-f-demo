import { faker } from '@faker-js/faker/locale/es'

import { currentCustomer, type CmrTier } from './config'
import { CAMILA_USER_ID, DIEGO_USER_ID, VALENTINA_USER_ID } from './user-id'

export type KnownCustomer = {
  id: string
  customerId: string
  name: string
  firstName: string
  email: string
  phone: string
  cmrTier: CmrTier | null
  comuna: string
  benefitsLabel: string
  savingsLabel: string
}

export const COMUNAS = [
  'San Miguel',
  'Maipú',
  'Las Condes',
  'Ñuñoa',
  'Providencia',
  'Santiago',
  'La Florida',
  'Puente Alto',
] as const

export const CMR_TIERS: CmrTier[] = ['CMR Verde', 'CMR Lover', 'CMR Elite']

export const knownCustomers: KnownCustomer[] = [
  {
    id: DIEGO_USER_ID,
    customerId: DIEGO_USER_ID,
    name: 'Diego Soto',
    firstName: 'Diego',
    email: 'diego.soto@bancof.demo',
    phone: '+56922222222',
    cmrTier: null,
    comuna: 'Maipú',
    benefitsLabel: 'pocos beneficios',
    savingsLabel: 'sueldo más bajo',
  },
  {
    // Fixed GUIDs (not random) so these identities stay stable across demo
    // sessions. Signals' real-time interventions API rejects any non-GUID
    // attribute key value (e.g. a plain email, slug, or `cust-84213`).
    id: CAMILA_USER_ID,
    customerId: CAMILA_USER_ID,
    name: 'Camila Rojas',
    firstName: currentCustomer.firstName,
    email: 'camila.rojas@bancof.demo',
    phone: '+56911111111',
    cmrTier: currentCustomer.cmrTier,
    comuna: currentCustomer.comuna,
    benefitsLabel: 'algunos beneficios',
    savingsLabel: 'más gasto este mes',
  },
  {
    id: VALENTINA_USER_ID,
    customerId: VALENTINA_USER_ID,
    name: 'Valentina Pérez',
    firstName: 'Valentina',
    email: 'valentina.perez@bancof.demo',
    phone: '+56933333333',
    cmrTier: 'CMR Elite',
    comuna: 'Las Condes',
    benefitsLabel: 'todos los beneficios',
    savingsLabel: 'cambió su opción de beneficios',
  },
]

/** Chilean mobile, 12 chars. */
export function demoPhone(): string {
  return `+569${faker.string.numeric(8)}`
}
