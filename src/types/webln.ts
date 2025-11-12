// WebLN types for lightning wallet integration
export interface WebLNProvider {
  enable(): Promise<void>;
  getInfo(): Promise<GetInfoResponse>;
  sendPayment(paymentRequest: string): Promise<SendPaymentResponse>;
  makeInvoice(args: RequestInvoiceArgs): Promise<RequestInvoiceResponse>;
  signMessage(message: string): Promise<SignMessageResponse>;
  verifyMessage(signature: string, message: string): Promise<void>;
}

export interface GetInfoResponse {
  node: {
    alias: string;
    pubkey: string;
    color?: string;
  };
  methods: string[];
}

export interface SendPaymentResponse {
  preimage: string;
  paymentHash?: string;
  route?: {
    total_amt: number;
    total_fees: number;
  };
}

export interface RequestInvoiceArgs {
  amount?: string | number;
  defaultAmount?: string | number;
  minimumAmount?: string | number;
  maximumAmount?: string | number;
  defaultMemo?: string;
}

export interface RequestInvoiceResponse {
  paymentRequest: string;
  rHash: string;
}

export interface SignMessageResponse {
  message: string;
  signature: string;
}

// Note: Window.webln is already declared in @webbtc/webln-types