import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateRandomNumber } from "../utils/randomNumber";

import { AdminUsersPage } from "../pages/AdminUsers";
import { AgentCashInPage } from "../pages/AgentCashIn";
import { LoginPage } from "../pages/Login";
import { PasswordResetPage } from "../pages/PasswordReset";
import { SignupPage, UserModel } from "../pages/Signup";
import { SystemDepositPage } from "../pages/SystemDeposit";
import { GmailClient } from "../utils/gmail";
import { SUITES } from "../utils/suites";

test.use({ storageState: { cookies: [], origins: [] } });

test("Dmoney Playwright Automation Workflow", async ({ page, request }) => {
  test.setTimeout(480000);

  const signupPage = new SignupPage(page);
  const randomId = generateRandomNumber(1000000, 9999999);
  const randomEmailNumber = generateRandomNumber(10000000, 99999999);
  const user: UserModel = {
    fullName: faker.person.fullName(),
    email: `moumitarashidsv+${randomEmailNumber}@gmail.com`,
    phoneNumber: `0150${randomId}`,
    password: "1234",
    nidInput: `199${randomId}`,
    accountType: "Agent",
  };
  const cashInAmount = 500;
  const cashInCommissionRate = 0.025;
  const customerPhones = [
    "01815653690",
    "01815653691",
    "01815653692",
    "01815653694",
  ];
  const loginPage = new LoginPage(page);
  const agentCashInPage = new AgentCashInPage(page);
  const agentBalance = page.getByRole("textbox", {
    name: "Current Balance (BDT)",
  });
  let selectedCustomerPhoneNumber = "";
  let systemDepositTransactionId = "";

  await test.step("Agent Registration", async () => {
    await page.goto("/");
    await expect(page).toHaveURL("https://dmoneyportal.roadtocareer.net/");
    const signUpLink = page
      .getByRole("banner")
      .getByRole("link", { name: "Sign Up", exact: true });
    await expect(signUpLink).toHaveAttribute("href", "/register");
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register$/);

    const fillValidRegistrationForm = async (
      overrides: Partial<UserModel> = {},
    ) => {
      const registrationData = { ...user, ...overrides };
      await signupPage.fullNameInput.fill(registrationData.fullName);
      await signupPage.emailInput.fill(registrationData.email);
      await signupPage.passwordInput.fill(registrationData.password);
      await signupPage.phoneNumber.fill(registrationData.phoneNumber);
      await signupPage.nidInput.fill(registrationData.nidInput);
      await signupPage.accountSelect.click();
      await page
        .getByRole("option", { name: new RegExp(registrationData.accountType) })
        .click();
    };

    await test.step("Name required and minimum length validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.fullNameInput.clear();
      expect(
        await signupPage.fullNameInput.evaluate(
          (input) => (input as HTMLInputElement).validity.valueMissing,
        ),
      ).toBe(true);
      await signupPage.createUserButton.click();
      await expect(page).toHaveURL(/\/register$/);

      await signupPage.fullNameInput.fill("Ab");
      expect(
        await signupPage.fullNameInput.evaluate(
          (input) => (input as HTMLInputElement).validity.tooShort,
        ),
      ).toBe(true);
      await signupPage.createUserButton.click();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Name maximum length validation", async () => {
      await expect(signupPage.fullNameInput).toHaveAttribute("maxlength", "50");
      await signupPage.fullNameInput.fill("N".repeat(51));
      await expect(signupPage.fullNameInput).toHaveValue("N".repeat(50));
    });

    await test.step("Invalid email format validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.emailInput.fill("not-an-email");
      expect(
        await signupPage.emailInput.evaluate(
          (input) => (input as HTMLInputElement).validity.typeMismatch,
        ),
      ).toBe(true);
      await signupPage.createUserButton.click();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Non-Gmail email validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.emailInput.fill("agent@example.com");
      await signupPage.createUserButton.click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Only Gmail addresses/i }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Password minimum length validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.passwordInput.fill("123");
      await signupPage.createUserButton.click();
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: /Password must be at least 4/i }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Phone number required validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.phoneNumber.clear();
      expect(
        await signupPage.phoneNumber.evaluate(
          (input) => (input as HTMLInputElement).validity.valueMissing,
        ),
      ).toBe(true);
      await signupPage.createUserButton.click();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Phone number maximum length validation", async () => {
      await expect(signupPage.phoneNumber).toHaveAttribute("maxlength", "11");
      await signupPage.phoneNumber.fill("0".repeat(12));
      await expect(signupPage.phoneNumber).toHaveValue("0".repeat(11));
    });

    await test.step("NID minimum length validation", async () => {
      await fillValidRegistrationForm();
      await signupPage.nidInput.fill("123456");
      expect(
        await signupPage.nidInput.evaluate(
          (input) => (input as HTMLInputElement).validity.tooShort,
        ),
      ).toBe(true);
      await signupPage.createUserButton.click();
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("NID maximum length validation", async () => {
      await expect(signupPage.nidInput).toHaveAttribute("maxlength", "13");
      await signupPage.nidInput.fill("1".repeat(14));
      await expect(signupPage.nidInput).toHaveValue("1".repeat(13));
    });

    await test.step("Required fields cannot all be blank", async () => {
      await page.goto("/register");
      await signupPage.createUserButton.click();
      for (const input of [
        signupPage.fullNameInput,
        signupPage.emailInput,
        signupPage.passwordInput,
        signupPage.phoneNumber,
        signupPage.nidInput,
      ]) {
        expect(
          await input.evaluate(
            (element) => (element as HTMLInputElement).validity.valueMissing,
          ),
        ).toBe(true);
      }
      await expect(signupPage.accountSelect).toHaveAttribute(
        "aria-required",
        "true",
      );
      await expect(page).toHaveURL(/\/register$/);
    });

    await test.step("Only supported roles can be selected", async () => {
      await signupPage.accountSelect.click();
      await expect(page.getByRole("option")).toHaveText([
        /Customer/,
        /Agent/,
        /Merchant/,
      ]);
      await page.keyboard.press("Escape");
    });

    await fillValidRegistrationForm();
    await signupPage.createUser(user);
    await expect(
      page.getByText(
        "Registration successful. Your account is pending approval by an admin.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

    await test.step("Already registered email validation", async () => {
      await page.goto("/register");
      await signupPage.fullNameInput.fill(user.fullName);
      await signupPage.emailInput.fill(user.email);
      await signupPage.passwordInput.fill(user.password);
      const duplicatePhone = `0170${generateRandomNumber(1000000, 9999999)}`;
      const duplicateNid = `299${generateRandomNumber(1000000, 9999999)}`;
      await signupPage.phoneNumber.fill(duplicatePhone);
      await signupPage.nidInput.fill(duplicateNid);
      await signupPage.accountSelect.click();
      await page.getByRole("option", { name: /Agent/ }).click();
      await signupPage.createUserButton.click();
      await expect(
        page.getByRole("alert").filter({
          hasText: /An account with this email/i,
        }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/register$/);
    });
  });

  // Admin approves the agent registration

  await test.step("Admin Approves Agent", async () => {
    await page.goto("/login");
    await loginPage.login("admin@dmoney.com", "1234");
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
    await expect(
      page.getByText("Admin Dashboard", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Email Address" }),
    ).toHaveValue("admin@dmoney.com");

    // Search for the agent and approve their registration
    const adminUsersPage = new AdminUsersPage(page);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);

    const agentRow = await adminUsersPage.searchByEmail(user.email);
    await expect(agentRow).toContainText(user.fullName);
    await expect(agentRow).toContainText(user.email);
    await expect(agentRow).toContainText("Agent");
    await expect(agentRow).toContainText("PENDING");
    await agentRow.getByRole("button", { name: "View" }).click();
    await expect(page).toHaveURL(/\/admin\/users\/\d+$/);
    await expect(page.getByText("PENDING", { exact: true })).toBeVisible();

    await page.goto("/admin/users");
    const agentToActivate = await adminUsersPage.searchByEmail(user.email);
    await agentToActivate.getByRole("button", { name: "View" }).click();
    await expect(page).toHaveURL(/\/admin\/users\/\d+$/);
    await expect(page.getByText("PENDING", { exact: true })).toBeVisible();
    await adminUsersPage.activateUser();
    await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

    await adminUsersPage.logout();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

    await test.step("System login and deposit negative cases", async () => {
      await loginPage.login("system@dmoney.com", "1234");
      await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
      await expect(
        page.getByRole("textbox", { name: "Email Address" }),
      ).toHaveValue("system@dmoney.com");
      await expect(
        page.getByRole("main").getByText("SYSTEM", { exact: true }),
      ).toBeVisible();

      const systemBalanceInput = page.getByRole("textbox", {
        name: "Current Balance (BDT)",
      });
      const systemBalance = Number(await systemBalanceInput.inputValue());
      expect(Number.isFinite(systemBalance)).toBe(true);

      await page.goto("/agent/cash-in");
      await expect(page).toHaveURL(/\/agent\/cash-in$/);
      const systemDepositPage = new SystemDepositPage(page);
      const appError = page.getByRole("alert").filter({ hasText: /\S/ });
      const expectRejectedDeposit = async () => {
        await expect(
          page.getByText("SYSTEM deposit to Agent successful", {
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(page).toHaveURL(/\/agent\/cash-in$/);
      };

      await test.step("Reject invalid Agent phone", async () => {
        await systemDepositPage.depositToAgent("01000000000", 100);
        await expect(appError).toBeVisible();
        await expectRejectedDeposit();
      });

      await test.step("Require a deposit amount", async () => {
        await systemDepositPage.agentPhoneInput.fill(user.phoneNumber);
        await systemDepositPage.amountInput.clear();
        expect(
          await systemDepositPage.amountInput.evaluate(
            (input) => (input as HTMLInputElement).validity.valueMissing,
          ),
        ).toBe(true);
        await systemDepositPage.depositButton.click();
        await expectRejectedDeposit();
      });

      for (const invalidAmount of ["0", "-1"]) {
        await test.step(`Reject deposit amount ${invalidAmount}`, async () => {
          await systemDepositPage.agentPhoneInput.fill(user.phoneNumber);
          await systemDepositPage.amountInput.fill(invalidAmount);
          const isValid = await systemDepositPage.amountInput.evaluate(
            (input) => (input as HTMLInputElement).validity.valid,
          );
          await systemDepositPage.depositButton.click();
          if (isValid) await expect(appError).toBeVisible();
          await expectRejectedDeposit();
        });
      }

      await test.step("Reject invalid amount format", async () => {
        await systemDepositPage.agentPhoneInput.fill(user.phoneNumber);
        await systemDepositPage.amountInput.clear();
        await systemDepositPage.amountInput.pressSequentially("abc");
        await expect(systemDepositPage.amountInput).toHaveValue("");
        expect(
          await systemDepositPage.amountInput.evaluate(
            (input) => (input as HTMLInputElement).validity.valueMissing,
          ),
        ).toBe(true);
        await systemDepositPage.depositButton.click();
        await expectRejectedDeposit();
      });

      await test.step("Reject amount above System balance", async () => {
        await systemDepositPage.depositToAgent(
          user.phoneNumber,
          systemBalance + 1,
        );
        await expect(appError).toBeVisible();
        await expectRejectedDeposit();
      });

      await systemDepositPage.logout();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
    });
  });

  // System deposits to the agent's account
  await test.step("System Deposits to Agent", async () => {
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
    systemDepositTransactionId = await transactionId.innerText();
    expect(systemDepositTransactionId).toMatch(/^TXN[A-Z0-9]+$/);
    await expect(page.getByText("৳ 2000.00", { exact: true })).toBeVisible();
    await expect(page.getByText("৳ 0.00", { exact: true })).toBeVisible();

    await systemDepositPage.logout();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
  });

  // Agent logs in and verifies balance
  await test.step("Agent Login and Balance Verification", async () => {
    const otpRequestedAt = Date.now();
    await loginPage.login(user.email, user.password);
    await expect(
      page.getByText("Verify Your Identity", { exact: true }),
    ).toBeVisible();
    const otp = await new GmailClient(request).waitForOtp(
      otpRequestedAt,
      user.email,
    );

    await test.step("Reject empty OTP", async () => {
      await loginPage.otpInput.clear();
      expect(
        await loginPage.otpInput.evaluate(
          (input) => (input as HTMLInputElement).validity.valueMissing,
        ),
      ).toBe(true);
      if (await loginPage.verifyOtpButton.isEnabled()) {
        await loginPage.verifyOtpButton.click();
      } else {
        await expect(loginPage.verifyOtpButton).toBeDisabled();
      }
      await expect(
        page.getByText("Verify Your Identity", { exact: true }),
      ).toBeVisible();
    });

    await test.step("Reject invalid OTP format", async () => {
      await loginPage.otpInput.fill("12");
      if (await loginPage.verifyOtpButton.isEnabled()) {
        await loginPage.verifyOtpButton.click();
        await expect(
          page.getByRole("alert").filter({
            hasText: /otp|invalid|incorrect|4.?digit|4.?character/i,
          }),
        ).toBeVisible();
      } else {
        await expect(loginPage.verifyOtpButton).toBeDisabled();
      }
      await expect(
        page.getByText("Verify Your Identity", { exact: true }),
      ).toBeVisible();
    });

    await test.step("Reject incorrect OTP", async () => {
      const wrongOtp = `${otp.slice(0, 3)}${(Number(otp[3]) + 1) % 10}`;
      await loginPage.submitOtp(wrongOtp);
      await expect(
        page.getByRole("alert").filter({
          hasText: /otp|invalid|incorrect|expired/i,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Verify Your Identity", { exact: true }),
      ).toBeVisible();
    });

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
    await expect(agentBalance).toHaveValue("2000.00");
  });

  // Agent performs cash-in to a customer and verifies the transaction

  await test.step("Agent Cash-In", async () => {
    const initialBalance = Number(
      (await agentBalance.inputValue()).replace(/[৳,\s]/g, ""),
    );
    expect(Number.isFinite(initialBalance)).toBe(true);
    const expectedBalance =
      initialBalance - cashInAmount + cashInAmount * cashInCommissionRate;

    await page.goto("/agent/cash-in");
    await expect(page).toHaveURL(/\/agent\/cash-in$/);
    const shuffledCandidates = [...customerPhones];
    for (let index = shuffledCandidates.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledCandidates[index], shuffledCandidates[randomIndex]] = [
        shuffledCandidates[randomIndex],
        shuffledCandidates[index],
      ];
    }
    const successMessage = page.getByText("Deposit successful", {
      exact: true,
    });
    const cashInError = page.getByRole("alert").filter({ hasText: /\S/ });
    const failedAttempts: string[] = [];
    for (const customerPhone of shuffledCandidates) {
      await agentCashInPage.customerPhoneInput.fill(customerPhone);
      await agentCashInPage.amountInput.fill(cashInAmount.toString());
      await agentCashInPage.cashInButton.click();

      let outcome: "success" | "error";
      try {
        outcome = await Promise.race([
          successMessage
            .waitFor({ state: "visible", timeout: 10000 })
            .then(() => "success" as const),
          cashInError
            .waitFor({ state: "visible", timeout: 10000 })
            .then(() => "error" as const),
        ]);
      } catch {
        throw new Error(
          `Cash In outcome is unknown for ${customerPhone}; not retrying to avoid a duplicate transaction.`,
        );
      }

      if (outcome === "success") {
        selectedCustomerPhoneNumber = customerPhone;
        break;
      }

      const errorText = (await cashInError.innerText()).trim();
      if (!/daily.{0,30}limit|limit.{0,30}daily/i.test(errorText)) {
        throw new Error(
          `Cash In failed for ${customerPhone} with a non-retryable error: ${errorText}`,
        );
      }
      failedAttempts.push(`${customerPhone}: ${errorText}`);
      if (customerPhone !== shuffledCandidates.at(-1)) {
        await page.reload();
        await expect(page).toHaveURL(/\/agent\/cash-in$/);
      }
    }
    expect(
      selectedCustomerPhoneNumber,
      `Cash In failed for all configured Customers: ${failedAttempts.join("; ")}`,
    ).toBeTruthy();
    await expect(
      page.getByText("Deposit successful", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`৳ ${cashInAmount.toFixed(2)}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`৳ ${expectedBalance.toFixed(2)}`, { exact: true }),
    ).toBeVisible();
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile$/);
    await expect(agentBalance).toHaveValue(expectedBalance.toFixed(2));
  });
  // Agent resets password and verifies new login with the new password
  await test.step("Reset Password and Verify New Login", async () => {
    await agentCashInPage.logout();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

    const passwordResetPage = new PasswordResetPage(page);
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password$/);
    const resetRequestedAt = Date.now();
    await passwordResetPage.requestReset(user.email);
    await expect(
      page.getByText(/reset link.*sent|check your email/i),
    ).toBeVisible();

    const gmailClient = new GmailClient(request);
    const resetLink = await gmailClient.waitForPasswordResetLink(
      resetRequestedAt,
      user.email,
    );
    await page.goto(resetLink);
    await expect(passwordResetPage.newPasswordInput).toBeVisible();
    const newPassword = "5678";
    await passwordResetPage.resetPassword(newPassword);
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });
    await expect(loginPage.emailOrPhoneInput).toBeVisible();

    await loginPage.login(user.email, user.password);
    await expect(
      page.getByRole("alert").filter({
        hasText: /login failed|input correct email\/phone number or password/i,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    const newPasswordOtpRequestedAt = Date.now();
    await loginPage.login(user.email, newPassword);
    await expect(
      page.getByText("Verify Your Identity", { exact: true }),
    ).toBeVisible();
    const newPasswordOtp = await gmailClient.waitForOtp(
      newPasswordOtpRequestedAt,
      user.email,
    );

    // Submit the OTP and verify successful login with the new password
    await loginPage.submitOtp(newPasswordOtp);
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
    await expect(
      page.getByRole("textbox", { name: "Email Address" }),
    ).toHaveValue(user.email);
    await expect(page.getByRole("textbox", { name: "Role" })).toHaveValue(
      "Agent",
    );
  });

  // Agent verifies self-statement and exports it to CSV after the password reset login
  await test.step("Verify and Export Self Statement", async () => {
    await page.goto("/agent/self-statement");
    await expect(page).toHaveURL(/\/agent\/self-statement$/);
    const currentYear = new Date().getFullYear();
    await page
      .getByRole("textbox", { name: "From Date" })
      .fill(`${currentYear}-01-01`);
    await page
      .getByRole("textbox", { name: "To Date" })
      .fill(`${currentYear}-12-31`);
    const customerDepositRow = page
      .getByRole("row")
      .filter({ hasText: selectedCustomerPhoneNumber });
    await expect(customerDepositRow).toBeVisible();
    await expect(customerDepositRow).toContainText("500.00");

    const statementTable = page.getByRole("table");
    await expect(statementTable).toBeVisible();

    const tableRows = await statementTable
      .locator("tr")
      .evaluateAll((rows) =>
        rows.map((row) =>
          Array.from(
            row.querySelectorAll("th, td"),
            (cell) => cell.textContent?.trim() ?? "",
          ),
        ),
      );
    expect(tableRows.length).toBeGreaterThan(1);
    expect(tableRows[0].length).toBeGreaterThan(0);
    const dataRows = tableRows.slice(1);
    const expectedTransactionRow = dataRows.find((row) =>
      row.includes(selectedCustomerPhoneNumber),
    );
    expect(expectedTransactionRow).toBeDefined();
    expect(expectedTransactionRow?.join(" ")).toContain(
      cashInAmount.toFixed(2),
    );

    const systemDepositRow = dataRows.find(
      (row) => row[0] === systemDepositTransactionId,
    );
    expect(systemDepositRow).toEqual([
      systemDepositTransactionId,
      "SYSTEM",
      user.phoneNumber,
      "Top-up from SYSTEM",
      "-",
      "2000.00",
      "2000.00",
      expect.any(String),
    ]);

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csvContent = tableRows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const today = new Date().toISOString().split("T")[0];
    const fileName = `self_statement_${today}.csv`;
    const csvPath = resolve(process.cwd(), "test-results", fileName);
    await writeFile(csvPath, csvContent, "utf-8");
    const savedCsv = await readFile(csvPath, "utf-8");
    expect(savedCsv).toBe(csvContent);
    await page.screenshot({
      path: "docs/assets/regression-test-result.png",
      fullPage: true,
    });
  });

  await test.step("Save Auth State", async () => {
    await page.context().storageState({ path: "auth.json" });
  });
});

test.describe("Smoke Suite - Positive Scenarios", { tag: SUITES.smoke }, () =>
  test("Dmoney Positive Smoke Workflow", async ({ page, request }) => {
    test.setTimeout(360000);

    const user: UserModel = {
      fullName: faker.person.fullName(),
      email: `moumitarashidsv+${generateRandomNumber(10000000, 99999999)}@gmail.com`,
      phoneNumber: `0150${generateRandomNumber(1000000, 9999999)}`,
      password: "1234",
      nidInput: `199${generateRandomNumber(1000000, 9999999)}`,
      accountType: "Agent",
    };
    const signupPage = new SignupPage(page);
    const loginPage = new LoginPage(page);
    const customerPhones = [
      "01815653690",
      "01815653691",
      "01815653692",
      "01815653694",
    ];

    await page.goto("/register");
    await signupPage.createUser(user);
    await expect(
      page.getByText(
        "Registration successful. Your account is pending approval by an admin.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

    await loginPage.login("admin@dmoney.com", "1234");
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
    await page.goto("/admin/users");
    const adminUsersPage = new AdminUsersPage(page);
    const agentRow = await adminUsersPage.searchByEmail(user.email);
    await expect(agentRow).toContainText("PENDING");
    await agentRow.getByRole("button", { name: "View" }).click();
    await expect(page).toHaveURL(/\/admin\/users\/\d+$/);
    await adminUsersPage.activateUser();
    await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
    await adminUsersPage.logout();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 });

    await loginPage.login("system@dmoney.com", "1234");
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
    await page.goto("/agent/cash-in");
    const systemDepositPage = new SystemDepositPage(page);
    await systemDepositPage.depositToAgent(user.phoneNumber, 2000);
    await expect(
      page.getByText("SYSTEM deposit to Agent successful", { exact: true }),
    ).toBeVisible();
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
    const agentBalance = page.getByRole("textbox", {
      name: "Current Balance (BDT)",
    });
    await expect(agentBalance).toHaveValue("2000.00");

    await page.goto("/agent/cash-in");
    const agentCashInPage = new AgentCashInPage(page);
    const successMessage = page.getByText("Deposit successful", {
      exact: true,
    });
    const cashInError = page.getByRole("alert").filter({ hasText: /\S/ });
    let successfulCustomerPhone = "";

    for (const customerPhone of customerPhones) {
      await agentCashInPage.cashIn(customerPhone, 500);
      let outcome: "success" | "error";
      try {
        outcome = await Promise.race([
          successMessage
            .waitFor({ state: "visible", timeout: 10000 })
            .then(() => "success" as const),
          cashInError
            .waitFor({ state: "visible", timeout: 10000 })
            .then(() => "error" as const),
        ]);
      } catch {
        throw new Error(
          `Cash-in outcome is unknown for ${customerPhone}; not retrying to avoid a duplicate transaction.`,
        );
      }

      if (outcome === "success") {
        successfulCustomerPhone = customerPhone;
        break;
      }

      const errorText = (await cashInError.innerText()).trim();
      if (!/daily.{0,30}limit|limit.{0,30}daily/i.test(errorText)) {
        throw new Error(
          `Cash-in failed for ${customerPhone} with a non-retryable error: ${errorText}`,
        );
      }
      if (customerPhone !== customerPhones.at(-1)) await page.reload();
    }

    expect(successfulCustomerPhone).toBeTruthy();
    await expect(successMessage).toBeVisible();
    await expect(page.getByText("৳ 500.00", { exact: true })).toBeVisible();
    await expect(page.getByText("৳ 1512.50", { exact: true })).toBeVisible();
    await page.goto("/profile");
    await expect(agentBalance).toHaveValue("1512.50");
    await page.screenshot({
      path: "docs/assets/smoke-test-result.png",
      fullPage: true,
    });
  }),
);
