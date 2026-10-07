import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import { performSignet, SignetError, type SignetOperation } from './index';

export type SignetClientConfig = {
  endpoint: string;
  onUnauthenticated: () => void;
  token: () => string | null;
};

const SignetClientContext = createContext<SignetClientConfig | null>(null);

const defaultInvalidateKeys: readonly (readonly unknown[])[] = [['profile']];

/** Holds the Signet endpoint and the logout used when a call returns 401. */
export const SignetClientProvider = ({
  children,
  endpoint,
  onUnauthenticated,
  token,
}: SignetClientConfig & { children: ReactNode }) => {
  const value = useMemo(
    () => ({ endpoint, onUnauthenticated, token }),
    [endpoint, onUnauthenticated, token],
  );

  return createElement(SignetClientContext.Provider, { value }, children);
};

const useSignetClient = (): SignetClientConfig => {
  const config = useContext(SignetClientContext);

  if (!config) throw new Error('SignetClientProvider is required');

  return config;
};

const readSignet = async <T,>(config: SignetClientConfig, operation: SignetOperation): Promise<T> => {
  const token = config.token() ?? '';
  const result = await performSignet<T>({
    credentials: 'include',
    endpoint: config.endpoint,
    operation,
    token,
  });

  if (result.status === 401) config.onUnauthenticated();

  if (!result.ok) throw new SignetError(result.status);

  return result.body;
};

/** Prefix every Signet React Query key so product caches stay isolated. */
export const signetQueryKey = (...key: readonly unknown[]): readonly unknown[] => ['signet', ...key];

const invalidateSignetKeys = async (
  queryClient: ReturnType<typeof useQueryClient>,
  keys: readonly (readonly unknown[])[] | undefined,
): Promise<void> => {
  if (!keys || keys.length === 0) return;

  await Promise.all(
    keys.map((key) => queryClient.invalidateQueries({ queryKey: signetQueryKey(...key) })),
  );
};

export type UseSignetMutationOptions<TData = unknown> = {
  /** Query key suffixes under `['signet', ...]`. Defaults to `[['profile']]` (directory / orgs). */
  invalidateKeys?: readonly (readonly unknown[])[];
  /** Invalidate these keys when the write fails (e.g. stale member lists). */
  invalidateOnErrorKeys?: readonly (readonly unknown[])[];
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
};

/** Cached Signet read. The surrounding QueryClient decides how long the result stays fresh. */
export const useSignetQuery = <T,>(key: readonly unknown[], operation: SignetOperation, enabled = true) => {
  const config = useSignetClient();

  return useQuery({
    enabled,
    queryKey: signetQueryKey(...key),
    queryFn: () => readSignet<T>(config, operation),
  });
};

/** Same cache as useSignetQuery. Suspend inside the page frame so the shell stays on screen. */
export const useSignetSuspenseQuery = <T,>(key: readonly unknown[], operation: SignetOperation) => {
  const config = useSignetClient();

  return useSuspenseQuery({
    queryKey: signetQueryKey(...key),
    queryFn: () => readSignet<T>(config, operation),
  });
};

/**
 * Writes to Signet, invalidates React Query caches, then runs optional callbacks.
 * Default invalidation refreshes the directory profile (organisations list).
 */
export const useSignetMutation = <TData = unknown>(
  options: UseSignetMutationOptions<TData> = {},
): (<T = TData>(operation: SignetOperation) => Promise<T>) => {
  const config = useSignetClient();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);

  optionsRef.current = options;

  return useCallback(
    async <T = TData>(operation: SignetOperation) => {
      const {
        invalidateKeys = defaultInvalidateKeys,
        invalidateOnErrorKeys,
        onSuccess,
        onError,
      } = optionsRef.current;

      try {
        const data = await readSignet<T>(config, operation);

        await invalidateSignetKeys(queryClient, invalidateKeys);
        onSuccess?.(data as TData);

        return data;
      } catch (error) {
        await invalidateSignetKeys(queryClient, invalidateOnErrorKeys);
        onError?.(error);

        throw error;
      }
    },
    [config, queryClient],
  );
};

/**
 * TanStack `useMutation` wrapper when you need `isPending` / `mutateAsync` instead of a bare function.
 */
export const useSignetMutationState = <TData = unknown>(
  options: UseSignetMutationOptions<TData> = {},
) => {
  const config = useSignetClient();
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);

  optionsRef.current = options;

  return useMutation({
    mutationFn: (operation: SignetOperation) => readSignet<TData>(config, operation),
    onSuccess: async (data) => {
      const { invalidateKeys = defaultInvalidateKeys, onSuccess } = optionsRef.current;

      await invalidateSignetKeys(queryClient, invalidateKeys);
      onSuccess?.(data);
    },
    onError: async (error) => {
      const { invalidateOnErrorKeys, onError } = optionsRef.current;

      await invalidateSignetKeys(queryClient, invalidateOnErrorKeys);
      onError?.(error);
    },
  });
};
