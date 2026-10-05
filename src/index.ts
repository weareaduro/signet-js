export class SignetError extends Error {
  constructor(readonly status: number) {
    super('request_failed');
  }
}

export type SignetOperation = {
  body?: unknown;
  form?: Record<string, string>;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  path: string;
};

export type SignetResult<T> = {
  body: T;
  ok: boolean;
  status: number;
};

const originOf = (endpoint: string): string => endpoint.replace(/\/$/, '');

const search = (params: Record<string, string | string[] | undefined>): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;

    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else {
      query.set(key, value);
    }
  }

  const text = query.toString();

  return text === '' ? '' : `?${text}`;
};

const operation = (
  path: string,
  extra?: { body?: unknown; form?: Record<string, string>; method?: SignetOperation['method'] },
): SignetOperation => ({
  path,
  ...(extra?.method ? { method: extra.method } : {}),
  ...(extra?.body !== undefined ? { body: extra.body } : {}),
  ...(extra?.form ? { form: extra.form } : {}),
});

export const signetConnectUrl = ({
  endpoint,
  provider,
  returnTo,
}: {
  endpoint: string;
  provider: string;
  returnTo?: string;
}): string => {
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : '';

  return `${originOf(endpoint)}/connect/${provider}${query}`;
};

export const signet = {
  acceptInvitation: ({ password, token }: { password: string; token: string }): SignetOperation =>
    operation('/api/resources/invitations/accept', { method: 'POST', body: { password, token } }),

  addMember: ({
    client,
    email,
    firstName,
    lastName,
    organisationId,
    role,
  }: {
    client?: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    organisationId: string;
    role?: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/members${search({ client })}`, {
      method: 'POST',
      body: {
        email,
        ...(client ? { client } : {}),
        ...(firstName != null ? { firstName } : {}),
        ...(lastName != null ? { lastName } : {}),
        ...(role ? { role } : {}),
      },
    }),

  assignRoleClaim: ({
    claim,
    client,
    role,
  }: {
    claim: string;
    client: string;
    role: string;
  }): SignetOperation => operation('/api/resources/role-claims', { method: 'PUT', body: { claim, client, role } }),

  authorizationCode: ({
    clientId,
    code,
    codeVerifier,
    redirectUri,
  }: {
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: {
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
    }),

  billingStripe: (): SignetOperation => operation('/api/resources/billing/stripe'),

  cancelSubscription: ({ when }: { when: 'now' | 'period_end' }): SignetOperation =>
    operation('/api/resources/tenants/current/subscription/cancel', { method: 'POST', body: { when } }),

  clientCredentials: ({
    clientId,
    clientSecret,
    tenantId,
  }: {
    clientId: string;
    clientSecret: string;
    tenantId?: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    }),

  confirmForgotPassword: ({
    clientId,
    code,
    email,
    password,
  }: {
    clientId: string;
    code: string;
    email: string;
    password: string;
  }): SignetOperation =>
    operation('/oauth/forgot-password/confirm', {
      method: 'POST',
      body: { client_id: clientId, code, email, password },
    }),

  confirmTenantSubscription: ({
    sessionId,
    tenantId,
  }: {
    sessionId: string;
    tenantId: string;
  }): SignetOperation =>
    operation(`/api/resources/tenants/${tenantId}/subscription`, { method: 'POST', body: { sessionId } }),

  createOrganisation: (body: { name: string } & Record<string, unknown>): SignetOperation =>
    operation('/api/resources/organisations', { method: 'POST', body }),

  organisationTerms: ({
    client,
    organisationId,
  }: {
    client?: string;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/terms${client ? `?client=${encodeURIComponent(client)}` : ''}`),

  patchOrganisationTerms: ({
    body,
    organisationId,
    termsId,
  }: {
    body: Record<string, unknown>;
    organisationId: string;
    termsId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/terms/${termsId}`, { method: 'PATCH', body }),

  tenantTerms: ({ client }: { client?: string } = {}): SignetOperation =>
    operation(`/api/resources/tenants/current/terms${client ? `?client=${encodeURIComponent(client)}` : ''}`),

  tenantMsa: (): SignetOperation => operation('/api/resources/tenants/current/msa'),

  createTenant: (body: {
    billingAddressLine1: string;
    billingCity: string;
    billingPostcode: string;
    name: string;
    returnUrl: string;
  }): SignetOperation => operation('/api/resources/tenants', { method: 'POST', body }),

  createUser: (body: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    status?: string;
  }): SignetOperation => operation('/api/resources/users', { method: 'POST', body }),

  deleteIntegration: ({ provider }: { provider: string }): SignetOperation =>
    operation(`/api/resources/tenants/current/integrations/${provider}`, { method: 'DELETE' }),

  deleteConnection: ({ provider }: { provider: string }): SignetOperation =>
    operation(`/oauth/connections/${provider}`, { method: 'DELETE' }),

  deleteOrganisation: ({ organisationId }: { organisationId: string }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}`, { method: 'DELETE' }),

  deletePaymentMethod: ({
    organisationId,
    paymentMethodId,
  }: {
    organisationId: string;
    paymentMethodId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    }),

  deleteUser: ({ clientId, email }: { clientId: string; email: string }): SignetOperation =>
    operation('/oauth/delete', { method: 'POST', body: { client_id: clientId, email } }),

  forgotPassword: ({ clientId, email }: { clientId: string; email: string }): SignetOperation =>
    operation('/oauth/forgot-password', { method: 'POST', body: { client_id: clientId, email } }),

  invoices: ({
    client,
    organisationId,
    tenant,
  }: {
    client?: string;
    organisationId?: string;
    tenant?: boolean;
  }): SignetOperation =>
    operation(
      tenant
        ? '/api/resources/tenants/current/invoices'
        : `/api/resources/organisations/${organisationId ?? ''}/invoices${search({ client })}`,
    ),

  listMembers: ({
    client,
    organisationId,
  }: {
    client?: string;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/members${search({ client })}`),

  listOrganisations: (): SignetOperation => operation('/api/resources/organisations'),

  listRoles: ({ client, organisationId }: { client: string; organisationId?: string }): SignetOperation =>
    operation(`/api/resources/roles${search({ client, organisation: organisationId })}`),

  listIntegrations: (): SignetOperation => operation('/api/resources/tenants/current/integrations'),

  saveIntegration: ({
    body,
    provider,
  }: {
    body: Record<string, unknown>;
    provider: string;
  }): SignetOperation =>
    operation(`/api/resources/tenants/current/integrations/${provider}`, { method: 'PUT', body }),

  tenantSubscription: (): SignetOperation => operation('/api/resources/tenants/current/subscription'),

  listTenants: (): SignetOperation => operation('/api/resources/tenants'),

  listTransactions: ({
    organisationId,
    query,
  }: {
    organisationId: string;
    query: Record<string, string | string[] | undefined>;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/transactions${search(query)}`),

  listUsers: (query: Record<string, string | string[] | undefined>): SignetOperation =>
    operation(`/api/resources/users${search(query)}`),

  logout: ({ clientId, subject }: { clientId: string; subject: string }): SignetOperation =>
    operation('/oauth/logout', { method: 'POST', body: { client_id: clientId, subject } }),

  organisationBalance: ({
    client,
    organisationId,
  }: {
    client: string;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/transactions/balance${search({ client })}`),

  passwordGrant: ({
    clientId,
    password,
    username,
  }: {
    clientId: string;
    password: string;
    username: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: { client_id: clientId, grant_type: 'password', password, username },
    }),

  paymentIntent: (body: {
    amount: number;
    client: string;
    currency: string;
    customerId: string;
    description?: string;
    organisation: string;
    paymentMethodId: string;
  }): SignetOperation => operation('/api/resources/payment-intents', { method: 'POST', body }),

  paymentMethods: ({
    organisationId,
    tenant,
  }: {
    organisationId?: string;
    tenant?: boolean;
  }): SignetOperation =>
    operation(
      tenant
        ? '/api/resources/tenants/current/payment-methods'
        : `/api/resources/organisations/${organisationId ?? ''}/payment-methods`,
    ),

  providerGrant: ({
    clientId,
    clientSecret,
    email,
    grantType,
    provider,
    subject,
    tenantId,
  }: {
    clientId: string;
    clientSecret: string;
    email?: string;
    grantType: 'provider' | 'provider_revoke';
    provider: string;
    subject?: string;
    tenantId?: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
        provider,
        ...(email ? { email } : {}),
        ...(subject ? { subject } : {}),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    }),

  providers: (): SignetOperation => operation('/oauth/providers'),

  readMe: (): SignetOperation => operation('/api/resources/users/me'),

  readOrganisation: ({ organisationId }: { organisationId: string }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}`),

  readUser: ({ userUuid }: { userUuid: string }): SignetOperation =>
    operation(`/api/resources/users/${userUuid}`),

  recordTransaction: ({
    organisationId,
    body,
  }: {
    body: Record<string, unknown>;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/transactions`, { method: 'POST', body }),

  refreshToken: ({
    clientId,
    refreshToken,
  }: {
    clientId: string;
    refreshToken?: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: {
        client_id: clientId,
        grant_type: 'refresh_token',
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      },
    }),

  register: ({
    clientId,
    email,
    password,
  }: {
    clientId: string;
    email: string;
    password: string;
  }): SignetOperation => operation('/oauth/register', { method: 'POST', body: { client_id: clientId, email, password } }),

  removeMember: ({
    client,
    organisationId,
    userUuid,
  }: {
    client?: string;
    organisationId: string;
    userUuid: string;
  }): SignetOperation =>
    operation(
      `/api/resources/organisations/${organisationId}/members/${userUuid}${search({ client })}`,
      { method: 'DELETE' },
    ),

  removeRoleClaim: ({
    claim,
    client,
    role,
  }: {
    claim: string;
    client: string;
    role: string;
  }): SignetOperation => operation('/api/resources/role-claims', { method: 'DELETE', body: { claim, client, role } }),

  resendInvitation: ({ userUuid }: { userUuid: string }): SignetOperation =>
    operation(`/api/resources/users/${userUuid}/invitation`, { method: 'POST' }),

  raiseInvoice: ({
    organisationId,
    body,
  }: {
    body: Record<string, unknown>;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/invoices`, { method: 'POST', body }),

  selectTenant: ({ uuid }: { uuid: string }): SignetOperation =>
    operation('/api/resources/tenants/select', { method: 'POST', body: { uuid } }),

  setDefaultPaymentMethod: ({
    organisationId,
    paymentMethodId,
  }: {
    organisationId: string;
    paymentMethodId: string;
  }): SignetOperation =>
    operation(
      `/api/resources/organisations/${organisationId}/payment-methods/${paymentMethodId}/default`,
      { method: 'POST' },
    ),

  setPassword: ({
    clientId,
    email,
    password,
  }: {
    clientId: string;
    email: string;
    password: string;
  }): SignetOperation => operation('/oauth/password', { method: 'POST', body: { client_id: clientId, email, password } }),

  setupIntent: ({ organisationId }: { organisationId: string }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/payment-methods/setup-intent`, { method: 'POST' }),

  slackBot: ({
    clientId,
    clientSecret,
    tenantId,
  }: {
    clientId: string;
    clientSecret: string;
    tenantId?: string;
  }): SignetOperation =>
    operation('/oauth/token', {
      method: 'POST',
      form: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'slack_bot',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    }),

  stripeProxy: ({
    form,
    method,
    path,
  }: {
    form?: Record<string, string>;
    method: 'DELETE' | 'GET' | 'POST';
    path: string;
  }): SignetOperation => operation('/api/resources/stripe', { method: 'POST', body: { form, method, path } }),

  updateBilling: ({
    organisationId,
    body,
  }: {
    body: Record<string, unknown>;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/billing`, { method: 'PATCH', body }),

  updateDirectoryUser: ({
    clientId,
    email,
    subject,
  }: {
    clientId: string;
    email: string;
    subject: string;
  }): SignetOperation => operation('/oauth/user', { method: 'POST', body: { client_id: clientId, email, subject } }),

  updateMe: (body: Record<string, unknown>): SignetOperation =>
    operation('/api/resources/users/me', { method: 'PATCH', body }),

  updateMember: ({
    client,
    organisationId,
    role,
    userUuid,
  }: {
    client?: string;
    organisationId: string;
    role: string;
    userUuid: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}/members/${userUuid}${search({ client })}`, {
      method: 'PATCH',
      body: { ...(client ? { client } : {}), role },
    }),

  updateOrganisation: ({
    organisationId,
    body,
  }: {
    body: Record<string, unknown>;
    organisationId: string;
  }): SignetOperation =>
    operation(`/api/resources/organisations/${organisationId}`, { method: 'PATCH', body }),

  updateTenant: (body: Record<string, unknown>): SignetOperation =>
    operation('/api/resources/tenants/current', { method: 'PATCH', body }),

  updateUser: ({
    userUuid,
    body,
  }: {
    body: Record<string, unknown>;
    userUuid: string;
  }): SignetOperation => operation(`/api/resources/users/${userUuid}`, { method: 'PATCH', body }),

  userinfo: (): SignetOperation => operation('/oauth/userinfo'),
};

const readBody = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T;

  const text = await response.text();

  if (text === '') return undefined as T;

  return JSON.parse(text) as T;
};

export const performSignet = async <T>({
  credentials,
  endpoint,
  operation: request,
  tenantId,
  token,
}: {
  credentials?: 'include' | 'omit' | 'same-origin';
  endpoint: string;
  operation: SignetOperation;
  tenantId?: string;
  token?: string;
}): Promise<SignetResult<T>> => {
  const headers = new Headers();

  headers.set('accept', 'application/json');

  if (token) headers.set('authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);

  if (tenantId) headers.set('cookie', `signet-tenant=${encodeURIComponent(tenantId)}`);

  let body: string | URLSearchParams | undefined;

  if (request.form) {
    headers.set('content-type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(request.form);
  } else if (request.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(request.body);
  }

  const response = await fetch(`${originOf(endpoint)}${request.path}`, {
    method: request.method ?? 'GET',
    headers,
    ...(body !== undefined ? { body } : {}),
    ...(credentials ? { credentials } : {}),
  });
  let parsed: T;

  try {
    parsed = await readBody<T>(response);
  } catch {
    parsed = {} as T;
  }

  return { body: parsed, ok: response.ok, status: response.status };
};

export const signetJson = async <T>(
  endpoint: string,
  token: string,
  request: SignetOperation,
): Promise<T> => {
  const result = await performSignet<T>({
    credentials: 'include',
    endpoint,
    operation: request,
    token,
  });

  if (!result.ok) throw new SignetError(result.status);

  return result.body;
};
