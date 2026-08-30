/**
 * Minimal client for the internal Python AI service. Background jobs (document
 * ingestion, embeddings) delegate AI work here rather than reimplementing it,
 * and authenticate with the internal service token. Injectable via an interface
 * so processors stay unit-testable without network access.
 */
export interface AiClient {
  ingestDocument(input: {
    tenantId: string;
    documentId: string;
    text: string;
    metadata?: Record<string, string>;
  }): Promise<{ document_id: string; chunks_indexed: number }>;
  embed(input: {
    tenantId: string;
    inputs: string[];
  }): Promise<{ dimensions: number; vectors: number[][] }>;
}

export interface AiClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export function createAiClient(options: AiClientOptions): AiClient {
  const doFetch = options.fetchImpl ?? fetch;

  async function post<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.token) {
      headers["X-Service-Token"] = options.token;
    }
    const res = await doFetch(`${options.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`AI service ${path} failed with ${res.status}`);
    }
    return (await res.json()) as T;
  }

  return {
    ingestDocument: (input) =>
      post("/v1/ai/documents", {
        tenant_id: input.tenantId,
        document_id: input.documentId,
        text: input.text,
        metadata: input.metadata ?? {},
      }),
    embed: (input) =>
      post("/v1/ai/embeddings", {
        tenant_id: input.tenantId,
        inputs: input.inputs,
      }),
  };
}
