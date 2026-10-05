# @weareaduro/signet-js

Protocol client for [Signet](https://github.com/weareaduro/signet). It builds requests for the Signet resource API and performs them with `fetch`. There is no React, no UI, and no directory context in this package, so any server or browser application can call Signet with it.

Fluent products keep their shell, onboarding, and signed-in directory context in `@weareaduro/fluent-shared`. They import this package when they need to call Signet.

## Install

The package is published from this repository.

```bash
npm install github:weareaduro/signet-js
```

Pin a commit when you depend on it from an application:

```json
"@weareaduro/signet-js": "github:weareaduro/signet-js#<commit>"
```

## Call Signet

`signet` is a set of operation builders. Each one returns a method, path, and optional JSON body or form. `performSignet` sends that operation to a Signet issuer.

```ts
import { performSignet, signet } from '@weareaduro/signet-js';

const result = await performSignet({
  endpoint: 'https://signet.example.com',
  operation: signet.readMe(),
  token: accessToken,
});

if (!result.ok) {
  // result.status is the HTTP status. result.body is the parsed JSON.
}

const profile = result.body;
```

`endpoint` is the Signet origin, with or without a trailing slash. `token` is sent as `Authorization`. A token that already starts with `Bearer ` is left as-is. `tenantId` is sent as the `signet-tenant` cookie so Signet knows which tenant the call is for. `credentials: 'include'` sends the browser cookie when the call is same-site.

A failed response does not throw. `result.ok` is false and `result.status` is the HTTP status. `signetJson` is the throwing form: it uses `credentials: 'include'` and throws `SignetError` when the response is not OK.

## What the builders cover

The builders match the Signet resource routes. They include:

- Sign-in and session: `register`, `passwordGrant`, `providerGrant`, `authorizationCode`, `refreshToken`, `forgotPassword`, `confirmForgotPassword`, `logout`, `userinfo`, `providers`, `signetConnectUrl`
- The signed-in user: `readMe`, `updateMe`
- Tenants: `listTenants`, `selectTenant`, `createTenant`, `updateTenant`, `tenantMsa`, `tenantTerms`, `listIntegrations`, `saveIntegration`
- Organisations, members, and roles: `listOrganisations`, `createOrganisation`, `readOrganisation`, `updateOrganisation`, `deleteOrganisation`, `listMembers`, `addMember`, `updateMember`, `removeMember`, `listRoles`, `assignRoleClaim`, `removeRoleClaim`
- Organisation billing: `organisationBalance`, `listTransactions`, `recordTransaction`, `invoices`, `raiseInvoice`, `paymentMethods`, `setupIntent`, `setDefaultPaymentMethod`, `deletePaymentMethod`, `paymentIntent`, `billingStripe`, `stripeProxy`
- The tenant's own platform subscription: `tenantSubscription`, `cancelSubscription`, `confirmTenantSubscription`

`paymentIntent` sends `client` and the Stripe `customerId`. The webhook credits the organisation in that tenant whose Stripe customer id matches. It does not put the organisation id on the payment intent. A payment intent that Stripe created for a subscription invoice is recorded from that invoice instead. `recordTransaction` is how a product posts a debit or credit after it has handled a charge itself.

Pass `tenant: true` to `invoices` and `paymentMethods` to read the tenant's own Stripe customer. Those calls list the platform subscription's invoices and cards. Organisation invoices and transactions are a different ledger, addressed by `organisationId`.
