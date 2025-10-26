# Lightning Payments for App Submissions

This document describes the Lightning payment integration for app submissions in the Nostr app directory.

## Overview

The Lightning payment system allows you to charge a small fee for new app submissions to prevent spam and maintain directory quality. The system uses NIP-57 (Lightning Zaps) to handle payments and verification.

## Features

- **Lightning Address Integration**: Supports any NIP-57 compatible Lightning address
- **Automatic Payment Detection**: Uses zap receipts to verify payments
- **User-Friendly Interface**: QR codes, WebLN support, and manual invoice copying
- **Smart Payment Logic**: Only charges new users, existing app authors can edit for free
- **Configurable**: Easy to enable/disable and adjust fee amounts
- **Debug Tools**: Built-in debugging for troubleshooting payment issues

## Configuration

### Environment Variables

The Lightning payment system requires the following environment variables to be configured in your `.env` file:

### Relay Configuration

```bash
# Default relay URL for app submissions and zap receipts
VITE_RELAY_URL=wss://relay.nostr.net
```

### Payment Configuration

```bash
# Enable or disable payment requirement (required)
VITE_SUBMIT_APP_PAYMENT_ENABLED=true

# Lightning address that supports NIP-57 (required if enabled)
VITE_SUBMIT_APP_LIGHTNING_ADDRESS=payments@yourdomain.com

# Fee amount in satoshis (required if enabled)
VITE_SUBMIT_APP_FEE=1000
```

### Lightning Address Requirements

Your Lightning address must support:
- **NIP-57 (Zaps)**: Must have `allowsNostr: true` in LNURL response
- **Nostr Pubkey**: Must provide `nostrPubkey` in the profile
- **Callback URL**: Must provide a `callback` endpoint for invoice generation

### Example Lightning Address Response

```json
{
  "status": "OK",
  "tag": "payRequest",
  "callback": "https://yourdomain.com/lnurlp/payments/callback",
  "metadata": "[[\"text/plain\",\"Payments for yourdomain.com\"]]",
  "minSendable": 1000,
  "maxSendable": 11000000000,
  "nostrPubkey": "your-nostr-pubkey-here",
  "allowsNostr": true,
  "commentAllowed": 200
}
```

## How It Works

### Payment Flow

1. **User submits app** → System checks if user has existing apps
2. **New user** → Payment dialog appears with Lightning invoice
3. **User pays** → System monitors for zap receipts (NIP-57)
4. **Payment confirmed** → App is published to Nostr network
5. **Existing user** → App is published directly (no payment required)

### Technical Implementation

#### 1. Payment Detection Logic

```typescript
// Only new users pay fees
const hasExistingApps = userApps && userApps.length > 0;
const requiresPayment = isPaymentRequired && !hasExistingApps;
```

#### 2. Zap Request Creation (NIP-57)

```typescript
const zapRequestEvent = {
  kind: 9734,
  content: `App submission payment via ${window.location.hostname}`,
  tags: [
    ['p', lightningProfile.pubkey],
    ['amount', amountMsats.toString()],
    ['relays', relayUrl],
  ],
  // ... other fields
};
```

#### 3. Payment Verification

The system looks for zap receipts (kind 9735) that:
- Reference the Lightning address pubkey
- Contain the correct payment amount
- Were created recently (within 5 minutes)

## User Experience

### Payment Dialog Features

- **QR Code**: Automatically generated for easy mobile wallet scanning
- **Copy Invoice**: One-click copying of Lightning invoice
- **WebLN Support**: Direct browser wallet integration (if available)
- **Auto-Verification**: Checks for payment every 5 seconds
- **5-Minute Timeout**: Reasonable time limit for payment completion
- **Manual Override**: Debug option for testing (can be removed in production)

### Payment States

1. **Payment Required** → Shows fee amount and "Create Payment Invoice" button
2. **Invoice Created** → Displays QR code, invoice, and payment options
3. **Payment Pending** → Shows "Verifying payment..." with auto-polling
4. **Payment Confirmed** → Success message and automatic app submission
5. **Payment Failed/Timeout** → Error message with option to retry

## Integration Guide

### 1. Install Dependencies

The system uses existing dependencies:
- `@nostrify/react` - Nostr integration
- `@tanstack/react-query` - State management
- `lucide-react` - Icons
- `nostr-tools` - Nostr utilities

### 2. Add Environment Variables

Copy from `.env.example` and configure:

```bash
cp .env.example .env
# Edit .env with your Lightning address and fee amount
```

### 3. Test Configuration

Use the built-in debug tools:
1. Submit a test app
2. Click "🔍 Debug Receipts" in payment dialog
3. Check browser console for detailed logs

## Troubleshooting

### Common Issues

