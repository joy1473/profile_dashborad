import { test, expect } from "@playwright/test";

test.describe("대시보드 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("메트릭 카드 4개가 표시된다", async ({ page }) => {
    const grid = page.getByTestId("metrics-grid");
    await expect(grid).toBeVisible();
    const cards = grid.locator("> div");
    await expect(cards).toHaveCount(4);
  });

  test("매출 차트가 렌더링된다", async ({ page }) => {
    await expect(page.getByTestId("revenue-chart")).toBeVisible();
  });

  test("트래픽 소스 차트가 렌더링된다", async ({ page }) => {
    await expect(page.getByTestId("category-chart")).toBeVisible();
  });

  test("최근 활동 피드가 표시된다", async ({ page }) => {
    const feed = page.getByTestId("activity-feed");
    await expect(feed).toBeVisible();
    await expect(feed.locator("p").first()).toBeVisible();
  });
});

test.describe("네비게이션", () => {
  test("사이드바에서 각 페이지로 이동할 수 있다", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByTestId("nav-analytics").click();
    await page.waitForURL(/\/analytics/);
    await expect(page.getByTestId("page-title")).toHaveText("분석");

    await page.getByTestId("nav-users").click();
    await page.waitForURL(/\/users/);
    await expect(page.getByTestId("page-title")).toHaveText("사용자");

    await page.getByTestId("nav-settings").click();
    await page.waitForURL(/\/settings/);
    await expect(page.getByTestId("page-title")).toHaveText("설정");

    await page.getByTestId("nav-dashboard").click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByTestId("page-title")).toHaveText("대시보드");
  });

  test("루트 경로가 대시보드로 리다이렉트된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("사용자 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
  });

  test("사용자 테이블이 표시된다", async ({ page }) => {
    await expect(page.getByTestId("users-table")).toBeVisible();
    const rows = page.locator("[data-testid^='user-row-']");
    await expect(rows.first()).toBeVisible();
  });

  test("활성/비활성 필터가 동작한다", async ({ page }) => {
    const allRows = await page.locator("[data-testid^='user-row-']").count();

    await page.getByTestId("filter-active").click();
    const activeRows = await page.locator("[data-testid^='user-row-']").count();
    expect(activeRows).toBeLessThan(allRows);

    await page.getByTestId("filter-inactive").click();
    const inactiveRows = await page.locator("[data-testid^='user-row-']").count();
    expect(inactiveRows).toBeLessThan(allRows);

    await page.getByTestId("filter-all").click();
    const totalRows = await page.locator("[data-testid^='user-row-']").count();
    expect(totalRows).toBe(allRows);
  });
});

test.describe("설정 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("프로필 섹션이 표시된다", async ({ page }) => {
    await expect(page.getByTestId("profile-section")).toBeVisible();
    await expect(page.getByTestId("profile-name")).toHaveValue("관리자");
  });

  test("알림 토글이 동작한다", async ({ page }) => {
    const toggle = page.getByTestId("toggle-push");
    await expect(toggle).toBeVisible();
    await toggle.click();
  });
});

test.describe("헤더", () => {
  test("검색 입력이 동작한다", async ({ page }) => {
    await page.goto("/dashboard");
    const input = page.getByTestId("search-input");
    await input.fill("테스트 검색어");
    await expect(input).toHaveValue("테스트 검색어");
  });

  test("알림 버튼이 표시된다", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("notifications-btn")).toBeVisible();
  });
});

test.describe("다크모드", () => {
  test("다크모드 토글이 동작한다", async ({ page }) => {
    await page.goto("/dashboard");
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

test.describe("분석 페이지", () => {
  test("바 차트와 영역 차트가 렌더링된다", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByTestId("bar-chart")).toBeVisible();
    await expect(page.getByTestId("area-chart")).toBeVisible();
  });
});
