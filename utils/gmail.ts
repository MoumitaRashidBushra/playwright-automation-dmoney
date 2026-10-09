import { APIRequestContext, expect } from "@playwright/test";

process.loadEnvFile(".env");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

type GmailPart = {
  body?: { data?: string };
  parts?: GmailPart[];
};

export class GmailClient {
  constructor(private readonly request: APIRequestContext) {}

  // Poll until a fresh OTP addressed to the requested account arrives.
  async waitForOtp(
    since: number,
    recipient: string,
    timeoutMs = 180_000,
    intervalMs = 3_000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const otp = await this.findOtpSince(since, recipient);
      if (otp) return otp;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
      `No new login OTP for ${recipient} received within ${timeoutMs / 1000}s`,
    );
  }

  async waitForPasswordResetLink(
    since: number,
    recipient: string,
    timeoutMs = 180_000,
    intervalMs = 3_000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const resetLink = await this.findPasswordResetLink(since, recipient);
      if (resetLink) return resetLink;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(
      `No new password reset link for ${recipient} received within ${timeoutMs / 1000}s`,
    );
  }

  private async findOtpSince(
    since: number,
    recipient: string,
  ): Promise<string | null> {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("GMAIL_ACCESS_TOKEN is missing from .env");
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const listRes = await this.request.get(GMAIL_API, {
      headers,
      params: {
        q: `to:${recipient} subject:"Your Login OTP" after:${Math.floor(since / 1000)}`,
        maxResults: 10,
      },
    });
    expect(listRes.status(), await listRes.text()).toBe(200);
    const { messages = [] } = await listRes.json();

    for (const { id } of messages) {
      const readRes = await this.request.get(`${GMAIL_API}/${id}`, { headers });
      expect(readRes.status(), await readRes.text()).toBe(200);
      const mail = await readRes.json();

      const recipientHeader = mail.payload.headers.find(
        (header: { name: string }) => header.name.toLowerCase() === "to",
      )?.value as string | undefined;
      if (
        Number(mail.internalDate) < since ||
        !recipientHeader?.toLowerCase().includes(recipient.toLowerCase())
      ) {
        continue;
      }

      const otp = this.extractOtp(mail.snippet);
      if (otp) return otp;
    }
    return null;
  }

  private async findPasswordResetLink(
    since: number,
    recipient: string,
  ): Promise<string | null> {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("GMAIL_ACCESS_TOKEN is missing from .env");
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const listRes = await this.request.get(GMAIL_API, {
      headers,
      params: {
        q: `to:${recipient} after:${Math.floor(since / 1000) - 60}`,
        maxResults: 10,
      },
    });
    expect(listRes.status(), await listRes.text()).toBe(200);
    const { messages = [] } = await listRes.json();

    for (const { id } of messages) {
      const readRes = await this.request.get(`${GMAIL_API}/${id}`, { headers });
      expect(readRes.status(), await readRes.text()).toBe(200);
      const mail = await readRes.json();
      const mailHeaders = mail.payload.headers as Array<{
        name: string;
        value: string;
      }>;
      const recipientHeader = mailHeaders.find(
        (header) => header.name.toLowerCase() === "to",
      )?.value;
      const subject = mailHeaders.find(
        (header) => header.name.toLowerCase() === "subject",
      )?.value;

      if (
        Number(mail.internalDate) < since ||
        !recipientHeader?.toLowerCase().includes(recipient.toLowerCase()) ||
        !subject ||
        !/password.*reset|reset.*password/i.test(subject) ||
        /otp/i.test(subject)
      ) {
        continue;
      }

      const emailBody = this.readPayloadText(mail.payload).replace(
        /&amp;/gi,
        "&",
      );
      const hrefLinks = Array.from(
        emailBody.matchAll(/href=["']([^"']+)["']/gi),
        (match) => match[1],
      );
      const plainLinks = emailBody.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
      const resetLink = [...hrefLinks, ...plainLinks]
        .map((link) => link.replace(/[),.;]+$/, ""))
        .find((link) => this.isPasswordResetLink(link));
      if (resetLink) return resetLink;
    }
    return null;
  }

  private readPayloadText(part: GmailPart): string {
    let ownText = "";
    if (part.body?.data) {
      const base64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      const binary = atob(paddedBase64);
      ownText = new TextDecoder().decode(
        Uint8Array.from(binary, (character) => character.charCodeAt(0)),
      );
    }
    return [
      ownText,
      ...(part.parts ?? []).map((child) => this.readPayloadText(child)),
    ].join("\n");
  }

  private isPasswordResetLink(link: string): boolean {
    try {
      const url = new URL(link);
      if (!/\/reset-password(?:\/|$)/i.test(url.pathname)) return false;
      const hasToken = [...url.searchParams.keys()].some((key) =>
        /^(?:token|reset_token|resettoken)$/i.test(key),
      );
      return hasToken || /\/reset-password\/[^/]+/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  extractOtp(snippet: string): string | null {
    return snippet.match(/\b\d{4}\b/)?.[0] ?? null;
  }
}
