const { test, expect } = require('@playwright/test');

test.describe('井字棋游戏基础功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面加载正确', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('井字棋游戏');
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.cell')).toHaveCount(9);
  });

  test('初始状态正确', async ({ page }) => {
    const cells = page.locator('.cell');
    for (let i = 0; i < 9; i++) {
      await expect(cells.nth(i)).toHaveText('');
    }
    await expect(page.locator('#statusText')).toHaveText('X 的回合');
  });

  test('双人对战 - X获胜', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('X');
    await expect(page.locator('#statusText')).toHaveText('O 的回合');
    
    await cells.nth(3).click();
    await expect(cells.nth(3)).toHaveText('O');
    
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(2).click();
    
    await expect(page.locator('#modalTitle')).toHaveText('游戏结束');
    await expect(page.locator('#modalMessage')).toHaveText('X 获胜了！');
    await expect(page.locator('.cell.winner')).toHaveCount(3);
  });

  test('双人对战 - O获胜', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await cells.nth(3).click();
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(8).click();
    await cells.nth(5).click();
    
    await expect(page.locator('#modalTitle')).toHaveText('游戏结束');
    await expect(page.locator('#modalMessage')).toHaveText('O 获胜了！');
  });

  test('双人对战 - 平局', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await cells.nth(1).click();
    await cells.nth(2).click();
    await cells.nth(4).click();
    await cells.nth(3).click();
    await cells.nth(5).click();
    await cells.nth(7).click();
    await cells.nth(6).click();
    await cells.nth(8).click();
    
    await expect(page.locator('#modalTitle')).toHaveText('平局！');
  });

  test('重新开始按钮功能', async ({ page }) => {
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('X');
    
    await page.click('#resetBtn');
    
    for (let i = 0; i < 9; i++) {
      await expect(cells.nth(i)).toHaveText('');
    }
    await expect(page.locator('#statusText')).toHaveText('X 的回合');
  });

  test('计分板功能', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await cells.nth(3).click();
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(2).click();
    
    await expect(page.locator('#scoreX')).toHaveText('1');
    await expect(page.locator('#scoreO')).toHaveText('0');
    await expect(page.locator('#scoreDraw')).toHaveText('0');
    
    await page.click('#modalCloseBtn');
    await page.click('#resetScoreBtn');
    
    await expect(page.locator('#scoreX')).toHaveText('0');
    await expect(page.locator('#scoreO')).toHaveText('0');
    await expect(page.locator('#scoreDraw')).toHaveText('0');
  });

  test('先手选择功能', async ({ page }) => {
    await page.selectOption('#firstPlayer', 'O');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveText('O');
    await expect(page.locator('#statusText')).toHaveText('X 的回合');
    
    await page.selectOption('#firstPlayer', 'X');
  });

  test('音效开关功能', async ({ page }) => {
    const soundCheckbox = page.locator('#soundEnabled');
    await expect(soundCheckbox).toBeChecked();
    await soundCheckbox.uncheck();
    await expect(soundCheckbox).not.toBeChecked();
    await soundCheckbox.check();
    await expect(soundCheckbox).toBeChecked();
  });
});
