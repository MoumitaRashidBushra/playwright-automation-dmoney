import { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly emailOrPhoneInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.emailOrPhoneInput = page.getByRole("textbox", {
      name: "Email or Phone Number",
    });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.loginButton = page.getByRole("button", { name: "Login →" });
  }

  async login(email: string, password: string) {
    await this.emailOrPhoneInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
