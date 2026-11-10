import { describe, it, expect, vi } from "vitest";
import { nimCompletion } from "../src/lib/ai/provider";
describe("NVIDIA adapter mocked HTTP integration", () => {
  it("sends server-side auth and compatible request fields", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "Grounded explanation" } }],
          }),
          { status: 200 },
        ),
      );
    expect(
      await nimCompletion([{ role: "user", content: "Explain FOLLOW" }], {
        key: "test-only-secret",
        fetcher,
      }),
    ).toBe("Grounded explanation");
    const [, init] = fetcher.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-only-secret");
    expect(JSON.parse(init.body).stream).toBe(false);
  });
  it("returns a precise missing configuration error", async () => {
    await expect(nimCompletion([], { key: "" })).rejects.toMatchObject({
      code: "NOT_CONFIGURED",
    });
  });
  it("sanitizes unauthorized responses", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("secret provider body", { status: 401 }));
    await expect(
      nimCompletion([], { key: "secret", fetcher }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "NVIDIA rejected the configured credentials.",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries a transient failure but validates the final output", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
        ),
      );
    expect(await nimCompletion([], { key: "test", fetcher })).toBe("OK");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed provider output", async () => {
    await expect(
      nimCompletion([], {
        key: "test",
        fetcher: vi.fn().mockResolvedValue(new Response('{"oops":true}')),
      }),
    ).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
  });
});
