import { CombinedGraphQLErrors } from "@apollo/client/errors";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Only GraphQL errors returned by our own backend are safe to show verbatim
 * (e.g. "Task not found", "Awakening from a slumber, one moment…") — network
 * errors, timeouts, and raw HTTP status codes get collapsed into `fallback`
 * instead. The backend never sends internal validation text to the client;
 * whatever message it returns is already user-facing.
 */
export function friendlyErrorMessage(error: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || fallback;
  }
  return fallback;
}
