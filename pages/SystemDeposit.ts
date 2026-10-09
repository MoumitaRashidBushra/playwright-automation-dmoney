import { Locator, Page } from "@playwright/test";

export class SystemDepositPage {
  readonly page: Page;
  readonly agentPhoneInput: Locator;
  readonly amountInput: Locator;
  readonly depositButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentPhoneInput = page.getByRole("textbox", {
      name: "Customer Phone Number",
    });
    this.amountInput = page.getByRole("spinbutton", { name: "Amount (BDT)" });
    this.depositButton = page.getByRole("button", { name: "Cash In →" });
  }

  async depositToAgent(phoneNumber: string, amount: number) {
    await this.agentPhoneInput.fill(phoneNumber);
    await this.amountInput.fill(amount.toString());
    await this.depositButton.click();
  }

  async logout() {
    await this.page
      .getByRole("banner")
      .getByText("SYSTEM", { exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: /Logout/ }).click();
  }
}
