export interface AdminSecurityStatus {
  twoFactorEnabled: boolean;
}

export interface AdminIdentity {
  username: string;
  csrfToken: string;
}

export interface AdminActionBinding {
  action: string;
  target: string;
  payload: unknown;
  /** Local display data only — it is deliberately never sent to the server. */
  confirmation?: { before: string; after: string };
}

export interface AdminEnrolment {
  challenge: string;
  otpauthUri: string;
  manualKey: string;
}

export interface AdminActivation {
  csrfToken: string;
  recoveryCodes: string[];
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type StepUpHandler = (binding?: AdminActionBinding) => Promise<string | null>;
type ActionBindingResolver = (path: string, init?: RequestInit) => AdminActionBinding | undefined | Promise<AdminActionBinding | undefined>;

const ADMIN_SECRET_KEY = "_adm_s";
const AUTH_PATHS = [
  "/api/admin/security/status",
  "/api/admin/security/enable/start",
  "/api/admin/security/enable/confirm",
  "/api/admin/auth/login",
  "/api/admin/auth/verify",
];

export class AdminSessionExpiredError extends Error {
  constructor() {
    super("Your admin session has expired.");
    this.name = "AdminSessionExpiredError";
  }
}

export class AdminApiError extends Error {
  constructor(public response: Response, public body: unknown) {
    super(errorMessage(body, response.status));
    this.name = "AdminApiError";
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return `Admin request failed (${status})`;
}

async function responseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return null;
  return response.clone().json().catch(() => null);
}

function isMutation(method?: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

export class AdminAuthController {
  twoFactorEnabled: boolean | null = null;
  csrfToken = "";
  username = "";
  onSessionExpired?: () => void;
  private secret = "";
  private stepUpHandler?: StepUpHandler;
  private readonly confirmationByAction = new Map<string, { before: string; after: string }>();
  private uninstallInterceptor?: () => void;
  private actionBindingResolver?: ActionBindingResolver;
  private readonly fetcher: Fetcher;

  constructor(
    fetcher: Fetcher | undefined = undefined,
    private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
      typeof sessionStorage === "undefined" ? null : sessionStorage,
  ) {
    this.fetcher = fetcher ?? globalThis.fetch.bind(globalThis);
  }

  setMode(enabled: boolean): void {
    this.twoFactorEnabled = enabled;
    if (enabled) this.clearSecret();
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token;
  }

  setStepUpHandler(handler: StepUpHandler): void {
    this.stepUpHandler = handler;
  }

  setActionConfirmation(action: string, target: string, confirmation: { before: string; after: string }): void {
    this.confirmationByAction.set(`${action}:${target}`, confirmation);
  }

  /** Allows an impersonating admin surface to supply its server-exact binding. */
  setActionBindingResolver(resolver?: ActionBindingResolver): void {
    this.actionBindingResolver = resolver;
  }

  get disabledModeSecret(): string {
    return this.secret || this.storage?.getItem(ADMIN_SECRET_KEY) || "";
  }

  async initialize(): Promise<AdminSecurityStatus> {
    const response = await this.fetcher("/api/admin/security/status", { credentials: "include" });
    const status = await this.requireJson<AdminSecurityStatus>(response);
    this.setMode(status.twoFactorEnabled);
    if (!status.twoFactorEnabled) this.secret = this.storage?.getItem(ADMIN_SECRET_KEY) ?? "";
    return status;
  }

  async loginWithSecret(secret: string): Promise<void> {
    if (this.twoFactorEnabled !== false) throw new Error("Shared-secret login is unavailable");
    const response = await this.fetcher("/api/admin/auth-check", {
      headers: { "x-admin-secret": secret },
      credentials: "omit",
    });
    if (!response.ok) throw new AdminApiError(response, await responseBody(response));
    this.secret = secret;
    this.storage?.setItem(ADMIN_SECRET_KEY, secret);
  }

  async login(username: string, password: string): Promise<string> {
    const result = await this.authJson<{ challenge: string }>("/api/admin/auth/login", { username, password });
    return result.challenge;
  }

  async verify(challenge: string, factor: { code: string } | { recoveryCode: string }): Promise<AdminIdentity> {
    const identity = await this.authJson<AdminIdentity>("/api/admin/auth/verify", { challenge, ...factor });
    this.csrfToken = identity.csrfToken;
    return identity;
  }

  async restoreSession(): Promise<AdminIdentity> {
    const response = await this.fetcher("/api/admin/auth/me", { credentials: "include" });
    if (response.status === 401) return this.expired();
    const identity = await this.requireJson<AdminIdentity>(response);
    this.username = identity.username;
    this.csrfToken = identity.csrfToken;
    return identity;
  }

  async startEnable(adminSecret: string, username: string, password: string): Promise<AdminEnrolment> {
    return this.authJson("/api/admin/security/enable/start", { adminSecret, username, password });
  }

  async confirmEnable(challenge: string, code: string): Promise<AdminActivation> {
    const activation = await this.authJson<AdminActivation>("/api/admin/security/enable/confirm", {
      challenge, code, confirmActivation: true,
    });
    this.setMode(true);
    this.csrfToken = activation.csrfToken;
    return activation;
  }

  async logout(): Promise<void> {
    if (this.twoFactorEnabled && this.csrfToken) {
      await this.request("/admin/auth/logout", { method: "POST" }, undefined, false);
    }
    this.clear();
  }

  async disable(): Promise<void> {
    await this.request("/admin/security/disable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }, {
      action: "admin.security.disable", target: "admin-security", payload: null,
      confirmation: { before: "2FA enabled", after: "2FA disabled; all named admin sessions revoked" },
    });
    this.clear();
    this.twoFactorEnabled = false;
  }

  async request(
    path: string,
    init: RequestInit = {},
    binding?: AdminActionBinding,
    allowStepUp = true,
  ): Promise<Response> {
    if (binding && !binding.confirmation) {
      binding = { ...binding, confirmation: this.confirmationByAction.get(`${binding.action}:${binding.target}`) };
    }
    const url = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
    const prepared = this.prepare(init);
    if (binding) {
      const assertion = await this.stepUp(binding);
      if (!assertion) return new Response(JSON.stringify({ error: "step_up_cancelled" }), { status: 403 });
      prepared.headers = new Headers(prepared.headers);
      prepared.headers.set("x-admin-action-assertion", assertion);
    }
    const response = await this.fetcher(url, prepared);
    const body = await responseBody(response);
    if (response.status === 401 && this.twoFactorEnabled &&
      body && typeof body === "object" && "error" in body &&
      (body.error === "admin_session_expired" || body.error === "Unauthorized")) return this.expired();
    if (response.status === 403 && allowStepUp && body && typeof body === "object" &&
      "error" in body && body.error === "step_up_required") {
      const assertion = await this.stepUp(binding);
      if (!assertion && binding) return response;
      const retry = this.prepare(init);
      if (assertion) {
        retry.headers = new Headers(retry.headers);
        retry.headers.set("x-admin-action-assertion", assertion);
      }
      const retried = await this.fetcher(url, retry);
      const retryBody = await responseBody(retried);
      if (retried.status === 401 && retryBody && typeof retryBody === "object" &&
        "error" in retryBody && (retryBody.error === "admin_session_expired" || retryBody.error === "Unauthorized")) {
        return this.expired();
      }
      return retried;
    }
    return response;
  }

  installFetchInterceptor(target: typeof globalThis = globalThis): () => void {
    this.uninstallInterceptor?.();
    const original = target.fetch.bind(target);
    const controller = this;
    target.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const pathname = new URL(url, typeof location === "undefined" ? "http://localhost" : location.origin).pathname;
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      const carriesAdminIdentity = headers.has("x-admin-secret") || headers.has("x-impersonate-username");
      const knownAdminAlternative = /^\/api\/(?:intl-shipping)(?:\/|$)/.test(pathname) && carriesAdminIdentity;
      if ((!pathname.startsWith("/api/admin/") && !carriesAdminIdentity && !knownAdminAlternative) || AUTH_PATHS.includes(pathname)) {
        return original(input, init);
      }
      const effectiveInit = { ...init, headers };
      const binding = await controller.actionBindingResolver?.(pathname, effectiveInit) ?? await inferActionBinding(pathname, effectiveInit);
      if (binding) binding.confirmation = controller.confirmationByAction.get(`${binding.action}:${binding.target}`);
      return controller.request(pathname + new URL(url, "http://localhost").search, effectiveInit, binding);
    }) as typeof fetch;
    const uninstall = () => {
      target.fetch = original as typeof fetch;
      if (this.uninstallInterceptor === uninstall) this.uninstallInterceptor = undefined;
    };
    this.uninstallInterceptor = uninstall;
    return uninstall;
  }

  clear(): void {
    this.username = "";
    this.csrfToken = "";
    this.clearSecret();
  }

  private prepare(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers);
    if (this.twoFactorEnabled) {
      headers.delete("x-admin-secret");
      if (isMutation(init.method) && this.csrfToken) headers.set("x-admin-csrf", this.csrfToken);
      return { ...init, headers, credentials: "include" };
    }
    const secret = this.disabledModeSecret;
    if (secret) headers.set("x-admin-secret", secret);
    return { ...init, headers, credentials: "omit" };
  }

  private async stepUp(binding?: AdminActionBinding): Promise<string | null> {
    const code = await this.stepUpHandler?.(binding);
    if (!code) return null;
    const result = await this.authJson<{ ok: true; assertion?: string }>("/api/admin/auth/step-up", {
      code, action: binding?.action, target: binding?.target, payload: binding?.payload,
    }, true);
    return result.assertion ?? "";
  }

  private async authJson<T>(url: string, body: unknown, csrf = false): Promise<T> {
    const headers = new Headers({ "content-type": "application/json" });
    if (csrf && this.csrfToken) headers.set("x-admin-csrf", this.csrfToken);
    const response = await this.fetcher(url, {
      method: "POST", credentials: "include", headers, body: JSON.stringify(body),
    });
    const result = await responseBody(response);
    if (response.status === 401 && this.twoFactorEnabled && result && typeof result === "object" &&
      "error" in result && result.error === "admin_session_expired") {
      return this.expired();
    }
    if (!response.ok) throw new AdminApiError(response, result);
    return result as T;
  }

  private async requireJson<T>(response: Response): Promise<T> {
    const body = await responseBody(response);
    if (!response.ok) throw new AdminApiError(response, body);
    return body as T;
  }

  private expired(): never {
    this.clear();
    this.uninstallInterceptor?.();
    this.onSessionExpired?.();
    throw new AdminSessionExpiredError();
  }

  private clearSecret(): void {
    this.secret = "";
    this.storage?.removeItem(ADMIN_SECRET_KEY);
  }
}

async function inferActionBinding(path: string, init?: RequestInit): Promise<AdminActionBinding | undefined> {
  if (!isMutation(init?.method)) return undefined;
  let body: any = null;
  try { body = typeof init?.body === "string" ? JSON.parse(init.body) : null; } catch { return undefined; }
  if (path === "/api/admin/wallet-address" && typeof body?.walletAddress === "string") {
    return { action: "wallet.address.update", target: "wallet.primary", payload: { walletAddress: body.walletAddress.trim() } };
  }
  if (path === "/api/admin/chain-wallets") {
    const payload = Object.fromEntries(Object.entries(body ?? {}).map(([key, value]) =>
      [key, typeof value === "string" ? value.trim() : ""]));
    return { action: "wallet.chain.update", target: "wallet.chain", payload };
  }
  if (path === "/api/admin/wallet-change-code" && typeof body?.newCode === "string") {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.newCode.trim()));
    const newCodeHash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
    return { action: "wallet.change-code.update", target: "wallet.change-code", payload: { newCodeHash } };
  }
  return undefined;
}

export const adminAuth = new AdminAuthController();