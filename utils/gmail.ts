import { APIRequestContext, expect } from "@playwright/test";

process.loadEnvFile(".env");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

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

  extractOtp(snippet: string): string | null {
    return snippet.match(/\b\d{4}\b/)?.[0] ?? null;
  }
}
