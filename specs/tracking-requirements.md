# Banco F — Tracking requirements

Custom tracking needed beyond baseline (page views, pings, link clicks, consent, video). **Status: LIVE.** All 5 data structures below are published for real in Console org `b12539df-a711-42bd-bdfa-175308c55fd5` ("Snowplow Sales AWS"), vendor `com.bancofalabella`, via `snowplow-cli` — see `specs/data-structures/`. The app's `SCHEMA_VENDOR` in `src/lib/snowplow-config.ts` already matches.

Signals objects (attribute group, agentic context, service, intervention) are published through the TanStack API at `POST /api/signals/registry` — definitions live in `src/lib/signals-definitions.ts`. The `.env` file has real Signals credentials wired in.

Remaining gap: the `customer_scores` warehouse attribute group (Bandit scores, CMR tier, comuna, recurring merchants) has no backing warehouse table yet — needs a synthetic BigQuery/Snowflake table before it can be created for real. Until then the app's local fallback (`assembleContext` in `src/lib/agent-prompt.ts`) supplies this data so the demo still works end to end.

## Entity: `customer`

Attached to every event via `addGlobalContexts` (see `setCustomerContext` in `src/lib/snowplow-config.ts`). This is the attribute key Signals attribute groups join on.

| Field | Type | Example | Notes |
|---|---|---|---|
| `customer_id` | string | `cust-84213` | Signals stream/warehouse attribute key |
| `cmr_tier` | string (enum) | `CMR Lover` | `CMR Verde` \| `CMR Lover` \| `CMR Elite` |
| `comuna` | string | `San Miguel` | Home comuna, for the warehouse attribute group |

Placeholder URI: `iglu:com.bancofalabella/customer/jsonschema/1-0-0`

## Event: `benefit_viewed`

Fired on the benefit detail page (`src/routes/beneficios/$benefitId.tsx`).

| Field | Type | Example |
|---|---|---|
| `benefit_id` | string | `turbus` |
| `merchant` | string | `TurBus` |
| `category` | string (enum) | `Viajes` \| `Restaurantes` \| `Combustible` \| `Retail` |
| `discount_pct` | integer | `20` |

Placeholder URI: `iglu:com.bancofalabella/benefit_viewed/jsonschema/1-0-0`

## Event: `benefit_category_filtered`

Fired when a category tab is selected on `/beneficios`.

| Field | Type | Example |
|---|---|---|
| `category` | string (enum) | `Viajes` |

Placeholder URI: `iglu:com.bancofalabella/benefit_category_filtered/jsonschema/1-0-0`

## Event: `product_page_viewed`

Fired on the Cuenta page (extend to other product pages as they're added).

| Field | Type | Example |
|---|---|---|
| `product` | string | `cuenta_corriente` |

Placeholder URI: `iglu:com.bancofalabella/product_page_viewed/jsonschema/1-0-0`

## Event: `assistant_message_sent`

Fired when the customer submits a question to the Asistente. Tracked client-side for the `app` channel; a WhatsApp deployment would track this server-side from the bot backend with `channel: "whatsapp"` — same schema, different tracker (Node server-side tracker, not the browser tracker).

| Field | Type | Example |
|---|---|---|
| `channel` | string (enum) | `app` \| `whatsapp` |
| `intent_guess` | string | `benefits_query` |

Placeholder URI: `iglu:com.bancofalabella/assistant_message_sent/jsonschema/1-0-0`

## Agent self-tracking (audit trail)

Not yet wired into the ADK-equivalent chat route (`src/routes/api/chat.ts`). Per the accelerator (`docs.snowplow.io/tutorials/agentic-self-tracking`), this uses the generic agentic schemas already published on Iglu Central (invocation / step / tool call / completion) — no new custom schema needed, just the self-tracking SDK wired into the chat route's request handler. Left as a follow-up once the Console org is confirmed and the accelerator's Node tracking snippet can be pulled in.

## Signals configuration — LIVE in org b12539df / Sales AWS prod1

Published via `POST /api/signals/registry` (`src/lib/signals-definitions.ts` + `src/lib/signals-registry.ts`). Locally: `npm run dev` then `npm run signals:publish`. On Vercel, set `SIGNALS_PUBLISH_SECRET` and POST with `Authorization: Bearer <secret>`.

- Custom attribute key `customer_id`, extracted from the `customer` entity's `customer_id` field — **published**
- Stream attribute group `banco_falabella_domain_userid_attributes`, key `domain_userid` (this-visit intent): `categories_viewed_last_30m`, `last_merchant_viewed`, `benefit_views_last_10m`, `travel_pages_last_10m` — **published**. The panel and Asistente load this group with `getGroupAttributes`.
- Stream attribute group `banco_falabella_customer_id_attributes`, key `customer_id` (7-day customer memory): `benefits_visited_last_7d`, `merchants_visited_last_7d`, `page_pings_last_7d`, `sessions_last_7d` — **published**. The panel derives estimated average engaged session as `(page_pings_last_7d × 10s) / sessions_last_7d`. `period: P7D` is a rolling window, not a TTL. The Asistente loads this group with `getGroupAttributes`.
- Agentic context `benefits_assistant_context`, scoped to `domain_sessionid` (fixed by Signals — cannot key on `customer_id`), capturing `benefit_viewed` / `benefit_category_filtered` / `product_page_viewed`, 50 events / 30 min — **published**
- Intervention `banco_falabella_travel_intent_nudge`: `banco_falabella_domain_userid_attributes:travel_pages_last_10m >= 3`, targeted to `domain_userid`. The in-app orb still only renders after login (CMR vs sign-up copy). — **published**
- Warehouse attribute group `customer_scores` (`bandit_top_3`, `cmr_tier`, `home_comuna`, `recurring_merchants`) — **not created**, needs a real BigQuery/Snowflake table first. Fetch it as its own group once that table exists.
- No Signals service — a service cannot mix `customer_id` and `domain_userid` groups, so the panel and agent read the groups directly.

Verified live and responding (see conversation, 2026-09-11): `get_attribute_group` and `get_agentic_context` return correctly (empty values, since no real event traffic has flowed through this pipeline yet — that starts once the app is actually run against `com-snplow-sales-aws-prod1.collector.snplow.net`).

The browser plugin subscribes on `domain_userid` (Signals default) at tracker init. The orb is still login-gated in `src/contexts/assistant-context.tsx`; if Signals delivery is delayed, the local Viajes counter is the fallback.

The app's **local fallback** (`assembleContext` in `src/lib/agent-prompt.ts`, counter in `src/contexts/assistant-context.tsx`) means the demo's control/treatment/proactive-nudge beats all work even before real event traffic populates the Profiles Store — the app automatically prefers real Signals data once it's there, no code change needed.
