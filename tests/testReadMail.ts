import { expect, test } from "@playwright/test";

process.loadEnvFile(".env");

test.use({ storageState: { cookies: [], origins: [] } });

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

test("Read latest email via Gmail API", async ({ request }) => {
  const headers = { Authorization: `Bearer ${process.env.GMAIL_ACCESS_TOKEN}` };

  // Gmail returns messages newest first
  const listRes = await request.get(GMAIL_API, {
    headers,
    params: { maxResults: 1 },
  });
  expect(listRes.status(), await listRes.text()).toBe(200);
  const { messages } = await listRes.json();
  expect(messages?.length).toBeGreaterThan(0);

  const readRes = await request.get(`${GMAIL_API}/${messages[0].id}`, {
    headers,
  });
  expect(readRes.status(), await readRes.text()).toBe(200);
  const mail = await readRes.json();

  const header = (name: string) =>
    mail.payload.headers.find(
      (h: { name: string }) => h.name.toLowerCase() === name,
    )?.value;
  console.log(
    `From: ${header("from")}\nSubject: ${header("subject")}\nSnippet: ${mail.snippet}`,
  );

  expect(mail.id).toBe(messages[0].id);
  expect(header("subject")).toBeTruthy();
});
