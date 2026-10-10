import { Locator, Page } from "@playwright/test";

export class AdminUsersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async searchByEmail(email: string): Promise<Locator> {
    await this.page.getByRole("combobox").first().click();
    await this.page.getByRole("option", { name: "Search by Email" }).click();
    await this.page.getByRole("textbox", { name: "Enter Email" }).fill(email);
    await this.page.getByRole("button", { name: "Search" }).click();
    return this.page.getByRole("row").filter({ hasText: email });
  }

  async activateUser() {
    await this.page.getByRole("button", { name: "Edit User" }).click();
    await this.page.getByRole("combobox").nth(1).click();
    await this.page
      .getByRole("option", { name: "Active", exact: true })
      .click();
    await this.page.getByRole("button", { name: "Save Changes" }).click();
  }

  async logout() {
    await this.page
      .locator("header")
      .getByText("Admin", { exact: true })
      .last()
      .click();
    await this.page.getByRole("menuitem", { name: /Logout/ }).click();
  }
}
