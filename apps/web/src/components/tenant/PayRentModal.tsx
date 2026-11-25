import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, Phone } from "lucide-react";
import { InitiateStkPushDto, StkPushResponseDto, ArrearsSummaryDto } from "@property-platform/contracts";
import { apiClient } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Card } from "../../components/ui/Card";

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatKES(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  return KES.format(Number(value));
}

interface PayRentModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  currentBalance: string;
  tenantPhone?: string;
}

export function PayRentModal({
  isOpen,
  onClose,
  leaseId,
  currentBalance,
  tenantPhone,
}: PayRentModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_POLLS = 24; // 2 minutes at 5-second intervals

  // Format phone number to 254XXXXXXXXX format
  const formatPhone = useCallback((value: string): string => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "254" + digits.slice(1);
    } else if (!digits.startsWith("254")) {
      digits = "254" + digits;
    }
    return digits;
  }, []);

  // Initialize phone number from tenant data
  useEffect(() => {
    if (isOpen && tenantPhone) {
      setPhoneNumber(formatPhone(tenantPhone));
    }
  }, [isOpen, tenantPhone, formatPhone]);

  // Initialize amount from current balance
  useEffect(() => {
    if (isOpen && currentBalance) {
      setAmount(currentBalance);
    }
  }, [isOpen, currentBalance]);

  // Start polling after successful STK push
  useEffect(() => {
    if (!isPolling) return;

    intervalRef.current = setInterval(async () => {
      setPollCount((prev) => prev + 1);
      try {
        const data = await apiClient<ArrearsSummaryDto>(
          `/api/v1/finance/leases/${leaseId}/arrears`,
        );
        if (Number(data.currentBalance) < Number(currentBalance)) {
          // Payment received - balance decreased
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPolling(false);
          setPollCount(0);
          showToast("Payment successful! Rent balance updated.", "success");
          queryClient.invalidateQueries({ queryKey: ["tenant-arrears", leaseId] });
          onClose();
        } else if (pollCount >= MAX_POLLS) {
          // Timeout
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPolling(false);
          setPollCount(0);
          showToast(
            "Payment pending. It will reflect shortly, or check your M-Pesa messages.",
            "warning",
          );
        }
      } catch {
        // Ignore polling errors, continue polling
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, leaseId, currentBalance, pollCount, queryClient, showToast, onClose]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setIsPolling(false);
      setPollCount(0);
      setCheckoutRequestId(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isOpen]);

  const initiateStkPush = async (data: InitiateStkPushDto) => {
    const response = await apiClient<StkPushResponseDto>("/api/v1/finance/payments/stk-push", {
      method: "POST",
      body: JSON.stringify(data),
      schema: StkPushResponseDto,
    });
    return response;
  };

  const mutation = useMutation({
    mutationFn: initiateStkPush,
    onSuccess: (response) => {
      setCheckoutRequestId(response.checkoutRequestId);
      setIsPolling(true);
      setPollCount(0);
      showToast("STK Push sent. Check your phone and enter your M-Pesa PIN...", "info");
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to initiate payment. Please try again.";
      showToast(message, "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !amount) return;

    mutation.mutate({
      leaseId,
      phoneNumber: formatPhone(phoneNumber),
      amount: Number(amount).toFixed(2),
    });
  };

  if (!isOpen) return null;

  const balanceNum = Number(currentBalance);
  const amountNum = Number(amount);
  const isAmountValid = amountNum > 0 && amountNum <= balanceNum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Pay Rent via M-Pesa</h2>
          <button
            onClick={onClose}
            disabled={mutation.isPending || isPolling}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Current balance: <span className="font-semibold text-slate-900">{formatKES(currentBalance)}</span>
        </p>

        {mutation.isPending && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initiating STK Push...</span>
          </div>
        )}

        {isPolling && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              Waiting for payment... (check {MAX_POLLS - pollCount} remaining)
            </span>
          </div>
        )}

        {!mutation.isPending && !isPolling && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number (254XXXXXXXXX)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                  placeholder="2547XXXXXXXX"
                  className="w-full rounded-md border border-slate-300 px-10 py-2 pl-10"
                  disabled={mutation.isPending}
                  maxLength={12}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Format: 2547XXXXXXXX (Safaricom numbers only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max={balanceNum}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-4 py-2"
                disabled={mutation.isPending}
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum: {formatKES(currentBalance)}
              </p>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || !isAmountValid || phoneNumber.length !== 12}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Pay {formatKES(amount)} via M-Pesa
            </button>
          </form>
        )}

        {checkoutRequestId && !isPolling && !mutation.isPending && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">STK Push initiated successfully</span>
            </div>
            <p className="mt-1 text-sm">
              Checkout Request ID: <code className="break-all">{checkoutRequestId}</code>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}