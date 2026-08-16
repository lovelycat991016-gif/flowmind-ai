import { describe, expect, it, vi } from "vitest";

import {
  AliyunNlsTokenClient,
  AliyunNlsTokenError,
} from "./aliyun-nls-token-client";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AliyunNlsTokenClient", () => {
  it("requests and returns a temporary NLS token without exposing credentials", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(response({ Token: { Id: "temporary-token" } }));
    const client = new AliyunNlsTokenClient({
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
      transport,
      now: () => new Date("2026-08-16T00:00:00.000Z"),
      nonce: () => "nonce",
    });

    await expect(client.getToken()).resolves.toBe("temporary-token");
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0]?.[0].url).toContain("Action=CreateToken");
  });

  it("maps a token request failure to a safe provider failure code", async () => {
    const client = new AliyunNlsTokenClient({
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
      transport: vi.fn().mockResolvedValue(response({}, 503)),
    });

    await expect(client.getToken()).rejects.toEqual(
      new AliyunNlsTokenError("provider_unavailable"),
    );
  });
});
