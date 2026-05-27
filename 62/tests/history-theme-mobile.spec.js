const { test, expect } = require('@playwright/test');

test.describe('历史记录功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('历史记录初始状态', async ({ page }) => {
    await expect(page.locator('.empty-history')).toHaveText('暂无记录');
  });

  test('历史记录正确记录对战结果', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await cells.nth(3).click();
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(2).click();
    
    await page.click('#modalCloseBtn');
    
    const historyItems = page.locator('.history-item');
    await expect(historyItems).toHaveCount(1);
    await expect(historyItems.nth(0)).toContainText('X 获胜');
  });

  test('历史记录最多保存5局', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    
    for (let i = 0; i < 6; i++) {
      await cells.nth(0).click();
      await cells.nth(3).click();
      await cells.nth(1).click();
      await cells.nth(4).click();
      await cells.nth(2).click();
      
      await page.click('#modalCloseBtn');
    }
    
    const historyItems = page.locator('.history-item');
    await expect(historyItems).toHaveCount(5);
  });

  test('历史记录包含平局', async ({ page }) => {
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
    
    await page.click('#modalCloseBtn');
    
    const historyItems = page.locator('.history-item');
    await expect(historyItems).toHaveCount(1);
    await expect(historyItems.nth(0)).toContainText('平局');
  });

  test('重置分数会清空历史记录', async ({ page }) => {
    await page.selectOption('#gameMode', 'pvp');
    const cells = page.locator('.cell');
    
    await cells.nth(0).click();
    await cells.nth(3).click();
    await cells.nth(1).click();
    await cells.nth(4).click();
    await cells.nth(2).click();
    
    await page.click('#modalCloseBtn');
    await page.click('#resetScoreBtn');
    
    await expect(page.locator('.empty-history')).toHaveText('暂无记录');
  });
});

test.describe('主题切换功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('初始主题为经典蓝白', async ({ page }) => {
    await expect(page.locator('body')).toHaveClass(/theme-classic/);
  });

  test('切换到暗色主题', async ({ page }) => {
    await page.click('#themeBtn');
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
  });

  test('切换回经典主题', async ({ page }) => {
    await page.click('#themeBtn');
    await page.click('#themeBtn');
    await expect(page.locator('body')).toHaveClass(/theme-classic/);
  });

  test('主题设置持久化', async ({ page }) => {
    await page.click('#themeBtn');
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
    
    await page.reload();
    
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
  });
});

test.describe('移动端触摸事件测试', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('移动端页面正常显示', async ({ page }) => {
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.cell')).toHaveCount(9);
  });

  test('移动端触摸落子', async ({ page }) => {
    const cells = page.locator('.cell');
    
    await page.evaluate(() => {
      const cell = document.querySelector('.cell');
      if (cell) {
        const touch = new Touch({
          identifier: Date.now(),
          target: cell,
          clientX: 50,
          clientY: 50,
          pageX: 50,
          pageY: 50
        });
        const touchEndEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch]
        });
        cell.dispatchEvent(touchEndEvent);
      }
    });
    
    await expect(cells.nth(0)).toHaveText('X');
  });

  test('移动端响应式布局', async ({ page }) => {
    const board = page.locator('.board');
    const boardBox = await board.boundingBox();
    
    expect(boardBox.width).toBeGreaterThan(200);
    expect(boardBox.width).toBeLessThan(400);
  });

  test('移动端按钮可点击', async ({ page }) => {
    const cells = page.locator('.cell');
    
    await page.evaluate(() => {
      const cell = document.querySelector('.cell');
      if (cell) {
        const touch = new Touch({
          identifier: Date.now(),
          target: cell,
          clientX: 50,
          clientY: 50,
          pageX: 50,
          pageY: 50
        });
        const touchEndEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch]
        });
        cell.dispatchEvent(touchEndEvent);
      }
    });
    
    await expect(cells.nth(0)).toHaveText('X');
    
    await page.evaluate(() => {
      const btn = document.querySelector('#resetBtn');
      if (btn) {
        const touch = new Touch({
          identifier: Date.now(),
          target: btn,
          clientX: 50,
          clientY: 50,
          pageX: 50,
          pageY: 50
        });
        const touchEndEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch]
        });
        btn.dispatchEvent(touchEndEvent);
      }
    });
    
    await page.waitForTimeout(100);
    await expect(cells.nth(0)).toHaveText('');
  });
});

test.describe('音效系统测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AudioContext函数存在', async ({ page }) => {
    const hasAudioContext = await page.evaluate(() => {
      return typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined';
    });
    expect(hasAudioContext).toBe(true);
  });

  test('playSound函数存在', async ({ page }) => {
    const hasPlaySound = await page.evaluate(() => {
      return typeof window.playSound === 'function';
    });
    expect(hasPlaySound).toBe(true);
  });

  test('音效可以被禁用', async ({ page }) => {
    const soundCheckbox = page.locator('#soundEnabled');
    await soundCheckbox.uncheck();
    
    const soundEnabled = await page.evaluate(() => {
      return gameState.soundEnabled;
    });
    expect(soundEnabled).toBe(false);
  });

  test('落子时触发音效', async ({ page }) => {
    const cells = page.locator('.cell');
    
    const soundTriggered = await page.evaluate(() => {
      return new Promise((resolve) => {
        const cell = document.querySelector('.cell');
        if (!cell) {
          resolve(false);
          return;
        }
        
        const originalInitAudio = window.initAudio;
        let called = false;
        window.initAudio = function() {
          called = true;
          if (originalInitAudio) {
            originalInitAudio.call(this);
          }
        };
        
        cell.click();
        
        setTimeout(() => {
          window.initAudio = originalInitAudio;
          resolve(called);
        }, 100);
      });
    });
    
    expect(soundTriggered).toBe(true);
  });
});
