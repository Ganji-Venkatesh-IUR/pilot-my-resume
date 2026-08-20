/** Integration tests — AI gateway transport: retries, error mapping, config. */
import { describe, expect, it, vi } from "vitest";
import { AiError, callGateway } from "@/lib/ai/gateway.server";
import { mockGateway } from "../fixtures/supabase";

const messages = [{ role: "user", content: "hi" }];

describe("callGateway", () => {
  it("returns the assistant message content", async () => {
    mockGateway('{"ok":true}');
    await expect(callGateway(messages)).resolves.toBe('{"ok":true}');
  });

  it("sends the API key and requests JSON output", async () => {
    const fetchMock = mockGateway("{}");
    await callGateway(messages);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toMatch(/^Bearer /);
    expect(JSON.parse(String(init.body)).response_format).toEqual({ type: "json_object" });
  });

  it("does not retry rate limits", async () => {
    const fetchMock = mockGateway({ status: 429 });
    await expect(callGateway(messages)).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps exhausted credits to a friendly error", async () => {
    mockGateway({ status: 402 });
    await expect(callGateway(messages)).rejects.toMatchObject({ code: "no_credits" });
  });

  it("retries transient upstream failures and then succeeds", async () => {
    const fetchMock = mockGateway({ status: 500 }, "{}");
    await expect(callGateway(messages)).resolves.toBe("{}");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry budget", async () => {
    const fetchMock = mockGateway({ status: 500 }, { status: 502 }, { status: 503 });
    await expect(callGateway(messages)).rejects.toBeInstanceOf(AiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("errors clearly when the model returns nothing", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(callGateway(messages)).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("fails fast when AI is not configured", async () => {
    const key = process.env["LOVABLE_API_KEY"];
    delete process.env["LOVABLE_API_KEY"];
    await expect(callGateway(messages)).rejects.toMatchObject({ code: "unconfigured" });
    process.env["LOVABLE_API_KEY"] = key;
  });
});
