import { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly emailOrPhoneInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly otpInput: Locator;
  readonly verifyOtpButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.emailOrPhoneInput = page.getByRole("textbox", {
      name: "Email or Phone Number",
    });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.loginButton = page.getByRole("button", { name: "Login →" });
    this.otpInput = page.getByRole("textbox", { name: "Enter 4-Digit OTP" });
    this.verifyOtpButton = page.getByRole("button", { name: "Verify OTP →" });
    this.forgotPasswordLink = page.getByText("Forgot password?", {
      exact: true,
    });
  }

  async login(email: string, password: string) {
    await this.emailOrPhoneInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async submitOtp(otp: string) {
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
  }
}
