import { useState } from "react";
import { downloadFile } from "../lib/api-client";

/**
 * Trigger a payment receipt PDF download.
 */
export function useDownloadReceipt() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download(paymentId: string): Promise<void> {
    setIsDownloading(true);
    try {
      await downloadFile(
        `/api/v1/reporting/payments/${paymentId}/receipt.pdf`,
        `receipt-${paymentId}.pdf`,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return { download, isDownloading };
}