import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixture = (scene, theme = 'light') => `/tests/ui.html?scene=${scene}&theme=${theme}`;
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('main')].every(main => main.scrollWidth <= main.clientWidth + 1))).toBe(true);
}
for (const theme of ['light','dark']) {
  for (const scene of ['watchlist','collection','savings','settings','home']) {
    test(`${scene} ${theme}: reflow, contrast, accessible structure`, async ({ page }, testInfo) => {
      await page.goto(fixture(scene,theme));
      await expect(page.locator('h1')).toBeVisible();
      await noOverflow(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(results.violations.map(({id,nodes}) => ({id,nodes:nodes.map(n=>n.target)}))).toEqual([]);
      await page.screenshot({ path:testInfo.outputPath(`${scene}-${theme}.png`), fullPage:true });
    });
  }
}
for (const theme of ['light','dark']) {
  test(`product dialogs ${theme}: names, contrast and bounds`, async ({page},testInfo) => {
    await page.goto(fixture('watchlist',theme));
    await page.getByRole('button',{name:'View Product',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Wireless headphones for everyday listening');
    for (const history of [false,true]) {
      if (history) await page.getByRole('button',{name:'Price History',exact:true}).click();
      const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
      expect(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1)).toBe(true);
    }
    await page.screenshot({path:testInfo.outputPath(`product-${theme}.png`),fullPage:true});
  });
  test(`dashboard shell ${theme}: onboarding, navigation and logout`, async ({page},testInfo) => {
    await page.goto(fixture('dashboard',theme));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await noOverflow(page);
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
    const targets=await page.locator('button:visible').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('aria-label')||n.textContent.trim(),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})).filter(n=>n.width<43.9||n.height<43.9));
    expect(targets).toEqual([]);
    await page.screenshot({path:testInfo.outputPath(`dashboard-${theme}.png`),fullPage:true});
    if (await page.getByRole('button',{name:'Log out',exact:true}).isVisible()) {
      await page.getByRole('button',{name:'Log out',exact:true}).click();
      await expect(page.getByRole('alertdialog',{name:'Log out?'})).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button',{name:'Log out',exact:true})).toBeFocused();
    }
  });
}
for (const scene of ['landing','login','register']) {
  test(`${scene}: responsive public surface`, async ({ page }, testInfo) => {
    await page.goto(fixture(scene));
    await expect(page.locator('h1')).toBeVisible();
    await noOverflow(page);
    const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations.map(({id,nodes})=>({id,nodes:nodes.map(n=>n.target)}))).toEqual([]);
    await page.screenshot({ path:testInfo.outputPath(`${scene}.png`), fullPage:true });
  });
}
test('dialog traps focus, handles Escape, and restores the trigger', async ({ page }) => {
  await page.goto(fixture('dialog'));
  const trigger = page.getByRole('button',{name:'Open dialog',exact:true});
  await trigger.click();
  await expect(page.getByRole('dialog',{name:'Account confirmation'})).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
test('keyboard selection and list sorting preserve native semantics', async ({ page }) => {
  await page.goto(fixture('watchlist'));
  await page.getByRole('button',{name:'Edit watchlist'}).click();
  const checkbox=page.getByRole('checkbox',{name:'Select Wireless headphones for everyday listening'});
  await checkbox.focus(); await page.keyboard.press('Space'); await expect(checkbox).toBeChecked();
  await page.getByRole('button',{name:'List view'}).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('checkbox',{name:'Select Wireless headphones for everyday listening'})).toBeChecked();
  if (await page.getByLabel('Sort products').isVisible()) {
    await page.getByLabel('Sort products').selectOption('price');
    await expect(page.getByRole('button',{name:'Ascending',exact:true})).toBeEnabled();
  } else {
    await page.getByRole('button',{name:'Current price',exact:true}).click();
    await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Current price');
  }
});
test('collection banner and modal stay within narrow bounds', async ({ page }) => {
  await page.goto(fixture('collection'));
  await page.getByRole('button',{name:/Next upgrade/}).click();
  const banner=await page.locator('.cl-banner').boundingBox();
  const heading=await page.getByRole('heading',{name:'Tracked items'}).boundingBox();
  expect(banner.y+banner.height).toBeLessThanOrEqual(heading.y);
  await noOverflow(page);
});
test('320px reflow remains usable with enlarged text', async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  for (const scene of ['watchlist','collection','savings','settings','login','register','landing']) {
    await page.goto(fixture(scene));
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(()=>{ document.documentElement.style.fontSize='200%'; });
    await noOverflow(page);
  }
});
test('public routes load and keep the dashboard protected', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Good things come to those who track.'})).toBeVisible();
  await page.getByRole('link',{name:'Sign in',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Welcome back!'})).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
test('fetch and save celebrate once; reduced motion suppresses particles', async ({ page },testInfo) => {
  await page.route(/(microlink|productInfo|product-info).*url=/,route=>route.fulfill({json:{name:'Test headphones',price:2400,original:3200,status:'success',data:{title:'Test headphones PHP 2400',description:'PHP 2400'}}}));
  await page.goto(fixture('watchlist'));
  await page.getByRole('button',{name:'Add item',exact:true}).click();
  await page.getByLabel('Product link').fill('https://shopee.ph/product/test');
  await page.getByRole('button',{name:'Fetch',exact:true}).click();
  await expect(page.getByLabel('Product name')).toHaveValue('Test headphones');
  await expect(page.locator('.pf-celebration')).toHaveCount(1);
  await page.getByLabel('Target price',{exact:true}).fill('2000');
  await page.getByLabel('Alert expires on').fill('2027-01-01');
  await page.getByRole('button',{name:'Save and track'}).click();
  await expect(page.getByRole('heading',{name:'Item tracked successfully!'})).toBeVisible();
  await noOverflow(page);
  await page.screenshot({path:testInfo.outputPath('success.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Add item',exact:true}).click();
  await page.getByLabel('Product link').fill('https://shopee.ph/product/test');
  await page.getByRole('button',{name:'Fetch',exact:true}).click();
  await expect(page.getByLabel('Product name')).toHaveValue('Test headphones');
  // Existing decorative canvases may finish; no new canvas is created for this fetch.
  await expect(page.locator('.pf-celebration')).toHaveCount(0);
});

test('auth pages fit standard laptop and mobile viewports', async ({ page }) => {
  for (const viewport of [{width:1280,height:720},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    for (const route of ['login','register']) {
      await page.goto('/'+route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      await expect(page.getByRole('button',{name:route==='login'?'Sign in':'Create account',exact:true})).toBeInViewport();
    }
  }
});
