import { test, expect } from "@playwright/test";

test.describe("QR 명함 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/qr-cards");
  });

  test("초기 명함 4개가 리스트에 표시된다", async ({ page }) => {
    const cardList = page.getByTestId("card-list");
    await expect(cardList).toBeVisible();
    const cards = page.locator("[data-testid^='card-item-']");
    await expect(cards).toHaveCount(4);
  });

  test("명함을 클릭하면 QR 코드가 표시된다", async ({ page }) => {
    const firstCard = page.locator("[data-testid^='card-item-']").first();
    await firstCard.click();

    const qrPanel = page.getByTestId("qr-panel");
    await expect(qrPanel.locator("img[alt='QR Code']")).toBeVisible();
  });

  test("명함 추가 버튼을 클릭하면 폼이 열린다", async ({ page }) => {
    await page.getByTestId("add-card-btn").click();
    await expect(page.getByTestId("card-form")).toBeVisible();
  });

  test("필수 정보를 입력하고 등록하면 명함이 추가된다", async ({ page }) => {
    await page.getByTestId("add-card-btn").click();

    await page.getByPlaceholder("이름 *").fill("테스트 사용자");
    await page.getByPlaceholder("이메일 *").fill("test@example.com");
    await page.getByPlaceholder("핸드폰 *").fill("010-1234-5678");

    await page.getByRole("button", { name: "등록" }).click();

    const cards = page.locator("[data-testid^='card-item-']");
    await expect(cards).toHaveCount(5);
  });

  test("명함 삭제 버튼이 동작한다", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    const deleteButtons = page.locator("button[title='삭제']");
    await deleteButtons.last().click();

    const cards = page.locator("[data-testid^='card-item-']");
    await expect(cards).toHaveCount(3);
  });
});
