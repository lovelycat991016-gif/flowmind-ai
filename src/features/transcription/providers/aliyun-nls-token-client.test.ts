import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => vi.restoreAllMocks());

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

  it.each([
    [401, "provider_request_failed"],
    [403, "provider_request_failed"],
  ] as const)("logs safe diagnostics for token HTTP %i", async (status, code) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new AliyunNlsTokenClient({
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
      transport: vi.fn().mockResolvedValue(
        response({ Code: "InvalidAccessKeyId", Message: "secret-token" }, status),
      ),
    });

    await expect(client.getToken()).rejects.toEqual(
      new AliyunNlsTokenError(code),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_NLS_TOKEN_FAILED",
      expect.objectContaining({
        status,
        errorCode: "InvalidAccessKeyId",
        errorSummary: `http_${status}`,
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });

  it("logs an invalid JSON token response without exposing response content", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new AliyunNlsTokenClient({
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
      transport: vi.fn().mockResolvedValue(
        new Response("token=secret-token", {
          headers: { "content-type": "application/json" },
        }),
      ),
    });

    await expect(client.getToken()).rejects.toEqual(
      new AliyunNlsTokenError("provider_request_failed"),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_NLS_TOKEN_FAILED",
      expect.objectContaining({
        errorName: "InvalidTokenResponse",
        errorSummary: "invalid_json",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });

  it("logs a missing token identifier without exposing credentials", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new AliyunNlsTokenClient({
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
      transport: vi.fn().mockResolvedValue(response({ Token: {} })),
    });

    await expect(client.getToken()).rejects.toEqual(
      new AliyunNlsTokenError("provider_request_failed"),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_NLS_TOKEN_FAILED",
      expect.objectContaining({
        errorName: "InvalidTokenResponse",
        errorSummary: "missing_token_id",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("access-key-secret");
  });
});
