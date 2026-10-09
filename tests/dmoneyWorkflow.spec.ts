import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { generateRandomNumber } from "../utils/randomNumber";
//import { CreateUserPage, UserModel } from '../pages/CreateUserPage.pom';
import { AdminUsersPage } from "../pages/AdminUsers";
import { LoginPage } from "../pages/Login";
import { SignupPage, UserModel } from "../pages/Signup";

test.use({ storageState: { cookies: [], origins: [] } });

test("Create New User", async ({ page }) => {
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
});
