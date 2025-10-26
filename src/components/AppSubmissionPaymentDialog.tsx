import { useState, useEffect } from 'react';
import { Zap, Copy, Check, CheckCircle, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { useAppSubmissionPayment } from '@/hooks/useAppSubmissionPayment';
import { useWallet } from '@/hooks/useWallet';

interface AppSubmissionPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentConfirmed: () => void;
}

export function AppSubmissionPaymentDialog({
  open,
  onOpenChange,
  onPaymentConfirmed,
}: AppSubmissionPaymentDialogProps) {
  const { toast } = useToast();
  const { webln } = useWallet();
  const {
    isPaymentRequired,
    paymentConfig,
    paymentState,
    createPayment,
    verifyPayment,
    resetPayment,
    isCreatingPayment,
    isVerifyingPayment,
  } = useAppSubmissionPayment();

  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  // Reset confirmation flag and timer when dialog opens
  useEffect(() => {
    if (open) {
      setHasConfirmed(false);
      setTimeRemaining(300); // Reset to 5 minutes
    }
  }, [open]);

  // Timer countdown effect
  useEffect(() => {
    if (!open || !paymentState.invoice || paymentState.paid || timeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, paymentState.invoice, paymentState.paid, timeRemaining]);

  // Generate QR code when invoice is available
  useEffect(() => {
    let isCancelled = false;
    
    if (paymentState.invoice) {
      // Generate QR code URL using qr-server.com
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentState.invoice)}`;
      
      // Preload the QR code image
      const img = new Image();
      img.onload = () => {
        if (!isCancelled) {
          setQrCodeUrl(qrUrl);
        }
      };
      img.src = qrUrl;
    } else {
      setQrCodeUrl('');
    }

    return () => {
      isCancelled = true;
    };
  }, [paymentState.invoice]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetPayment();
      setCopied(false);
      setQrCodeUrl('');
    }
  }, [open, resetPayment]);

  // Auto-verify payment when invoice is created
  useEffect(() => {
    if (paymentState.invoice && !paymentState.paid && !isVerifyingPayment) {
      console.log('🔄 Starting payment verification polling...', {
        invoice: paymentState.invoice.substring(0, 20) + '...',
        paid: paymentState.paid,
        verifying: isVerifyingPayment
      });
      
      // Set up polling to check for payment confirmation
      const pollInterval = setInterval(() => {
        console.log('⚡ Checking for payment...');
        verifyPayment();
      }, 5000); // Check every 5 seconds

      // Also show a helpful message about automatic verification
      const timeoutId = setTimeout(() => {
        toast({
          title: 'Waiting for Payment',
          description: 'We\'ll automatically detect when your payment is confirmed. You have up to 5 minutes to complete the payment.',
        });
      }, 10000); // Show after 10 seconds

      return () => {
        console.log('🛑 Stopping payment verification polling');
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      };
    } else {
      console.log('❌ Not starting polling:', {
        hasInvoice: !!paymentState.invoice,
        paid: paymentState.paid,
        verifying: isVerifyingPayment
      });
    }
  }, [paymentState.invoice, paymentState.paid, isVerifyingPayment, verifyPayment, toast]);

  // Handle payment confirmation
  useEffect(() => {
    if (paymentState.paid && !hasConfirmed) {
      setHasConfirmed(true);
      toast({
        title: 'Payment Successful!',
        description: 'Your payment has been confirmed. Proceeding with app submission...',
      });
      onPaymentConfirmed();
    }
  }, [paymentState.paid, hasConfirmed, onPaymentConfirmed, toast]);

  const copyInvoice = async () => {
    if (paymentState.invoice) {
      await navigator.clipboard.writeText(paymentState.invoice);
      setCopied(true);
      toast({
        title: 'Invoice copied',
        description: 'Lightning invoice copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWebLNPayment = async () => {
    if (!webln || !paymentState.invoice) return;

    try {
      await webln.sendPayment(paymentState.invoice);
      toast({
        title: 'Payment Sent',
        description: 'Payment sent via WebLN. Verifying confirmation...',
      });
      // The auto-verification will pick up the payment
    } catch (error) {
      toast({
        title: 'WebLN Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to send payment via WebLN',
        variant: 'destructive',
      });
    }
  };

  if (!isPaymentRequired || !paymentConfig) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>App Submission Payment</span>
          </DialogTitle>
          <DialogDescription>
            A payment of {paymentConfig.feeAmount} sats is required to submit your app to the directory.
          </DialogDescription>
          {isVerifyingPayment && paymentState.invoice && (
            <div className="flex items-center justify-center mt-2 text-sm text-orange-600 dark:text-orange-400">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying payment...
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {!paymentState.invoice && !paymentState.paid && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Payment Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan the QR code or copy the invoice to pay with any Lightning wallet.
                </p>
              </div>
              <Button
                onClick={() => createPayment()}
                disabled={isCreatingPayment}
                className="w-full"
                size="lg"
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Payment Invoice
                  </>
                )}
              </Button>
            </div>
          )}

          {paymentState.invoice && !paymentState.paid && (
            <div className="space-y-4">
              {/* Payment amount display */}
              <div className="text-center space-y-3">
                <div>
                  <div className="text-2xl font-bold">{paymentConfig.feeAmount} sats</div>
                  <div className="text-sm text-muted-foreground">App submission fee</div>
                </div>
                
                {/* Timer bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Payment expires in:</span>
                    <span className="font-mono">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timeRemaining > 60 ? 'bg-blue-500' : 
                        timeRemaining > 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(timeRemaining / 300) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Invoice input */}
              <div className="space-y-2">
                <Label htmlFor="invoice">Lightning Invoice</Label>
                <div className="flex space-x-2">
                  <Input
                    id="invoice"
                    value={paymentState.invoice}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInvoice}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <Card className="p-3 max-w-[280px] mx-auto">
                  <CardContent className="p-0 flex justify-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="Lightning Invoice QR Code"
                        className="w-full h-auto max-w-[280px] rounded"
                      />
                    ) : (
                      <div className="w-[280px] h-[280px] bg-muted rounded flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment buttons */}
              <div className="space-y-2">
                {webln && (
                  <Button
                    onClick={handleWebLNPayment}
                    disabled={isVerifyingPayment}
                    className="w-full"
                    size="lg"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Pay with WebLN
                  </Button>
                )}
              </div>
            </div>
          )}

          {paymentState.paid && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Payment Confirmed!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment has been successfully verified. Your app will now be submitted to the directory.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
