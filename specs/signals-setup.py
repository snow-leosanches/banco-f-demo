"""
Publishes the Banco F Signals objects (attribute group, agentic context,
service, intervention) to Snowplow Console org b12539df-a711-42bd-bdfa-175308c55fd5
("Snowplow Sales AWS"), pipeline prod1.

Run from the project root with the venv active:
    source .signals-venv/bin/activate
    python specs/signals-setup.py

Requires env vars (see .env): SIGNALS_API_ENDPOINT, SIGNALS_API_KEY,
SIGNALS_API_KEY_ID, SNOWPLOW_CONSOLE_ORG_ID.

NOTE: the warehouse attribute group ("customer_scores" — bandit_top_3,
cmr_tier, home_comuna, recurring_merchants) is NOT created here. It requires
a real warehouse table (BigQuery/Snowflake) with synthetic Bandit scores that
doesn't exist yet — see specs/tracking-requirements.md. The service below
only bundles the stream attribute group for now; add the warehouse group to
`attribute_groups` once that table exists.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv
from snowplow_signals import (
    Signals,
    StreamAttributeGroup,
    Attribute,
    AttributeKey,
    EntityProperty,
    EventProperty,
    AtomicProperty,
    Event as EventOutput,
    Criteria,
    Criterion,
    EventLog,
    EventSelection,
    EventLogEvent,
    EventLogEventProperty,
    EventLogAtomicProperty,
    Service,
    RuleIntervention,
    InterventionCriterion,
    LinkAttributeKey,
    domain_sessionid,
)

load_dotenv()

OWNER = "leonel.sanches@snowplowanalytics.com"
VENDOR = "com.bancofalabella"

sp_signals = Signals(
    api_url=os.environ["SIGNALS_API_ENDPOINT"],
    api_key=os.environ["SIGNALS_API_KEY"],
    api_key_id=os.environ["SIGNALS_API_KEY_ID"],
    org_id=os.environ["SNOWPLOW_CONSOLE_ORG_ID"],
)

# ─── Custom attribute key: customer_id ───────────────────────────────────────
# Extracted from the `customer` entity attached to every event.

customer_id_key = AttributeKey(
    key="customer_id",
    name="customer_id",
    description="Banco F bank customer ID",
    owner=OWNER,
    property=EntityProperty(vendor=VENDOR, name="customer", major_version=1, path="$.customer_id"),
)

# ─── Stream attribute group: benefits_session_behavior ──────────────────────

categories_viewed_last_30m = Attribute(
    name="categories_viewed_last_30m",
    type="string_list",
    aggregation="unique_list",
    period=timedelta(minutes=30),
    description="Distinct benefit categories the customer filtered on in the last 30 minutes",
    events=[EventOutput(vendor=VENDOR, name="benefit_category_filtered", version="1-0-0")],
    property=EventProperty(vendor=VENDOR, name="benefit_category_filtered", major_version=1, path="$.category"),
)

last_merchant_viewed = Attribute(
    name="last_merchant_viewed",
    type="string",
    aggregation="last",
    description="Most recent benefit merchant the customer viewed",
    events=[EventOutput(vendor=VENDOR, name="benefit_viewed", version="1-0-0")],
    property=EventProperty(vendor=VENDOR, name="benefit_viewed", major_version=1, path="$.merchant"),
)

benefit_views_last_10m = Attribute(
    name="benefit_views_last_10m",
    type="int32",
    aggregation="counter",
    period=timedelta(minutes=10),
    description="Count of benefit detail views in the last 10 minutes",
    events=[EventOutput(vendor=VENDOR, name="benefit_viewed", version="1-0-0")],
    property=AtomicProperty(name="event_id"),
)

travel_pages_last_10m = Attribute(
    name="travel_pages_last_10m",
    type="int32",
    aggregation="counter",
    period=timedelta(minutes=10),
    description="Count of Viajes-category benefit views in the last 10 minutes — drives the travel_intent_nudge intervention",
    events=[EventOutput(vendor=VENDOR, name="benefit_viewed", version="1-0-0")],
    property=AtomicProperty(name="event_id"),
    criteria=Criteria(
        all=[
            Criterion(
                operator="=",
                property=EventProperty(vendor=VENDOR, name="benefit_viewed", major_version=1, path="$.category"),
                value="Viajes",
            )
        ]
    ),
)

benefits_session_behavior = StreamAttributeGroup(
    name="benefits_session_behavior",
    version=1,
    attribute_key=customer_id_key,
    owner=OWNER,
    description="Real-time benefits-browsing behavior for the Banco F Signals POC",
    attributes=[categories_viewed_last_30m, last_merchant_viewed, benefit_views_last_10m, travel_pages_last_10m],
)

# ─── Agentic context: benefits_assistant_context ─────────────────────────────
# Fixed to domain_sessionid by Signals (session-scoped, not customer_id).

benefits_assistant_context = EventLog(
    name="benefits_assistant_context",
    attribute_key=domain_sessionid,
    max_events=50,
    max_age_seconds=1800,
    owner=OWNER,
    description="Rolling session activity for the Banco F Benefits assistant",
    prompt=(
        "You are Banco Falabella's benefits assistant. Use recent activity to "
        "prioritize benefits the customer is actively exploring. Never invent "
        "benefits not in the catalog."
    ),
    events=[
        EventSelection(
            event=EventLogEvent(vendor=VENDOR, name="benefit_viewed", version="1-0-0"),
            properties=[
                EventLogAtomicProperty(name="event_name"),
                EventLogAtomicProperty(name="page_urlpath"),
                EventLogEventProperty(vendor=VENDOR, name="benefit_viewed", major_version=1, path="$.merchant", output_name="merchant"),
                EventLogEventProperty(vendor=VENDOR, name="benefit_viewed", major_version=1, path="$.category", output_name="category"),
                EventLogEventProperty(vendor=VENDOR, name="benefit_viewed", major_version=1, path="$.discount_pct", output_name="discount_pct"),
            ],
        ),
        EventSelection(
            event=EventLogEvent(vendor=VENDOR, name="benefit_category_filtered", version="1-0-0"),
            properties=[
                EventLogAtomicProperty(name="event_name"),
                EventLogEventProperty(vendor=VENDOR, name="benefit_category_filtered", major_version=1, path="$.category", output_name="category"),
            ],
        ),
        EventSelection(
            event=EventLogEvent(vendor=VENDOR, name="product_page_viewed", version="1-0-0"),
            properties=[
                EventLogAtomicProperty(name="event_name"),
                EventLogEventProperty(vendor=VENDOR, name="product_page_viewed", major_version=1, path="$.product", output_name="product"),
            ],
        ),
    ],
)

# ─── Service: benefits_agent_context_v1 ──────────────────────────────────────
# NOTE: only bundles the stream attribute group for now — add the warehouse
# group here once a real BigQuery/Snowflake table backs customer_scores.

benefits_agent_context_v1 = Service(
    name="benefits_agent_context_v1",
    owner=OWNER,
    description="Context package for the Banco F Benefits assistant (Signals POC)",
    attribute_groups=[benefits_session_behavior],
)

# ─── Intervention: travel_intent_nudge ───────────────────────────────────────

travel_intent_nudge = RuleIntervention(
    name="travel_intent_nudge",
    owner=OWNER,
    description="Fires when a customer views 3+ Viajes benefits in 10 minutes — surfaces the TurBus offer as an in-flow nudge",
    criteria=InterventionCriterion(
        attribute="benefits_session_behavior:travel_pages_last_10m",
        operator=">=",
        value=3,
    ),
    target_attribute_keys=[LinkAttributeKey(name="customer_id")],
)

if __name__ == "__main__":
    print("Publishing attribute key + attribute group...")
    sp_signals.publish([customer_id_key, benefits_session_behavior])

    print("Publishing agentic context...")
    sp_signals.publish([benefits_assistant_context])

    print("Publishing service...")
    sp_signals.publish([benefits_agent_context_v1])

    print("Publishing intervention...")
    sp_signals.publish([travel_intent_nudge])

    print("Done.")
