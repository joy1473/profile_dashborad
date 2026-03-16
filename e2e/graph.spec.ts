import { test, expect } from "@playwright/test";

test.describe("그래프 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/graph");
  });

  test("그래프 페이지가 렌더링된다", async ({ page }) => {
    await expect(page.getByTestId("page-title")).toHaveText("그래프");
  });

  test("필터 영역이 표시된다", async ({ page }) => {
    await expect(page.getByTestId("graph-filters")).toBeVisible();
  });

  test("검색 입력이 동작한다", async ({ page }) => {
    const searchInput = page.getByTestId("graph-search");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("테스트 노드");
    await expect(searchInput).toHaveValue("테스트 노드");
  });

  test("그래프 컨테이너가 렌더링된다", async ({ page }) => {
    const container = page.locator(".min-h-\\[400px\\]");
    await expect(container).toBeVisible();
  });
});
