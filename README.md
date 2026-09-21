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
| **Valentina Pérez** | Elite | Full catalog (~210 live discounts). Travel nudge cites the CMR TurBus discount. | She switched CMR from cash discount to Fpuntos on 4 sep. Spend is flat; cash savings drop. |

Guest, manual, and random logins reuse Diego's entitlements and savings snapshot.

Camila is the money-shot identity from the Banco Falabella deck (San Miguel, Bandit top-3 TurBus / Lipigas / Dunkin, recurring Shell / Tottus).

## Agent tools

Chat is `POST /api/chat` (`src/routes/api/chat.ts`). Tools live under `src/lib/tools/`. Customer id (and Signals ids) are passed as tool context only on C2/C3 tools. C0 and C1 are the same for every login (no assembly).

| Class | Example | Tools |
| --- | --- | --- |
| **C0** informational | ¿Qué es un fondo mutuo? | `explainProduct` — glossary in `src/lib/product-knowledge.ts` (fondo mutuo, CMR, Fpuntos, cuenta, DAP, crédito de consumo, programa de beneficios) |
| **C1** situational | ¿Dónde encuentro mis beneficios? | `findInApp` — screens in `src/lib/app-guide.ts` (`/beneficios`, `/cuenta`, chat FAB, `/login`) |
| **C2** personalized | ¿Qué beneficios tengo este mes? | `listMyBenefits`, `getBenefitDetails` — entitlements in `src/lib/customer-benefits.ts`. `getRecentBenefitVisits` — last-hour catalog pages from Signals (`benefits_visited_last_1h`) or the local visit snapshot. `suggestNextBenefits` / `suggestNextMerchants` — ranks unused entitlements and unique merchants against those visits using `src/lib/benefits-catalog.ts`. `getSignalsAttributes` — raw this-visit + last-hour / 7-day Signals groups |
| **C3** deep | ¿Por qué ahorro menos este mes? | `getMonthlyBalances`, `getSpendingBreakdown`, `getBenefitOptionHistory` — mocks in `src/lib/customer-savings.ts` (jul–sep 2026) |

The system prompt (`src/lib/agent-prompt.ts`) maps those four classes to tools and forbids inventing amounts, merchants, definitions, or menus.

Suggested questions (Spanish). The first two C0/C1/C3 lines are unchanged; the three C2 lines are the benefits loop and appear as chips in the Asistente empty state:

- ¿Qué es un fondo mutuo?
- ¿Dónde encuentro mis beneficios?
- ¿Qué beneficios tengo este mes? *(same wording under each login)*
- ¿Qué beneficios visité recién? *(same wording under each login)*
- ¿Qué beneficio me conviene ver ahora? *(same wording under each login)*
- ¿Qué comercios me convienen ahora? *(same wording under each login)*
- ¿Por qué ahorro menos este mes? *(same wording under each login)*

### Benefits loop (C2)

The marketing catalog on `/beneficios` is the full scrape in `src/lib/benefits-catalog.ts` (~210 live discounts). Browsing it still generates Signals `benefit_viewed` events for everyone. The agent never reads that catalog directly; it only sees what tools return.

| Step | Question | Tool | Data |
| --- | --- | --- | --- |
| 1. What I have | ¿Qué beneficios tengo este mes? | `listMyBenefits` | Entitlements in `src/lib/customer-benefits.ts` (Diego 3, Camila 5, Valentina full catalog) |
| 2. What I visited | ¿Qué beneficios visité recién? | `getRecentBenefitVisits` | Signals `benefits_visited_last_1h` / `merchants_visited_last_1h`, plus this-visit categories. Falls back to the local snapshot (detail-page ids recorded in the Asistente). Each visit is resolved against the catalog and flagged `entitled: true/false`. |
| 3. What next | ¿Qué beneficio me conviene ver ahora? | `suggestNextBenefits` | Up to 3 **unused entitled** benefits, scored in `src/lib/benefit-recommendations.ts`: same category as a recent visit (+ catalog overlap), Bandit top-3, then stronger discount. Never suggests a benefit the login does not have. Also returns the merchant rollup below. |
| 4. Which merchants | ¿Qué comercios me convienen ahora? | `suggestNextMerchants` | Same inputs, grouped by catalog `merchant`. Skips generic scrape names (`Restaurante`, `Beneficio…`). Boosts recurring merchants (`shell` / `tottus` for Camila) and Bandit ids. Never suggests a merchant without a vigente entitlement. |

