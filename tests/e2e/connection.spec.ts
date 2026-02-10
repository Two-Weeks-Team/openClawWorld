import { test, expect } from '@playwright/test';

test('player can connect to world', async ({ page }) => {
  await page.goto('/');

  // Login
  await page.fill('#username-input', 'TestUser');
  await page.click('#join-btn');

  // Wait for Phaser canvas to be ready
  await page.waitForSelector('canvas');

  // Wait for connection
  await page.waitForFunction(() => (window as any).__ocw?.getRoom() !== undefined, {
    timeout: 10000,
  });

  // Verify entity assigned
  const hasEntity = await page.evaluate(() => {
    return (window as any).__ocw?.getMyState() !== undefined;
  });

  expect(hasEntity).toBe(true);
});
