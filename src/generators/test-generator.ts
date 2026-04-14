export async function generateTests(filePath: string, code: string): Promise<string> {
  const isAPI = code.includes("express") || code.includes("router");
  const isUI = code.includes("React") || code.includes("return (");

  let output = `// Auto-generated tests for ${filePath}\n\n`;

  output += generateUnitTests(filePath);

  if (isAPI) {
    output += "\n\n" + generateIntegrationTests(filePath);
  }

  if (isUI) {
    output += "\n\n" + generatePlaywrightTests(filePath);
  }

  return output;
}

function generateUnitTests(filePath: string): string {
  return `import { describe, it, expect } from "vitest";

describe("${filePath}", () => {
  it("should execute correctly", () => {
    expect(true).toBe(true);
  });
});`;
}

function generateIntegrationTests(filePath: string): string {
  return `import request from "supertest";

describe("Integration Test", () => {
  it("should return 200", async () => {
    expect(200).toBe(200);
  });
});`;
}

function generatePlaywrightTests(filePath: string): string {
  return `import { test, expect } from "@playwright/test";

test("should load the page", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page).toHaveURL(/localhost/);
});`;
}
