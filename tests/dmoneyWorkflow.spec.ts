import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { generateRandomNumber } from "../utils/randomNumber";
//import { CreateUserPage, UserModel } from '../pages/CreateUserPage.pom';
import { AdminUsersPage } from "../pages/AdminUsers";
import { LoginPage } from "../pages/Login";
import { SignupPage, UserModel } from "../pages/Signup";
import { SystemDepositPage } from "../pages/SystemDeposit";
import { GmailClient } from "../utils/gmail";

test.use({ storageState: { cookies: [], origins: [] } });

test("Create New User", async ({ page, request }) => {
  test.setTimeout(240000);
  const signupPage = new SignupPage(page);
  const randomId = generateRandomNumber(1000000, 9999999);
  const randomEmailNumber = generateRandomNumber(10000000, 99999999);
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register$/);

  const user: UserModel = {
    fullName: faker.person.fullName(),
    email: `moumitarashidsv+${randomEmailNumber}@gmail.com`,
    phoneNumber: `0150${randomId}`,
    password: "1234",
    nidInput: `199${randomId}`,
    accountType: "Agent",
  };
  await signupPage.createUser(user);
  await expect(
    page.getByText(
      "Registration successful. Your account is pending approval by an admin.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

  const loginPage = new LoginPage(page);
  await loginPage.login("admin@dmoney.com", "1234");
  await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
  await expect(
    page.getByText("Admin Dashboard", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Email Address" }),
  ).toHaveValue("admin@dmoney.com");

  const adminUsersPage = new AdminUsersPage(page);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users$/);

  const agentRow = await adminUsersPage.searchByEmail(user.email);
  await expect(agentRow).toContainText("Agent");
  await expect(agentRow).toContainText("PENDING");
  await agentRow.getByRole("button", { name: "View" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/\d+$/);
  await expect(page.getByText("PENDING", { exact: true })).toBeVisible();

  await adminUsersPage.activateAgent();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await adminUsersPage.logout();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

  await loginPage.login("system@dmoney.com", "1234");
  await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
  await expect(
    page.getByRole("textbox", { name: "Email Address" }),
  ).toHaveValue("system@dmoney.com");
  await expect(
    page.getByRole("main").getByText("SYSTEM", { exact: true }),
  ).toBeVisible();

  await page.goto("/agent/cash-in");
  await expect(page).toHaveURL(/\/agent\/cash-in$/);
  const systemDepositPage = new SystemDepositPage(page);
  await systemDepositPage.depositToAgent(user.phoneNumber, 2000);
  await expect(
    page.getByText("SYSTEM deposit to Agent successful", { exact: true }),
  ).toBeVisible();
  const transactionId = page.getByText(/^TXN[A-Z0-9]+$/);
  await expect(transactionId).toBeVisible();
  await expect(page.getByText("৳ 2000.00", { exact: true })).toBeVisible();
  await expect(page.getByText("৳ 0.00", { exact: true })).toBeVisible();

  await systemDepositPage.logout();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

  const otpRequestedAt = Date.now();
  await loginPage.login(user.email, user.password);
  await expect(
    page.getByText("Verify Your Identity", { exact: true }),
  ).toBeVisible();
  const otp = await new GmailClient(request).waitForOtp(
    otpRequestedAt,
    user.email,
  );
  await loginPage.submitOtp(otp);
  await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
  await expect(
    page.getByRole("textbox", { name: "Email Address" }),
  ).toHaveValue(user.email);
  await expect(page.getByRole("textbox", { name: "Role" })).toHaveValue(
    "Agent",
  );
  await expect(
    page.getByRole("main").getByText("ACTIVE", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Current Balance (BDT)" }),
  ).toHaveValue("2000.00");
  await page.context().storageState({ path: "auth.json" });
});
