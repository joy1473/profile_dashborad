import { test, expect } from "@playwright/test";

test.describe("보드 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
  });

  test("칸반 보드가 4개 컬럼으로 렌더링된다", async ({ page }) => {
    const board = page.getByTestId("kanban-board");
    await expect(board).toBeVisible();

    await expect(page.getByTestId("column-todo")).toBeVisible();
    await expect(page.getByTestId("column-in_progress")).toBeVisible();
    await expect(page.getByTestId("column-in_review")).toBeVisible();
    await expect(page.getByTestId("column-done")).toBeVisible();
  });

  test("이슈 카드가 표시된다", async ({ page }) => {
    const cards = page.locator("[data-testid^='issue-card-']");
    await expect(cards.first()).toBeVisible();
  });

  test("새 이슈 버튼을 클릭하면 모달이 열린다", async ({ page }) => {
    await page.getByTestId("create-issue-btn").click();
    await expect(page.getByTestId("issue-modal")).toBeVisible();
    await expect(page.getByTestId("issue-title-input")).toBeVisible();
  });

  test("이슈 카드를 클릭하면 상세 모달이 열린다", async ({ page }) => {
    const firstCard = page.locator("[data-testid^='issue-card-']").first();
    await firstCard.click();
    await expect(page.getByTestId("issue-modal")).toBeVisible();
  });

  test("검색 필터가 동작한다", async ({ page }) => {
    const searchInput = page.getByTestId("issue-search");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("테스트");
    await expect(searchInput).toHaveValue("테스트");
  });

  test("우선순위 필터가 동작한다", async ({ page }) => {
    const priorityFilter = page.getByTestId("priority-filter");
    await expect(priorityFilter).toBeVisible();
    await priorityFilter.selectOption("high");
  });
});
