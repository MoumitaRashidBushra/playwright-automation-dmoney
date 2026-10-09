import { Locator, Page } from "@playwright/test";

export interface UserModel {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  nidInput: string;
  accountType: "Customer" | "Agent" | "Merchant";
}
export class SignupPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly phoneNumber: Locator;
  readonly nidInput: Locator;
  readonly accountSelect: Locator;
  readonly createUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fullNameInput = page.getByRole("textbox", {
      name: "Full Name",
      exact: true,
    });
    this.emailInput = page.getByRole("textbox", { name: "Email Address" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.phoneNumber = page.getByRole("textbox", { name: "Phone Number" });
    this.nidInput = page.getByRole("textbox", { name: "National ID (NID)" });
    this.accountSelect = page.getByRole("combobox").first();
    this.createUserButton = page.getByRole("button", {
      name: "Create Account →",
    });
  }
  async createUser(user: UserModel) {
    await this.fullNameInput.fill(user.fullName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.phoneNumber.fill(user.phoneNumber);
    await this.nidInput.fill(user.nidInput);
    await this.accountSelect.click();
    await this.page
      .getByRole("option", { name: new RegExp(user.accountType) })
      .click();
    await this.createUserButton.click();
  }
}
