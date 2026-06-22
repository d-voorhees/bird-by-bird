import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const serverGraphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://127.0.0.1:8000/graphql/";

const browserGraphqlUrl = "/graphql";

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
  return new ApolloClient({
    link: new HttpLink({
      uri,
      credentials: "include",
      fetch: fetchWithTimeout,
    }),
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

export { browserGraphqlUrl, serverGraphqlUrl as graphqlUrl, REQUEST_TIMEOUT_MS };
