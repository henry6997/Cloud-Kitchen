import { expect, test } from "@playwright/test";

/**
 * Browse, add to cart, place a cash-on-delivery order, then the owner sees it
 * and walks it to delivered. Uses the seeded demo accounts (see README).
 */
const CUSTOMER = { email: "priya@example.com", password: process.env.DEMO_CUSTOMER_PASSWORD ?? "priya-demo-123" };
const OWNER = { email: "owner@blip.test", password: process.env.DEMO_OWNER_PASSWORD ?? "owner-demo-123" };
const ADMIN = "http://localhost:3001";

test("customer orders, owner delivers", async ({ page, browser }) => {
  // Browse and add a simple dish straight from the menu.
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Add Paneer Tikka Wrap" }).click();
  await page.getByRole("button", { name: "Add one" }).first().click();
  await expect(page.getByText("2 items")).toBeVisible();

  // Cart to checkout, signing in on the way.
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await page.getByRole("link", { name: /Checkout/ }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password").fill(CUSTOMER.password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/checkout/);

  // Cash on delivery to the default address.
  await page.getByLabel(/Cash on delivery/).check();
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/order\/.+placed=1/);
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  const orderNumber = (await page.getByText(/^Order #\d+$/).first().textContent())?.replace("Order #", "") ?? "";
  expect(orderNumber).not.toBe("");

  // Owner signs in on the dashboard, finds the order, and moves it forward.
  const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const admin = await ownerCtx.newPage();
  await admin.goto(`${ADMIN}/login`);
  await admin.getByLabel("Email").fill(OWNER.email);
  await admin.getByLabel("Password").fill(OWNER.password);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL(`${ADMIN}/`);
  await admin.goto(`${ADMIN}/orders?tab=new`);
  await admin.getByRole("link", { name: new RegExp(`#${orderNumber}`) }).click();

  for (const label of ["Accept order", "Start preparing", "Mark ready"]) {
    await admin.getByRole("button", { name: label }).click();
    await expect(admin.getByText("Order updated")).toBeVisible();
  }
  await admin.getByLabel("Name").fill("Ravi");
  await admin.getByRole("button", { name: "Save rider" }).click();
  await admin.getByRole("button", { name: "Send out for delivery" }).click();
  await admin.getByRole("button", { name: "Mark delivered" }).click();
  await admin.getByRole("button", { name: "Mark cash collected" }).click();
  await expect(admin.getByText("Cash collected").first()).toBeVisible();

  // The customer's tracking page follows along live.
  await expect(page.getByRole("heading", { name: "Delivered" })).toBeVisible({ timeout: 15_000 });
  await ownerCtx.close();
});

test("the admin app is closed to the public", async ({ request }) => {
  const res = await request.get(`${ADMIN}/orders`, { maxRedirects: 0 });
  expect([302, 307]).toContain(res.status());
  const api = await request.get(`${ADMIN}/api/notifications`);
  expect(api.status()).toBe(401);
});

test("online payment (demo gateway) confirms the order, and Reorder refills the cart", async ({ page }) => {
  await page.goto("/login?next=/menu");
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password").fill(CUSTOMER.password);
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/menu/);

  await page.getByRole("button", { name: "Add Warm Brownie" }).click();
  await page.getByRole("button", { name: "Add one" }).first().click();
  await page.goto("/checkout");
  await page.getByLabel(/Pay now/).check();
  await page.getByRole("button", { name: /Pay now/ }).click();

  // Not confirmed until payment succeeds: the demo gateway comes first.
  await page.waitForURL(/\/pay\//);
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  await page.waitForURL(/\/order\/.+return=1/);
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible();

  await page.goto("/orders");
  await page.getByRole("button", { name: "Reorder" }).first().click();
  await page.waitForURL(/\/cart/);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Warm Brownie")).toBeVisible();
});
