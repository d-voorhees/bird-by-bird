import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ErrorLink, onError } from "@apollo/client/link/error";

const serverGraphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://127.0.0.1:8000/graphql/";

const browserGraphqlUrl = "/graphql";
const SESSION_LOST_EVENT = "bird:session-lost";

// Matches core.views.TRANSIENT_ERROR_CODE on the backend: masked errors
// caused by a dropped DB connection, safe to retry once without the user
// ever seeing them.
const TRANSIENT_ERROR_CODE = "TRANSIENT_ERROR";
const MAX_TRANSIENT_RETRIES = 1;

const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

function makeClient(uri: string) {
  const authErrorLink = onError(({ error }) => {
    if (typeof window === "undefined") return;
    const hasAuthError = CombinedGraphQLErrors.is(error)
      ? error.errors.some((graphQLError) => graphQLError.message === "Authentication required")
      : false;
    if (hasAuthError) {
      window.dispatchEvent(new CustomEvent(SESSION_LOST_EVENT));
    }
  });

  const transientRetryLink = new ErrorLink(({ error, operation, forward }) => {
    const isTransient = CombinedGraphQLErrors.is(error)
      ? error.errors.some((graphQLError) => graphQLError.extensions?.code === TRANSIENT_ERROR_CODE)
      : false;
    if (!isTransient) return;

    const retryCount = (operation.getContext().transientRetryCount as number | undefined) ?? 0;
    if (retryCount >= MAX_TRANSIENT_RETRIES) return;

    operation.setContext({ transientRetryCount: retryCount + 1 });
    return forward(operation);
  });

  const httpLink = new HttpLink({
    uri,
    credentials: "include",
    fetch: fetchWithTimeout,
  });

  return new ApolloClient({
    link: ApolloLink.from([transientRetryLink, authErrorLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
      },
      query: {
        fetchPolicy: "network-only",
      },
    },
  });
}

let browserClient: ApolloClient | undefined;

export function getApolloClient() {
  if (typeof window === "undefined") {
    return makeClient(serverGraphqlUrl);
  }
  if (!browserClient) {
    browserClient = makeClient(browserGraphqlUrl);
  }
  return browserClient;
}

export { browserGraphqlUrl, serverGraphqlUrl as graphqlUrl, REQUEST_TIMEOUT_MS, SESSION_LOST_EVENT };
