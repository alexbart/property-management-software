import { ApiError } from "../api-client";

/**
 * Map an unknown error to a user-facing message. Never exposes stack traces or
 * raw database errors.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "The request was invalid. Please check the form and try again.";
      case 401:
        return "You need to sign in to continue.";
      case 403:
        return "You do not have permission to perform this action.";
      case 404:
        return "The requested item could not be found.";
      case 409:
        return "This action conflicts with the current state. Please refresh and try again.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Something went wrong on the server. Please try again later.";
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}