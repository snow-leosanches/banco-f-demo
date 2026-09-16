import { tool } from 'ai'
import { z } from 'zod'

import { lookupAppPlace } from '@/lib/app-guide'
import { lookupProductKnowledge } from '@/lib/product-knowledge'

export const explainProduct = tool({
  description:
    'C0 informativo: define un producto o concepto (fondo mutuo, CMR, Fpuntos, cuenta, depósito a plazo, crédito de consumo). No personaliza. Úsala para “qué es…”, no para “qué tengo”.',
  inputSchema: z.object({
    topic: z.string().describe('Concepto preguntado, p. ej. fondo mutuo, mutual fund, CMR, Fpuntos'),
  }),
  execute: async ({ topic }) => lookupProductKnowledge(topic),
})

export const findInApp = tool({
  description:
    'C1 situacional: dónde encontrar algo en ESTA demo web (beneficios, cuenta, asistente, login). Devuelve ruta y pasos. No listes los beneficios del cliente; eso es listMyBenefits.',
  inputSchema: z.object({
    what: z.string().describe('Qué busca, p. ej. mis beneficios, saldo, chat, iniciar sesión'),
  }),
  execute: async ({ what }) => lookupAppPlace(what),
})

export const inquiryTools = {
  explainProduct,
  findInApp,
}
