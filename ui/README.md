# Creator Retention Coach — Web Application

This directory contains the **canonical Next.js application** for Creator Retention Coach. The repository-level [`README.md`](../README.md) contains the complete architecture, security model, testing workflow and portfolio context.

## Run locally

```bash
npm install
npm run dev
```

Create `ui/.env.local` with:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PAYMENT_SESSION_SECRET=
```

`RAZORPAY_KEY_SECRET` and `PAYMENT_SESSION_SECRET` are server-only secrets. Do not expose them through `NEXT_PUBLIC_*` variables or commit them.

## Quality checks

```bash
npm run lint
npm run build
```

The repository-level CI workflow runs these checks together with the payment authorization regression tests.

## Key API routes

- `POST /api/analyze-preview` — free retention snapshot.
- `POST /api/create-order` — creates the ₹49 Razorpay order server-side.
- `POST /api/verify-payment` — verifies the Razorpay signature and paid order before issuing an entitlement.
- `POST /api/analyze-full` — serves premium analysis only when the signed entitlement is valid.
