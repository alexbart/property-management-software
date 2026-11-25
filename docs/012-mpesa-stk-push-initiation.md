# Milestone 012: M-Pesa STK Push Initiation

## Overview
Implement M-Pesa STK Push initiation for rent payments. This allows tenants to pay rent via M-Pesa directly from the Tenant Dashboard.

## Flow

1. **Frontend**: Tenant clicks "Pay Rent" on a lease with arrears
2. **Frontend**: Collects phone number (validated as 2547XXXXXXXX)
3. **Frontend**: Calls `POST /api/v1/finance/mpesa/stk-push` with `{ leaseId, amount, phoneNumber }`
4. **API**: Validates amount matches arrears, lease belongs to tenant
4. **API**: Calls Safaricom Daraja `mpesa/stkpush/v1/processrequest`
5. **API**: Returns `checkoutRequestId`, `merchantRequestId` to frontend
6. **Frontend**: Shows loading/polling state
7. **Daraja Webhook** (from Milestone 004): Updates `Payment` status to `COMPLETED`
8. **Frontend**: Polls arrears endpoint until payment confirmed or timeout

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MPESA_CONSUMER_KEY` | Daraja API consumer key | Yes |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret | Yes |
| `MPESA_SHORTCODE` | Business shortcode (paybill/till) | Yes |
| `MPESA_PASSKEY` | Daraja passkey for STK push | Yes |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | Yes |
| `MPESA_CALLBACK_URL` | Full URL for Daraja webhook (e.g., `https://api.example.com/api/v1/finance/mpesa/callback`) | Yes |

## Contracts

### `InitiateStkPushDto`
```typescript
{
  leaseId: string;           // UUID of the lease
  amount: string;            // Stringified decimal (e.g., "15000.00")
  phoneNumber: string;       // Kenyan format: 2547XXXXXXXX
}
```

### `StkPushResponseDto`
```typescript
{
  checkoutRequestId: string; // Safaricom CheckoutRequestID
  merchantRequestId: string; // Safaricom MerchantRequestID
  responseCode: string;      // "0" = success
  responseDescription: string;
  customerMessage: string;   // Message to show user
}
```

## Phone Number Validation
Regex: `/^254[17]\d{8}$/`
- Must start with 254
- Second digit: 1 or 7 (Safaricom prefixes)
- Total 12 digits

## Amount Validation
- Must be positive decimal string
- Must match outstanding arrears for the lease (or be a valid partial payment per business rules)
- Max 2 decimal places

## Security
- Endpoint requires `TENANT` role + `require-tenant-scope`
- Lease ownership verified (tenant can only pay their own leases)
- Amount server-side validated against calculated arrears
- Idempotency: Use `merchantRequestId` + `checkoutRequestId` to prevent duplicate pushes

## Error Handling
- Safaricom errors (insufficient funds, timeout, invalid phone) → return user-friendly message
- Network errors → retry with exponential backoff (max 3)
- Webhook not received within 5 min → mark payment `PENDING`, allow manual reconciliation

## Polling Strategy (V1)
- Frontend polls `GET /api/v1/finance/arrears?leaseId={id}` every 5 seconds
- Stop polling when payment status = `COMPLETED` or timeout (5 min)
- Reuses existing authenticated endpoint

## Testing
- Mock Daraja HTTP calls in tests
- Test phone number validation (valid/invalid formats)
- Test amount validation
- Test lease ownership enforcement
- Test idempotency