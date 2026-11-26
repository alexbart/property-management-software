import { useState } from "react";
import { downloadFile, resolvePropertyId } from "../lib/api-client";

/**
 * Trigger a rent roll CSV download for a property.
 *
 * File downloads cannot use `useQuery` (they are not JSON responses), so this
 * hook exposes a `download` trigger backed by `downloadFile`, which attaches
 * auth headers and saves the blob via a hidden anchor.
 */
export function useExportRentRoll() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download(propertyId?: string): Promise<void> {
    const target = propertyId ?? resolvePropertyId();
    setIsDownloading(true);
    try {
      await downloadFile(
        `/api/v1/reporting/properties/${target}/rent-roll.csv`,
        `rent-roll-${target}.csv`,
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return { download, isDownloading };
}