#### 1. "Lightning address does not support NIP-57 zaps"
- Verify your Lightning address supports `allowsNostr: true`
- Check that `nostrPubkey` is provided in the LNURL response

#### 2. "Payment not detected after paying"
- Check if zap receipts are published to the correct relay
- Use debug tools to see what receipts are found
- Verify the Lightning service is creating proper zap receipts

#### 3. "Payment required for existing users"
- Check if `useAppsByAuthor` is correctly fetching user's apps
- Verify the user's pubkey matches their previous submissions

### Debug Tools

#### Built-in Debug Function

Click "🔍 Debug Receipts" to see:
- Lightning address profile information
- Available zap receipts on the relay
- Payment amount and recipient verification
- Timing and pubkey matching

#### Console Logging

The system provides detailed console logs for:
- Lightning profile fetching
- Zap request creation and signing
- Payment verification attempts
- Receipt validation process

### Manual Testing

For testing purposes, you can:
1. Use the "Manual Override" button to bypass payment
2. Check console logs for detailed debugging information
3. Verify Lightning address configuration with external tools

## Security Considerations

### Payment Verification

- **Multiple Verification Methods**: Checks multiple query patterns for receipts
- **Amount Validation**: Ensures payment meets minimum fee requirement
- **Time-based Filtering**: Only accepts recent payments (prevents replay attacks)
- **Pubkey Verification**: Confirms payment went to correct Lightning address

### Rate Limiting

- **Per-User Limits**: Only new users pay (existing users edit for free)
- **Duplicate Prevention**: Prevents multiple submissions during payment process
- **Timeout Handling**: 5-minute limit prevents indefinite pending states

## Customization

### Adjusting Fee Amount

Change `VITE_SUBMIT_APP_FEE` in your `.env` file:

```bash
# Examples:
VITE_SUBMIT_APP_FEE=500    # 500 sats
VITE_SUBMIT_APP_FEE=2100   # 2,100 sats
VITE_SUBMIT_APP_FEE=0      # Disable payments
```

### Changing Lightning Address

Update `VITE_SUBMIT_APP_LIGHTNING_ADDRESS`:

```bash
# Examples:
VITE_SUBMIT_APP_LIGHTNING_ADDRESS=payments@getalby.com
```

### Disabling Payments

To disable the payment system entirely:

```bash
# Set the payment enabled flag to false or remove it:
VITE_SUBMIT_APP_PAYMENT_ENABLED=false

# Or remove/comment out all payment-related variables:
# VITE_SUBMIT_APP_PAYMENT_ENABLED=
# VITE_SUBMIT_APP_LIGHTNING_ADDRESS=
# VITE_SUBMIT_APP_FEE=
```

## Development

### File Structure

```
src/
├── hooks/
│   └── useAppSubmissionPayment.ts     # Main payment logic
├── components/
│   ├── AppSubmissionPaymentDialog.tsx # Payment UI
│   └── SubmitAppForm.tsx              # Form integration
└── ...
```

### Key Components

1. **`useAppSubmissionPayment`** - Core payment hook
   - Lightning address profile fetching
   - Zap request creation and signing
   - Payment verification via zap receipts
   - State management for payment flow

2. **`AppSubmissionPaymentDialog`** - Payment UI component
   - QR code generation and display
   - Invoice copying and WebLN integration
   - Auto-verification and status updates
   - Debug tools and manual override

3. **`SubmitAppForm`** - Form integration
   - Payment requirement detection
   - Conditional payment flow
   - Duplicate submission prevention
   - Success/error handling

### Testing

Create a test file for the payment functionality:

```typescript
// src/hooks/useAppSubmissionPayment.test.ts
import { renderHook } from '@testing-library/react';
import { useAppSubmissionPayment } from './useAppSubmissionPayment';

describe('useAppSubmissionPayment', () => {
  it('should detect payment configuration', () => {
    // Test payment config detection
  });

  it('should create zap requests correctly', () => {
    // Test zap request creation
  });

  it('should verify payments', () => {
    // Test payment verification
  });
});
```

## Support

### Lightning Address Providers

Compatible Lightning address providers:
- **Alby** (`user@getalby.com`)
- **Primal** (`user@primal.net`)
- **Custom** (any NIP-57 compatible service)

### Resources

- [NIP-57 Specification](https://github.com/nostr-protocol/nips/blob/master/57.md)
- [Lightning Address Specification](https://github.com/andrerfneves/lightning-address)
- [LNURL-pay Specification](https://github.com/fiatjaf/lnurl-rfc/blob/luds/06.md)

## Changelog

### Version 1.0.0
- Initial Lightning payment integration
- NIP-57 zap receipt verification
- QR code and WebLN support
- Debug tools and comprehensive logging
- Smart payment logic (new users only)
- 5-minute payment timeout
- Configurable Lightning address and fee amount