`suggestNextBenefits` also returns `categoryGaps` (a category they browsed with zero entitlements). For Diego that is the Viajes beat: he can open TurBus on the catalog, but the tool will not recommend it; the note tells the model to mention CMR signup instead.

Demo beats with Signals on:

1. **Camila** — open Sky Airline and Cinemark (Viajes she is not using yet), then ask the C2 questions. Step 3 and 4 should surface **TurBus** (entitled Viajes she has not opened). Recurring Shell / Tottus can follow if Viajes is already covered.
2. **Diego** — open TurBus, then ask steps 3–4. Must **not** offer TurBus; suggest Copec / Burger King / Tottus and the CMR gap.
3. **Valentina** — open one Viajes card, then ask steps 3–4. She is entitled to the full catalog, so the ranker picks other unused Viajes brands with stronger discounts (not the generic `Restaurante` rows).

The empty-state chips in the Asistente are those four C2 questions. For the older Signals treatment (prioritize what she already has), log in as Camila, browse Viajes (TurBus, Lipigas), then ask step 1.

## Snowplow events

Tracker setup, custom event functions, and the global `customer` entity all live in `src/lib/snowplow-config.ts` (collector `com-snplow-sales-aws-prod1.collector.snplow.net`, vendor `com.bancofalabella`). Full schema fields are in `specs/tracking-requirements.md` and `specs/data-structures/`.

### Standard events

| Event | Fired | Where |
| --- | --- | --- |
| `page_view` | On mount + every route change | `useSnowplowTracking` (`src/hooks/use-snowplow-tracking.ts`), wired app-wide |
| `page_ping` | Every 10s while the tab has ≥20s of activity | `enableActivityTracking` in `initializeSnowplow` |
| `link_click` | Any `<a>` click (content captured) | `enableLinkClickTracking` in `initializeSnowplow` |
| Consent events (`consent_allow`, `consent_deny`, `consent_selected`, `cmp_visible`) | Cookie banner shown / accept / reject / customize | `ConsentManager.tsx`, via `EnhancedConsentPlugin` |
| YouTube media events (play/pause/seek/% boundaries) | `/video` page, embedded player | `route/video/index.tsx`, via `YouTubeTrackingPlugin` (25/50/75/100% boundaries) |

### Custom self-describing events (`com.bancofalabella`)

| Event | Fired | Where | Payload |
| --- | --- | --- | --- |
| `benefit_viewed` | Opening a benefit detail page | `routes/beneficios/$benefitId.tsx` | `benefit_id`, `merchant`, `category` (`Viajes`\|`Restaurantes`\|`Combustible`\|`Retail`), `discount_pct` |
| `benefit_category_filtered` | Selecting a category tab on `/beneficios` | `routes/beneficios/index.tsx` | `category` |
| `product_page_viewed` | Viewing a product page (currently just Cuenta) | `routes/cuenta.tsx` | `product` (e.g. `cuenta_corriente`) |
| `assistant_message_sent` | Submitting a question to the Asistente | `components/AssistantSidebar.tsx` | `channel` (`app`\|`whatsapp` — only `app` fires client-side; a WhatsApp deployment would track this server-side), `intent_guess` |
| --- | --- | --- | --- |
| `customer_identification` | Any login (automatic, manual, known customer) | `routes/login.tsx` | `email`, `phone` (nullable, maxLength 16) |


### Global entity: `customer`

Attached to every event via `addGlobalContexts` (`setCustomerContext`), so no per-call wiring is needed. Set on login, cleared on logout/reset.

| Field | Example | Notes |
| --- | --- | --- |
| `customer_id` | `cust-84213` | Signals stream/warehouse attribute key |
| `cmr_tier` | `CMR Lover` | `Sin CMR`\|`CMR Verde`\|`CMR Lover`\|`CMR Elite`, required — always sent (`Sin CMR` for customers without a CMR card) |
| `comuna` | `San Miguel` | Home comuna |

### Not yet wired

Agent self-tracking (audit-trail events for the chat route, per `docs.snowplow.io/tutorials/agentic-self-tracking`) is not implemented — see `specs/tracking-requirements.md`.

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
