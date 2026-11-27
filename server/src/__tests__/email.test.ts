import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalBrevoKey = process.env.BREVO_API_KEY;
const originalFrom = process.env.SMTP_FROM;

const fetchMock = vi.fn();

type FetchInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.BREVO_API_KEY = "test-brevo-key";
  process.env.SMTP_FROM = "Haven <you@gmail.com>";
  vi.resetModules();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  if (originalBrevoKey === undefined) {
    delete process.env.BREVO_API_KEY;
  } else {
    process.env.BREVO_API_KEY = originalBrevoKey;
  }
  if (originalFrom === undefined) {
    delete process.env.SMTP_FROM;
  } else {
    process.env.SMTP_FROM = originalFrom;
  }
  vi.resetModules();
});

describe("Brevo HTTP email transport", () => {
  it("posts to the Brevo API with the parsed sender and text content", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
    const { sendMail } = await import("../lib/email");

    await sendMail({ to: "buyer@example.com", subject: "Hello", text: "Body text" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, FetchInit];

    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "api-key": "test-brevo-key",
      "content-type": "application/json",
      accept: "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: "Haven", email: "you@gmail.com" },
      to: [{ email: "buyer@example.com" }],
      subject: "Hello",
      textContent: "Body text",
    });
  });

  it("includes htmlContent and replyTo only when provided", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
    const { sendMail } = await import("../lib/email");

    await sendMail({
      to: "buyer@example.com",
      subject: "Hello",
      text: "Body text",
      html: "<p>Body text</p>",
      replyTo: "agent@example.com",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, FetchInit];
    const body = JSON.parse(init.body) as {
      htmlContent?: string;
      replyTo?: { email: string };
    };

    expect(body.htmlContent).toBe("<p>Body text</p>");
    expect(body.replyTo).toEqual({ email: "agent@example.com" });
  });

  it("does not throw when Brevo returns a non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "upstream failure" });
    const { sendMail } = await import("../lib/email");

    await expect(
      sendMail({ to: "buyer@example.com", subject: "Hello", text: "Body text" }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});