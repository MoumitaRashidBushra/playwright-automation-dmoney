import { Locator, Page } from "@playwright/test";

export class AgentCashInPage {
  readonly page: Page;
  readonly customerPhoneInput: Locator;
  readonly amountInput: Locator;
  readonly cashInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerPhoneInput = page.getByRole("textbox", {
      name: "Customer Phone Number",
    });
    this.amountInput = page.getByRole("spinbutton", { name: "Amount (BDT)" });
    this.cashInButton = page.getByRole("button", { name: "Cash In →" });
  }

  async cashIn(phoneNumber: string, amount: number) {
    await this.customerPhoneInput.fill(phoneNumber);
    await this.amountInput.fill(amount.toString());
    await this.cashInButton.click();
  }

  async logout() {
    await this.page
      .getByRole("banner")
      .getByText("Agent", { exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: /Logout/ }).click();
  }
}
