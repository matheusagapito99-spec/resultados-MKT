/**
 * Cliente da API do Moskit CRM (V2).
 * Base: https://api.moskitcrm.com/v2  ·  Auth: header `apikey`.
 *
 * Paginação (confirmada na descoberta): por CURSOR via `?nextPageToken=<token>`.
 * `?page` é ignorado; página fixa de 10. O total vem em `x-moskit-listing-total`
 * e o próximo cursor em `x-moskit-listing-next-page-token`.
 * Rate limit: ~6/seg e 240/min → respeitamos ~3,5/seg + retry com backoff em 429/5xx.
 */
const DEFAULT_BASE_URL = "https://api.moskitcrm.com/v2";
const MIN_INTERVAL_MS = 280; // ~3,5 req/seg, abaixo do limite de 6/seg e 240/min

export interface MoskitClientOptions {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
}

export class MoskitError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "MoskitError";
  }
}

export interface ListResult<T> {
  data: T[];
  total: number;
  nextToken: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MoskitClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  /** Gate de rate limit: garante o intervalo mínimo entre requisições. */
  private gate: Promise<void> = Promise.resolve();

  constructor(opts: MoskitClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.MOSKIT_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MOSKIT_API_KEY não definida. Configure no .env.local (dev) ou no Vercel.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (
      opts.baseUrl ??
      process.env.MOSKIT_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, "");
    this.maxRetries = opts.maxRetries ?? 5;
  }

  /** Serializa as chamadas com intervalo mínimo (rate limit amigável). */
  private async throttle(): Promise<void> {
    const prev = this.gate;
    let release!: () => void;
    this.gate = new Promise((r) => (release = r));
    await prev;
    setTimeout(release, MIN_INTERVAL_MS);
  }

  private async request(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<{ json: unknown; headers: Headers }> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    let attempt = 0;
    for (;;) {
      await this.throttle();
      const res = await fetch(url, {
        headers: { apikey: this.apiKey, accept: "application/json" },
      });

      if (res.ok) return { json: await res.json(), headers: res.headers };

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        const resetSec =
          Number(res.headers.get("ratelimit-reset")) ||
          Number(res.headers.get("retry-after"));
        const wait = resetSec
          ? resetSec * 1000 + 100
          : Math.min(500 * 2 ** attempt, 8000);
        attempt += 1;
        await sleep(wait);
        continue;
      }

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      throw new MoskitError(
        `Moskit GET ${path} falhou (${res.status})`,
        res.status,
        body,
      );
    }
  }

  /** GET simples (objeto ou array, sem metadados de paginação). */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return (await this.request(path, params)).json as T;
  }

  /** Uma página de uma listagem, com total e cursor para a próxima. */
  async list<T = unknown>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<ListResult<T>> {
    const { json, headers } = await this.request(path, params);
    const data = (Array.isArray(json) ? json : []) as T[];
    return {
      data,
      total: Number(headers.get("x-moskit-listing-total")) || data.length,
      nextToken: headers.get("x-moskit-listing-next-page-token") || null,
    };
  }

  /** Itera TODAS as páginas de um recurso via cursor `nextPageToken`. */
  async *paginate<T = unknown>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): AsyncGenerator<T, void, unknown> {
    let token: string | null = null;
    let prev: string | null = null;
    for (;;) {
      const page: ListResult<T> = await this.list<T>(path, {
        ...params,
        ...(token ? { nextPageToken: token } : {}),
      });
      for (const item of page.data) yield item;
      if (!page.data.length || !page.nextToken || page.nextToken === prev) return;
      prev = token;
      token = page.nextToken;
    }
  }

  // --- Metadados ---
  pipelines = () => this.get("pipelines");
  stages = () => this.get("stages");
  users = () => this.get("users");
  customField = (id: string) => this.get(`customFields/${id}`);

  // --- Detalhe ---
  deal = (id: number | string) => this.get(`deals/${id}`);
  project = (id: number | string) => this.get(`projects/${id}`);
  company = (id: number | string) => this.get(`companies/${id}`);

  // --- Listagens (geradores) ---
  deals = (params?: Record<string, string | number | undefined>) =>
    this.paginate("deals", params);
  projects = (params?: Record<string, string | number | undefined>) =>
    this.paginate("projects", params);
  companies = (params?: Record<string, string | number | undefined>) =>
    this.paginate("companies", params);
  contacts = (params?: Record<string, string | number | undefined>) =>
    this.paginate("contacts", params);
}
