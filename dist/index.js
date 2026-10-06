// src/index.ts
var SignetError = class extends Error {
  constructor(status) {
    super("request_failed");
    this.status = status;
  }
  status;
};
var originOf = (endpoint) => endpoint.replace(/\/$/, "");
var search = (params) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text === "" ? "" : `?${text}`;
};
var operation = (path, extra) => ({
  path,
  ...extra?.method ? { method: extra.method } : {},
  ...extra?.body !== void 0 ? { body: extra.body } : {},
  ...extra?.form ? { form: extra.form } : {}
});
var signetConnectUrl = ({
  endpoint,
  provider,
  returnTo
}) => {
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
  return `${originOf(endpoint)}/connect/${provider}${query}`;
};
var signet = {
  acceptInvitation: ({ password, token }) => operation("/api/resources/invitations/accept", { method: "POST", body: { password, token } }),
  addMember: ({
    client,
    email,
    firstName,
    lastName,
    organisationId,
    role
  }) => operation(`/api/resources/organisations/${organisationId}/members${search({ client_id: client })}`, {
    method: "POST",
    body: {
      email,
      ...client ? { client } : {},
      ...firstName != null ? { firstName } : {},
      ...lastName != null ? { lastName } : {},
      ...role ? { role } : {}
    }
  }),
  assignRoleClaim: ({
    claim,
    client,
    role
  }) => operation("/api/resources/role-claims", { method: "PUT", body: { claim, client, role } }),
  authorizationCode: ({
    clientId,
    code,
    codeVerifier,
    redirectUri
  }) => operation("/oauth/token", {
    method: "POST",
    form: {
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    }
  }),
  billingStripe: () => operation("/api/resources/billing/stripe"),
  cancelSubscription: ({ when }) => operation("/api/resources/tenants/current/subscription/cancel", { method: "POST", body: { when } }),
  clientCredentials: ({
    clientId,
    clientSecret,
    tenantId
  }) => operation("/oauth/token", {
    method: "POST",
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      ...tenantId ? { tenant_id: tenantId } : {}
    }
  }),
  confirmForgotPassword: ({
    clientId,
    code,
    email,
    password
  }) => operation("/oauth/forgot-password/confirm", {
    method: "POST",
    body: { client_id: clientId, code, email, password }
  }),
  confirmTenantSubscription: ({
    sessionId,
    tenantId
  }) => operation(`/api/resources/tenants/${tenantId}/subscription`, { method: "POST", body: { sessionId } }),
  createOrganisation: (body) => operation("/api/resources/organisations", { method: "POST", body }),
  organisationTerms: ({
    client,
    organisationId
  }) => operation(`/api/resources/organisations/${organisationId}/terms${search({ client_id: client })}`),
  patchOrganisationTerms: ({
    body,
    organisationId,
    termsId
  }) => operation(`/api/resources/organisations/${organisationId}/terms/${termsId}`, { method: "PATCH", body }),
  tenantTerms: ({ client } = {}) => operation(`/api/resources/tenants/current/terms${search({ client_id: client })}`),
  tenantMsa: () => operation("/api/resources/tenants/current/msa"),
  createTenant: (body) => operation("/api/resources/tenants", { method: "POST", body }),
  createUser: (body) => operation("/api/resources/users", { method: "POST", body }),
  deleteIntegration: ({ provider }) => operation(`/api/resources/tenants/current/integrations/${provider}`, { method: "DELETE" }),
  deleteConnection: ({ provider }) => operation(`/oauth/connections/${provider}`, { method: "DELETE" }),
  deleteOrganisation: ({ organisationId }) => operation(`/api/resources/organisations/${organisationId}`, { method: "DELETE" }),
  deletePaymentMethod: ({
    organisationId,
    paymentMethodId
  }) => operation(`/api/resources/organisations/${organisationId}/payment-methods/${paymentMethodId}`, {
    method: "DELETE"
  }),
  deleteUser: ({ clientId, email }) => operation("/oauth/delete", { method: "POST", body: { client_id: clientId, email } }),
  forgotPassword: ({ clientId, email }) => operation("/oauth/forgot-password", { method: "POST", body: { client_id: clientId, email } }),
  invoices: ({
    client,
    organisationId,
    tenant
  }) => operation(
    tenant ? "/api/resources/tenants/current/invoices" : `/api/resources/organisations/${organisationId ?? ""}/invoices${search({ client_id: client })}`
  ),
  listMembers: ({
    client,
    organisationId
  }) => operation(`/api/resources/organisations/${organisationId}/members${search({ client_id: client })}`),
  listOrganisations: () => operation("/api/resources/organisations"),
  listRoles: ({ client, organisationId }) => operation(`/api/resources/roles${search({ client_id: client, organisation: organisationId })}`),
  listIntegrations: () => operation("/api/resources/tenants/current/integrations"),
  saveIntegration: ({
    body,
    provider
  }) => operation(`/api/resources/tenants/current/integrations/${provider}`, { method: "PUT", body }),
  tenantSubscription: () => operation("/api/resources/tenants/current/subscription"),
  listTenants: () => operation("/api/resources/tenants"),
  listTransactions: ({
    organisationId,
    query
  }) => operation(`/api/resources/organisations/${organisationId}/transactions${search(query)}`),
  listUsers: (query) => operation(`/api/resources/users${search(query)}`),
  logout: ({ clientId, subject }) => operation("/oauth/logout", { method: "POST", body: { client_id: clientId, subject } }),
  organisationBalance: ({
    client,
    organisationId
  }) => operation(`/api/resources/organisations/${organisationId}/transactions/balance${search({ client_id: client })}`),
  passwordGrant: ({
    clientId,
    password,
    username
  }) => operation("/oauth/token", {
    method: "POST",
    form: { client_id: clientId, grant_type: "password", password, username }
  }),
  paymentIntent: (body) => operation("/api/resources/payment-intents", { method: "POST", body }),
  paymentMethods: ({
    organisationId,
    tenant
  }) => operation(
    tenant ? "/api/resources/tenants/current/payment-methods" : `/api/resources/organisations/${organisationId ?? ""}/payment-methods`
  ),
  providerGrant: ({
    clientId,
    clientSecret,
    email,
    grantType,
    provider,
    subject,
    tenantId
  }) => operation("/oauth/token", {
    method: "POST",
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType,
      provider,
      ...email ? { email } : {},
      ...subject ? { subject } : {},
      ...tenantId ? { tenant_id: tenantId } : {}
    }
  }),
  providers: ({ clientId } = {}) => operation(`/oauth/providers${search({ client_id: clientId })}`),
  readMe: () => operation("/api/resources/users/me"),
  readOrganisation: ({ organisationId }) => operation(`/api/resources/organisations/${organisationId}`),
  readUser: ({ userUuid }) => operation(`/api/resources/users/${userUuid}`),
  recordTransaction: ({
    organisationId,
    body
  }) => operation(`/api/resources/organisations/${organisationId}/transactions`, { method: "POST", body }),
  refreshToken: ({
    clientId,
    refreshToken
  }) => operation("/oauth/token", {
    method: "POST",
    form: {
      client_id: clientId,
      grant_type: "refresh_token",
      ...refreshToken ? { refresh_token: refreshToken } : {}
    }
  }),
  register: ({
    clientId,
    email,
    password
  }) => operation("/oauth/register", { method: "POST", body: { client_id: clientId, email, password } }),
  removeMember: ({
    client,
    organisationId,
    userUuid
  }) => operation(
    `/api/resources/organisations/${organisationId}/members/${userUuid}${search({ client_id: client })}`,
    { method: "DELETE" }
  ),
  removeRoleClaim: ({
    claim,
    client,
    role
  }) => operation("/api/resources/role-claims", { method: "DELETE", body: { claim, client, role } }),
  resendInvitation: ({ userUuid }) => operation(`/api/resources/users/${userUuid}/invitation`, { method: "POST" }),
  raiseInvoice: ({
    organisationId,
    body
  }) => operation(`/api/resources/organisations/${organisationId}/invoices`, { method: "POST", body }),
  selectTenant: ({ uuid }) => operation("/api/resources/tenants/select", { method: "POST", body: { uuid } }),
  setDefaultPaymentMethod: ({
    organisationId,
    paymentMethodId
  }) => operation(
    `/api/resources/organisations/${organisationId}/payment-methods/${paymentMethodId}/default`,
    { method: "POST" }
  ),
  setPassword: ({
    clientId,
    email,
    password
  }) => operation("/oauth/password", { method: "POST", body: { client_id: clientId, email, password } }),
  setupIntent: ({ organisationId }) => operation(`/api/resources/organisations/${organisationId}/payment-methods/setup-intent`, { method: "POST" }),
  slackBot: ({
    clientId,
    clientSecret,
    tenantId
  }) => operation("/oauth/token", {
    method: "POST",
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "slack_bot",
      ...tenantId ? { tenant_id: tenantId } : {}
    }
  }),
  stripeProxy: ({
    form,
    method,
    path
  }) => operation("/api/resources/stripe", { method: "POST", body: { form, method, path } }),
  updateBilling: ({
    organisationId,
    body
  }) => operation(`/api/resources/organisations/${organisationId}/billing`, { method: "PATCH", body }),
  updateDirectoryUser: ({
    clientId,
    email,
    subject
  }) => operation("/oauth/user", { method: "POST", body: { client_id: clientId, email, subject } }),
  updateMe: (body) => operation("/api/resources/users/me", { method: "PATCH", body }),
  updateMember: ({
    client,
    organisationId,
    role,
    userUuid
  }) => operation(`/api/resources/organisations/${organisationId}/members/${userUuid}${search({ client_id: client })}`, {
    method: "PATCH",
    body: { ...client ? { client } : {}, role }
  }),
  updateOrganisation: ({
    organisationId,
    body
  }) => operation(`/api/resources/organisations/${organisationId}`, { method: "PATCH", body }),
  updateTenant: (body) => operation("/api/resources/tenants/current", { method: "PATCH", body }),
  updateUser: ({
    userUuid,
    body
  }) => operation(`/api/resources/users/${userUuid}`, { method: "PATCH", body }),
  userinfo: () => operation("/oauth/userinfo")
};
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
var signetJson = async (endpoint, token, request) => {
  const result = await performSignet({
    credentials: "include",
    endpoint,
    operation: request,
    token
  });
  if (!result.ok) throw new SignetError(result.status);
  return result.body;
};
export {
  SignetError,
  performSignet,
  signet,
  signetConnectUrl,
  signetJson
};
