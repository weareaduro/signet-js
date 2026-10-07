// src/react.ts
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef
} from "react";

// src/index.ts
var SignetError = class extends Error {
  constructor(status) {
    super("request_failed");
    this.status = status;
  }
  status;
};
var originOf = (endpoint) => endpoint.replace(/\/$/, "");
var readBody = async (response) => {
  if (response.status === 204) return void 0;
  const text = await response.text();
  if (text === "") return void 0;
  return JSON.parse(text);
};
var performSignet = async ({
  credentials,
  endpoint,
  operation: request,
  tenantId,
  token
}) => {
  const headers = new Headers();
  headers.set("accept", "application/json");
  const hostname = globalThis.location?.hostname;
  if (token && (typeof hostname !== "string" || hostname.includes("localhost"))) {
    headers.set("authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
  }
  if (tenantId) headers.set("cookie", `signet-tenant=${encodeURIComponent(tenantId)}`);
  let body;
  if (request.form) {
    headers.set("content-type", "application/x-www-form-urlencoded");
    body = new URLSearchParams(request.form);
  } else if (request.body !== void 0) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(request.body);
  }
  const response = await fetch(`${originOf(endpoint)}${request.path}`, {
    method: request.method ?? "GET",
    headers,
    ...body !== void 0 ? { body } : {},
    ...credentials ? { credentials } : {}
  });
  let parsed;
  try {
    parsed = await readBody(response);
  } catch {
    parsed = {};
  }
  return { body: parsed, ok: response.ok, status: response.status };
};

// src/react.ts
var SignetClientContext = createContext(null);
var defaultInvalidateKeys = [["profile"]];
var SignetClientProvider = ({
  children,
  endpoint,
  onUnauthenticated,
  token
}) => {
  const value = useMemo(
    () => ({ endpoint, onUnauthenticated, token }),
    [endpoint, onUnauthenticated, token]
  );
  return createElement(SignetClientContext.Provider, { value }, children);
};
var useSignetClient = () => {
  const config = useContext(SignetClientContext);
  if (!config) throw new Error("SignetClientProvider is required");
  return config;
};
var readSignet = async (config, operation) => {
  const token = config.token() ?? "";
  const result = await performSignet({
    credentials: "include",
    endpoint: config.endpoint,
    operation,
    token
  });
  if (result.status === 401) config.onUnauthenticated();
  if (!result.ok) throw new SignetError(result.status);
  return result.body;
};
var signetQueryKey = (...key) => ["signet", ...key];
var invalidateSignetKeys = async (queryClient, keys) => {
  if (!keys || keys.length === 0) return;
  await Promise.all(
    keys.map((key) => queryClient.invalidateQueries({ queryKey: signetQueryKey(...key) }))
  );
};
var useSignetQuery = (key, operation, enabled = true) => {
  const config = useSignetClient();
  return useQuery({
    enabled,
    queryKey: signetQueryKey(...key),
    queryFn: () => readSignet(config, operation)
  });
};
var useSignetSuspenseQuery = (key, operation) => {
  const config = useSignetClient();
  return useSuspenseQuery({
    queryKey: signetQueryKey(...key),
    queryFn: () => readSignet(config, operation)
  });
};
var useSignetMutation = (options = {}) => {
  const config = useSignetClient();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  return useCallback(
    async (operation) => {
      const {
        invalidateKeys = defaultInvalidateKeys,
        invalidateOnErrorKeys,
        onSuccess,
        onError
      } = optionsRef.current;
      try {
        const data = await readSignet(config, operation);
        await invalidateSignetKeys(queryClient, invalidateKeys);
        onSuccess?.(data);
        return data;
      } catch (error) {
        await invalidateSignetKeys(queryClient, invalidateOnErrorKeys);
        onError?.(error);
        throw error;
      }
    },
    [config, queryClient]
  );
};
var useSignetMutationState = (options = {}) => {
  const config = useSignetClient();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  return useMutation({
    mutationFn: (operation) => readSignet(config, operation),
    onSuccess: async (data) => {
      const { invalidateKeys = defaultInvalidateKeys, onSuccess } = optionsRef.current;
      await invalidateSignetKeys(queryClient, invalidateKeys);
      onSuccess?.(data);
    },
    onError: async (error) => {
      const { invalidateOnErrorKeys, onError } = optionsRef.current;
      await invalidateSignetKeys(queryClient, invalidateOnErrorKeys);
      onError?.(error);
    }
  });
};
export {
  SignetClientProvider,
  signetQueryKey,
  useSignetMutation,
  useSignetMutationState,
  useSignetQuery,
  useSignetSuspenseQuery
};
