/**
 * Cliente da API do Moskit CRM (V2).
 * Base: https://api.moskitcrm.com/v2  ·  Auth: header `apikey`.
 *
 * Os caminhos de endpoint e o esquema de paginação abaixo são best-effort a
 * partir da documentação pública e DEVEM ser confirmados pelo script de
 * descoberta (`npm run moskit:introspect`) contra a conta real.
 */
const DEFAULT_BASE_URL = "https://api.moskitcrm.com/v2";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MoskitClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;

  constructor(opts: MoskitClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.MOSKIT_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MOSKIT_API_KEY não definida. Configure no .env.local (dev) ou no Vercel.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (opts.baseUrl ?? process.env.MOSKIT_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.maxRetries = opts.maxRetries ?? 4;
  }

  /** GET genérico com retry/backoff em 429 e 5xx. */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await fetch(url, {
        headers: { apikey: this.apiKey, accept: "application/json" },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        const wait =
          Number(res.headers.get("retry-after")) * 1000 ||
          Math.min(1000 * 2 ** attempt, 8000);
        attempt += 1;
        await sleep(wait);
        continue;
      }

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      throw new MoskitError(
        `Moskit GET ${path} falhou (${res.status})`,
        res.status,
        body,
      );
    }
  }

  /**
   * Itera todas as páginas de um recurso de listagem.
   * `pageParam`/`sizeParam` e o tamanho ajustáveis conforme a descoberta.
   */
  async *paginate<T = unknown>(
    path: string,
    {
      params = {},
      pageParam = "page",
      sizeParam = "size",
      size = 100,
      startPage = 1,
    }: {
      params?: Record<string, string | number | undefined>;
      pageParam?: string;
      sizeParam?: string;
      size?: number;
      startPage?: number;
    } = {},
  ): AsyncGenerator<T, void, unknown> {
    let page = startPage;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.get<unknown>(path, {
        ...params,
        [pageParam]: page,
        [sizeParam]: size,
      });
      const items = Array.isArray(res)
        ? (res as T[])
        : ((res as { data?: T[]; items?: T[] }).data ??
          (res as { items?: T[] }).items ??
          []);
      if (!items.length) return;
      for (const item of items) yield item;
      if (items.length < size) return;
      page += 1;
    }
  }

  // --- Helpers nomeados (paths a confirmar na descoberta) ---
  pipelines = () => this.get("pipelines");
  stages = () => this.get("stages");
  users = () => this.get("users");
  /** Metadados de campos (inclui custom fields) por entidade. */
  fields = (entity: "deals" | "contacts" | "companies") =>
    this.get(`fields/${entity}`);
  deals = (params?: Record<string, string | number | undefined>) =>
    this.paginate("deals", { params });
  companies = (params?: Record<string, string | number | undefined>) =>
    this.paginate("companies", { params });
  contacts = (params?: Record<string, string | number | undefined>) =>
    this.paginate("contacts", { params });
}
