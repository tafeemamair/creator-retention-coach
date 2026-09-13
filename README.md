# Creator Retention Coach

**AI-powered retention analysis for short-form video scripts.**

Creator Retention Coach combines deterministic retention heuristics with an OpenAI-powered analysis layer to help creators identify weak hooks, likely drop-off points, and stronger script directions. The repository also demonstrates a paid-analysis workflow using Razorpay with server-side payment verification and signed entitlements.

## What it demonstrates

- **Applied AI:** structured retention analysis and AI-generated rewrites/title ideas.
- **Deterministic logic:** hook, pacing, emotion, value, CTA and line-level retention heuristics provide predictable baseline behavior.
- **Product architecture:** free preview → payment → verified entitlement → full analysis.
- **Security boundary:** Razorpay signatures are verified server-side; the full-analysis endpoint does not trust a client-controlled `paid=true` flag.
- **Testing and CI:** payment authorization has regression tests, and GitHub Actions runs tests, linting and a production build.

## Architecture

```text
Creator
  │
  ▼
Next.js UI (`ui/`)
  │
  ├── POST /api/analyze-preview ──► Preview analysis
  │
  └── Razorpay Checkout
          │
          ▼
     POST /api/create-order
          │
          ▼
     Razorpay payment
          │
          ▼
     POST /api/verify-payment
          │  signature + order amount/currency/status
          ▼
     Signed HttpOnly entitlement cookie
          │
          ▼
     POST /api/analyze-full
          │  server-side entitlement verification
          ▼
     Full retention analysis + rewrites + titles
```

The AI layer is intentionally separated from the payment/authorization boundary. Payment verification establishes entitlement; it does not depend on frontend state.

## Analysis flow

The current UI pipeline supports:

1. Script submission and platform selection.
2. Free retention preview.
3. Deterministic retention metrics and drop-off heuristics.
4. Razorpay checkout for the ₹49 full analysis.
5. Server-side signature verification.
6. Signed, HttpOnly paid entitlement.
7. Full analysis with line-level risks, rewrites and title suggestions.
8. Deterministic fallback analysis when the OpenAI key is unavailable for supported analysis paths.

## Security decision

An earlier version of the repository used a client-set `paid=true` cookie as the authorization signal. That was not an acceptable trust boundary because a client could create the cookie without completing payment.

The current implementation fixes that by:

- creating the Razorpay order on the server;
- verifying the Razorpay payment signature on the server;
- fetching the Razorpay order server-side and checking the expected amount, currency and paid status;
- issuing a signed HttpOnly entitlement cookie only after verification; and
- requiring that entitlement on `/api/analyze-full`.

This is still a portfolio implementation rather than a complete production billing platform. A production deployment would additionally benefit from persistent payment records, webhook reconciliation, idempotency, abuse/rate controls and observability.

## Project structure

```text
.
├── ui/                         # canonical Next.js application
│   ├── app/api/                # preview, payment and analysis API routes
│   ├── components/             # product UI
│   └── lib/                    # analysis + payment utilities
├── mcp/                        # optional MCP integration
├── src/                        # earlier CLI analysis implementation
├── tests/                      # repository-level security regression tests
├── .github/workflows/          # CI quality checks
├── MASTER_AGENT_PROMPT.txt    # earlier CLI prompt asset
└── README.md
```

`ui/` is the canonical web application. The root `src/` implementation is retained as an earlier CLI-oriented analysis path rather than being presented as the web app.

## Local setup

### Web application

```bash
cd ui
npm install
npm run dev
```

Required environment variables:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PAYMENT_SESSION_SECRET=
```

Never commit real credentials. Use `.env.example` as the configuration template.

### Tests

From the repository root:

```bash
npm install
npm test
```

The security regression suite covers valid/invalid Razorpay signatures and signed entitlement creation, tampering and expiry.

### Production checks

```bash
cd ui
npm run lint
npm run build
```

GitHub Actions runs these checks automatically on pushes and pull requests targeting `main`.

## Scope and limitations

This repository is a portfolio-oriented product implementation. It is not intended to claim production-grade billing infrastructure. The payment flow demonstrates the correct authorization boundary for a small application, while persistent billing records, webhook reconciliation, rate limiting, account identity, monitoring and operational controls remain production-hardening work.

The deployed commercial product may contain implementation differences from this repository. This repository should be evaluated as the technical portfolio artifact represented by the code on `main`.

## Portfolio role

Creator Retention Coach demonstrates a different capability from the other featured projects:

- **AI Video Factory** — deterministic media-production foundation
- **Taf's Pilot** — autonomous AI production agent
- **Verified Shopping Assistant** — trustworthy AI decision system
- **Creator Retention Coach** — applied AI product with monetization and authorization boundaries

Together they show progression from deterministic automation to applied AI, intelligent decision systems and autonomous production workflows.
