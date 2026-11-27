import { useState } from "react";
import { downloadFile, resolvePropertyId } from "../lib/api-client";

/**
 * Trigger a maintenance summary CSV download for a property within a date range.
 */
export function useExportMaintenanceCsv() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download(
    startDate: string,
    endDate: string,
    propertyId?: string,
  ): Promise<void> {
    const target = propertyId ?? resolvePropertyId();
    const params = new URLSearchParams({ startDate, endDate });
    setIsDownloading(true);
    try {
      await downloadFile(
        `/api/v1/reporting/properties/${target}/maintenance.csv?${params.toString()}`,
        `maintenance-${target}-${startDate}-to-${endDate}.csv`,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return { download, isDownloading };
}