const { test, expect } = require('@playwright/test');

test.describe('悔棋功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('双人对战模式悔棋功能', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    const undoBtn = page.locator('#undoBtn');
    
    await expect(undoBtn).toBeDisabled();
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('X');
    await expect(undoBtn).not.toBeDisabled();
    
    await cells.nth(1).click();
    await expect(cells.nth(1)).toHaveText('O');
    
    await undoBtn.click();
    await expect(cells.nth(1)).toHaveText('');
    await expect(page.locator('#statusText')).toHaveText('O 的回合');
    
    await undoBtn.click();
    await expect(cells.nth(0)).toHaveText('');
    await expect(page.locator('#statusText')).toHaveText('X 的回合');
    await expect(undoBtn).toBeDisabled();
  });

  test('人机对战模式悔棋功能', async ({ page }) => {
    await page.selectOption('#gameMode', 'pve-easy');
    const cells = page.locator('.cell');
    const undoBtn = page.locator('#undoBtn');
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('X');
    
    await page.waitForTimeout(800);
    
    const aiMove = await page.evaluate(() => {
      const cells = document.querySelectorAll('.cell');
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].textContent === 'O') return i;
      }
      return -1;
    });
    
    expect(aiMove).not.toBe(-1);
    await expect(undoBtn).not.toBeDisabled();
    
    await undoBtn.click();
    await expect(cells.nth(0)).toHaveText('');
    await expect(cells.nth(aiMove)).toHaveText('');
    await expect(page.locator('#statusText')).toContainText('你的回合');
  });

  test('游戏结束后无法悔棋', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    const undoBtn = page.locator('#undoBtn');
    
    await cells.nth(0).click();
    await cells.nth(3).click();
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(2).click();
    
    await expect(undoBtn).toBeDisabled();
  });
});

test.describe('AI模式测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('简单模式AI会随机落子', async ({ page }) => {
    await page.selectOption('#gameMode', 'pve-easy');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('X');
    
    await page.waitForTimeout(800);
    
    const occupiedCount = await page.evaluate(() => {
      return document.querySelectorAll('.cell.taken').length;
    });
    
    expect(occupiedCount).toBe(2);
  });

  test('中级模式AI使用Minimax算法', async ({ page }) => {
    await page.selectOption('#gameMode', 'pve-medium');
    const cells = page.locator('.cell');
    
    const hasMinimax = await page.evaluate(() => {
      return typeof minimax === 'function';
    });
    
    expect(hasMinimax).toBe(true);
  });

  test('中级模式AI会防守', async ({ page }) => {
    await page.selectOption('#gameMode', 'pve-medium');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await page.waitForTimeout(800);
    
    await cells.nth(1).click();
    await page.waitForTimeout(800);
    
    const cell2Text = await cells.nth(2).textContent();
    expect(cell2Text).toBe('O');
  });

  test('中级模式AI会利用获胜机会', async ({ page }) => {
    await page.selectOption('#gameMode', 'pve-medium');
    await page.selectOption('#firstPlayer', 'O');
    
    const cells = page.locator('.cell');
    
    await page.waitForTimeout(800);
    
    await cells.nth(0).click();
    await page.waitForTimeout(800);
    
    await cells.nth(2).click();
    await page.waitForTimeout(800);
    
    await cells.nth(6).click();
    await page.waitForTimeout(800);
    
    const aiWin = await page.evaluate(() => {
      return document.querySelector('.cell.winner') !== null;
    });
    
    expect(aiWin).toBe(true);
  });
});
