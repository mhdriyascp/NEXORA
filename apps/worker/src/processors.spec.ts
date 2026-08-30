import type { AiClient } from "./ai-client";
import { buildProcessors, type ProcessorDeps } from "./processors";

function makeDeps(overrides: Partial<ProcessorDeps> = {}): ProcessorDeps {
  const ai: AiClient = {
    ingestDocument: jest
      .fn()
      .mockResolvedValue({ document_id: "doc-1", chunks_indexed: 3 }),
    embed: jest
      .fn()
      .mockResolvedValue({ dimensions: 4, vectors: [[0, 1, 0, 0]] }),
  };
  return {
    ai,
    email: { send: jest.fn().mockResolvedValue({ messageId: "m-1" }) },
    notifications: { deliver: jest.fn().mockResolvedValue(undefined) },
    logger: { info: jest.fn() },
    ...overrides,
  };
}

describe("job processors", () => {
  it("document-processing delegates to the AI service and reports chunks", async () => {
    const deps = makeDeps();
    const processors = buildProcessors(deps);
    const result = await processors["document-processing"]({
      tenantId: "t1",
      documentId: "doc-1",
      text: "hello world",
    });
    expect(deps.ai.ingestDocument).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", documentId: "doc-1" }),
    );
    expect(result).toEqual({ chunksIndexed: 3 });
  });

  it("embeddings returns vector count and dimensions", async () => {
    const processors = buildProcessors(makeDeps());
    const result = await processors.embeddings({
      tenantId: "t1",
      inputs: ["a"],
    });
    expect(result).toEqual({ count: 1, dimensions: 4 });
  });

  it("email sends via the transport and returns the message id", async () => {
    const deps = makeDeps();
    const processors = buildProcessors(deps);
    const result = await processors.email({
      tenantId: "t1",
      to: "a@b.com",
      subject: "Hi",
      body: "Body",
    });
    expect(deps.email.send).toHaveBeenCalled();
    expect(result).toEqual({ messageId: "m-1" });
  });

  it("notifications are delivered to the sink", async () => {
    const deps = makeDeps();
    const processors = buildProcessors(deps);
    const result = await processors.notifications({
      tenantId: "t1",
      userId: "u1",
      message: "ping",
    });
    expect(deps.notifications.deliver).toHaveBeenCalled();
    expect(result).toEqual({ delivered: true });
  });
});
