import { Locator, Page } from "@playwright/test";

export class PasswordResetPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resetPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", {
      name: "Email or Phone Number",
    });
    this.sendResetLinkButton = page.getByRole("button", {
      name: "Send Reset Link →",
    });
    this.newPasswordInput = page.getByRole("textbox", {
      name: "New Password",
      exact: true,
    });
    this.confirmPasswordInput = page.getByRole("textbox", {
      name: "Confirm New Password",
      exact: true,
    });
    this.resetPasswordButton = page.getByRole("button", {
      name: /Reset Password/i,
    });
  }

  async requestReset(email: string) {
    await this.emailInput.fill(email);
    await this.sendResetLinkButton.click();
  }

  async resetPassword(password: string) {
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.resetPasswordButton.click();
  }
}
