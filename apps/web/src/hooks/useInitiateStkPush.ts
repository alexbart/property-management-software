import { useMutation } from "@tanstack/react-query";
import { InitiateStkPushDto, StkPushResponseDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

export function useInitiateStkPush() {
  return useMutation({
    mutationFn: (data: InitiateStkPushDto) =>
      apiClient<StkPushResponseDto>("/api/v1/finance/payments/stk-push", {
        method: "POST",
        body: JSON.stringify(data),
        schema: StkPushResponseDto,
      }),
  });
}