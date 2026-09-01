# Kleenest Fleet

Kleenest Fleet is the organization-facing Fleet product for providing Kleenest Premium access to groups larger than the Family-plan model and for managing the operational relationship between that organization, its users, and monitored locations.

## Canonical repository contract

- **`Kleenest_Architecture/main`** is the canonical source for Fleet features, services, workflows, data models, roles, Enterprise behavior and product rules.
- **`Kleenest_Production`** is the live Consumer/Premium counterpart. Fleet clients and Premium recipients rely heavily on Production framework and network behavior, so Fleet must remain compatible with Production's authentication, Premium-user, location, notification, engagement and other shared backend contracts.
- **`Kleenest_Fleet`** owns all Fleet runtime/application implementation.
- **`Kleenest_Business`** owns Business runtime implementation. Fleet includes Business Standard as a commercial entitlement but does not absorb Business code into this repository.
- **`Kleenest_Owner`** is the private control plane that administers and observes Fleet alongside the other Kleenest products.

Cross-app behavior should be mediated by canonical Supabase/backend APIs, authorization and shared domain/event contracts. Do not create direct source dependencies between customer-facing app repos when a backend contract is the correct boundary.

## Product model

Fleet is designed for an organization that needs to provide Premium-user access to more people than the Family plan supports.

- Fleet includes **Business Standard**.
- Base Fleet may monitor **one location**.
- Monitoring **more than one location requires Enterprise**.
- Fleet does not automatically grant Business Growth or Business Enterprise.
- An organization may separately upgrade the bundled Business Standard to Business Growth or Business Enterprise.
- Business Growth does not expand Fleet's one-location monitoring ceiling.

## Enterprise layer

There is no separate Enterprise app. Enterprise Fleet capabilities live in this repository behind Enterprise entitlement gates.

Enterprise Fleet should cover capabilities such as multi-location monitoring, larger organization controls, advanced governance, cross-location intelligence, integrations, higher-scale administration and other Architecture-defined enterprise operations.

## Fleet roles

The Fleet role family remains separately scoped from Business roles:

- `client`
- `fleet_owner`
- `admin`
- `manager`
- `dispatcher`
- `fleet_driver`

Roles, product entitlements, resource scope and server-side authorization are independent gates.

## Implementation rule

For every Fleet implementation wave:

1. inspect `Kleenest_Architecture/main` for the canonical Fleet feature/service/schema/workflow;
2. inspect `Kleenest_Production` for the live Consumer/Premium framework and network contracts that Fleet clients rely on;
3. implement Fleet runtime code in `Kleenest_Fleet`;
4. keep shared identities, Premium access, organization/location references, notifications, events and authorization compatible with Production;
5. implement Enterprise Fleet capabilities here as gated upgrades rather than in a fourth application.
