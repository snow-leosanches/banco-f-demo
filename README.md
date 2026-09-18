# Banco F — Signals-powered benefits demo

TanStack Start mock of Banco Falabella's benefits experience: Snowplow tracking, a Signals-backed Asistente, and hardcoded per-login tools so the same question gets a different answer for each demo customer.

```bash
npm install
npm run dev
```

The app serves at [http://localhost:3000](http://localhost:3000). Build with `npm run build`.

## Environment

Copy `.env` locally (it is gitignored). The chat needs a Vercel AI Gateway key:

```bash
AI_GATEWAY_API_KEY=
```

Create one at [AI Gateway API keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys). The Asistente uses `anthropic/claude-haiku-4.5` through the [gateway](https://vercel.com/docs/ai-gateway). On Vercel, OIDC is enough and this key is optional.

Signals lookups also need `SIGNALS_API_ENDPOINT`, `SIGNALS_API_KEY`, `SIGNALS_API_KEY_ID`, and `SNOWPLOW_CONSOLE_ORG_ID`. Without them the app still runs: the assistant falls back to a local behavior snapshot, and the catalog pages still track.

## Demo logins

Use **Clientes conocidos** on `/login`. The marketing catalog on `/beneficios` stays complete for everyone so browsing still generates Signals events. The agent only sees the slice returned by tools.

| Login | CMR | Entitled benefits | “¿Por qué ahorro menos este mes?” |
| --- | --- | --- | --- |
| **Diego Soto** | Sin CMR | Copec, Burger King, Tottus (no Viajes). Travel nudge offers CMR signup. | Salary drop: $920.000 in jul/ago → **$680.000** in sep. Spend is flat. |
| **Camila Rojas** | Lover | TurBus, Lipigas, Dunkin, Shell, Tottus. Travel nudge cites the CMR TurBus discount. | Same $780.000 salary. Spend jumps **$628.000 → $1.048.000** (playa + asado). |
| **Valentina Pérez** | Elite | Full catalog (12 benefits). Travel nudge cites the CMR TurBus discount. | She switched CMR from cash discount to Fpuntos on 4 sep. Spend is flat; cash savings drop. |

Guest, manual, and random logins reuse Diego's entitlements and savings snapshot.

Camila is the money-shot identity from the Banco Falabella deck (San Miguel, Bandit top-3 TurBus / Lipigas / Dunkin, recurring Shell / Tottus).

## Agent tools

Chat is `POST /api/chat` (`src/routes/api/chat.ts`). Tools live under `src/lib/tools/`. Customer id (and Signals ids) are passed as tool context only on C2/C3 tools. C0 and C1 are the same for every login (no assembly).

| Class | Example | Tools |
| --- | --- | --- |
| **C0** informational | ¿Qué es un fondo mutuo? | `explainProduct` — glossary in `src/lib/product-knowledge.ts` (fondo mutuo, CMR, Fpuntos, cuenta, DAP, crédito de consumo, programa de beneficios) |
| **C1** situational | ¿Dónde encuentro mis beneficios? | `findInApp` — screens in `src/lib/app-guide.ts` (`/beneficios`, `/cuenta`, chat FAB, `/login`) |
| **C2** personalized | ¿Qué beneficios tengo este mes? | `listMyBenefits`, `getBenefitDetails` — entitlements in `src/lib/customer-benefits.ts`. `getSignalsAttributes` — this-visit + last-hour / 7-day Signals groups |
| **C3** deep | ¿Por qué ahorro menos este mes? | `getMonthlyBalances`, `getSpendingBreakdown`, `getBenefitOptionHistory` — mocks in `src/lib/customer-savings.ts` (jul–sep 2026) |

The system prompt (`src/lib/agent-prompt.ts`) maps those four classes to tools and forbids inventing amounts, merchants, definitions, or menus.

Suggested questions (Spanish):

- ¿Qué es un fondo mutuo?
- ¿Dónde encuentro mis beneficios?
- ¿Qué beneficios tengo este mes? *(same wording under each login)*
- ¿Por qué ahorro menos este mes? *(same wording under each login)*

For the Signals treatment beat, log in as Camila, browse Viajes (TurBus, Lipigas), then ask the C2 benefits question with Signals on.

## Signals registry publish

`npm run signals:publish` is **not** part of everyday startup. It writes attribute keys, attribute groups, the intervention, and the agentic context to Snowplow Console. Those objects persist there.

You do **not** need it when you:

- run `npm run dev`
- walk through a demo
- deploy to Vercel

Run it only when the registry definitions change (or the first time you point this app at a new Console org / pipeline):

1. Start the app (`npm run dev`)
2. `npm run signals:publish`

Definitions live in `src/lib/signals-definitions.ts`. Attribute groups are `banco_falabella_domain_userid_attributes` (this-visit intent, key `domain_userid`) and `banco_falabella_customer_id_attributes` (last-hour benefits/merchants plus 7-day ping/session volume, key `customer_id`). There is no Signals service: the panel and the Asistente both read those groups directly. The travel intervention is `banco_falabella_travel_intent_nudge` (`travel_pages_last_10m >= 3` on `domain_userid`; the in-app orb still only renders after login). The command POSTs to `/api/signals/registry` on the running app. Re-running it is safe: objects that already exist in Console are updated or skipped. The first publish after a rename also unpublishes and deletes retired names (`benefits_session_behavior`, `benefits_anonymous_behavior`, `travel_intent_nudge`, `benefits_agent_context_v1`, `banco_falabella_agent_context`).

On Vercel, set `SIGNALS_PUBLISH_SECRET` and POST with `Authorization: Bearer <secret>`. Production rejects publish requests without that secret.
