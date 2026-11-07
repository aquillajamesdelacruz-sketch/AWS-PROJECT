import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const view of ['Card', 'List']) {
  test(`delete products individually in ${view.toLowerCase()} edit view`, async ({page}) => {
    await page.goto('/tests/ui.html?scene=watchlist&multiple');
    await page.getByRole('button', {name:'Edit watchlist', exact:true}).click();
    await page.getByRole('button', {name:`${view} view`, exact:true}).click();
    await page.getByRole('button', {name:'Delete Wireless headphones for everyday listening', exact:true}).click();
    await expect(page.getByRole('alertdialog')).toContainText('Wireless headphones for everyday listening');
    await page.getByRole('button', {name:'Cancel', exact:true}).click();
    await expect(page.getByText('Travel keyboard', {exact:true})).toBeVisible();
    await page.getByRole('button', {name:'Delete Wireless headphones for everyday listening', exact:true}).click();
    await page.getByRole('button', {name:'Delete item', exact:true}).click();
    await expect(page.getByRole('button', {name:'Delete Wireless headphones for everyday listening', exact:true})).toHaveCount(0);
    await expect(page.getByRole('button', {name:'Edit watchlist', exact:true})).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', {name:'Delete Travel keyboard', exact:true}).click();
    await page.getByRole('button', {name:'Delete item', exact:true}).click();
    await expect(page.getByRole('heading', {name:"It's quiet in here."})).toBeVisible();
  });
}

test('select one product and bulk-delete only that selection', async ({page}) => {
  await page.goto('/tests/ui.html?scene=watchlist&multiple');
  await page.getByRole('button', {name:'Edit watchlist', exact:true}).click();
  await page.getByRole('checkbox', {name:'Select Travel keyboard', exact:true}).check();
  await expect(page.getByText('1 item selected', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Delete selected', exact:true}).click();
  await page.getByRole('button', {name:'Delete item', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Travel keyboard', exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading', {name:'Wireless headphones for everyday listening', exact:true})).toBeVisible();
});

test('failed deletion keeps the product and allows cancellation', async ({page}) => {
  await page.goto('/tests/ui.html?scene=watchlist&multiple&deleteError');
  await page.getByRole('button', {name:'Edit watchlist', exact:true}).click();
  await page.getByRole('button', {name:'Delete Travel keyboard', exact:true}).click();
  await page.getByRole('button', {name:'Delete item', exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Could not delete');
  await page.getByRole('button', {name:'Cancel', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Travel keyboard', exact:true})).toBeVisible();
});

for (const theme of ['light', 'dark']) {
  test(`edit controls stay inside their product cards in ${theme} mode`, async ({page}, testInfo) => {
    await page.goto(`/tests/ui.html?scene=watchlist&multiple&theme=${theme}`);
    await page.getByRole('button', {name:'Edit watchlist', exact:true}).click();
    for (const card of await page.locator('.wl-card').all()) {
      const parent = await card.boundingBox();
      for (const control of [card.getByRole('checkbox'), card.getByRole('button')]) {
        const bounds = await control.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(parent.x);
        expect(bounds.y).toBeGreaterThanOrEqual(parent.y);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width);
      }
    }
    await page.getByRole('checkbox', {name:'Select Travel keyboard', exact:true}).check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({path:testInfo.outputPath(`watchlist-edit-${theme}.png`), fullPage:true});
  });
}

test('collection deletion uses the same compact actions', async ({page}, testInfo) => {
  await page.goto('/tests/ui.html?scene=collection');
  await page.getByRole('button', {name:'Edit collection', exact:true}).click();
  await page.getByRole('button', {name:/Next upgrade/}).click();
  await expect(page.getByText('1 collection selected', {exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('collection-edit.png'), fullPage:true});
  await page.getByRole('button', {name:'Delete collections', exact:true}).click();
  await page.getByRole('button', {name:'Delete', exact:true}).click();
  await expect(page.getByRole('button', {name:/Next upgrade/})).toHaveCount(0);
  await expect(page.getByRole('button', {name:/Travel/})).toBeVisible();
});
