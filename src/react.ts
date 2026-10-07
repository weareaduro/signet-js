import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createContext, createElement, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { performSignet, SignetError, type SignetOperation } from './index';

export type SignetClientConfig = {
  endpoint: string;
  onUnauthenticated: () => void;
  token: () => string | null;
};

const SignetClientContext = createContext<SignetClientConfig | null>(null);

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

/** Cached Signet read. The surrounding QueryClient decides how long the result stays fresh. */
export const useSignetQuery = <T,>(key: readonly unknown[], operation: SignetOperation, enabled = true) => {
  const config = useSignetClient();

  return useQuery({
    enabled,
    queryKey: ['signet', ...key],
    queryFn: () => readSignet<T>(config, operation),
  });
};

/** Same cache as useSignetQuery. Suspend inside the page frame so the shell stays on screen. */
export const useSignetSuspenseQuery = <T,>(key: readonly unknown[], operation: SignetOperation) => {
  const config = useSignetClient();

  return useSuspenseQuery({
    queryKey: ['signet', ...key],
    queryFn: () => readSignet<T>(config, operation),
  });
};

/** Writes to Signet and logs out when the response is 401. */
export const useSignetMutation = (): (<T>(operation: SignetOperation) => Promise<T>) => {
  const config = useSignetClient();

  return useCallback(
    <T,>(operation: SignetOperation) => readSignet<T>(config, operation),
    [config],
  ) as <T>(operation: SignetOperation) => Promise<T>;
};
