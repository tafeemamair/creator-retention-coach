# Architecture

Creator Retention Coach is organized around a canonical Next.js application in `ui/`.

```text
                 ┌──────────────────────┐
                 │     Creator UI       │
                 │      Next.js         │
                 └──────────┬───────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
      /api/analyze-preview          Razorpay Checkout
             │                             │
             ▼                             ▼
      Preview analysis             /api/create-order
                                           │
                                           ▼
                                    Razorpay payment
                                           │
                                           ▼
                                   /api/verify-payment
                                           │
                              signature + order checks
                                           │
                                           ▼
                              signed HttpOnly entitlement
                                           │
                                           ▼
                                    /api/analyze-full
                                           │
                                           ▼
                                Full AI retention analysis
```

## Trust boundaries

### Analysis boundary

The analysis layer can combine deterministic heuristics with the OpenAI API. The application can therefore provide useful baseline behavior while still benefiting from model-generated rewrites and title suggestions.

### Payment boundary

The browser is **not** trusted to decide whether a user has paid. The server creates the Razorpay order, receives the successful checkout response, verifies the Razorpay signature with the server-only secret, fetches the order and checks the expected amount/currency/paid status, then issues a signed HttpOnly entitlement.

### Full-analysis boundary

`/api/analyze-full` verifies the signed entitlement before generating premium output. A client-created `paid=true` cookie is no longer sufficient.

## Production-hardening path

For a larger commercial deployment, the next steps would be persistent payment records, Razorpay webhook reconciliation, idempotency, authenticated user identity, rate limiting, audit logging and operational monitoring. Those are intentionally outside the scope of this portfolio implementation.
