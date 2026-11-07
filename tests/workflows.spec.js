import {readFileSync} from "node:fs";
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture=scene=>`/tests/ui.html?scene=${scene}`;
test('collection picker keeps other memberships and supports rename',async({page})=>{
 await page.goto(fixture('collection'));
 await page.getByRole('button',{name:/Travel/}).click();
 await page.getByRole('button',{name:'Add from Watchlist',exact:true}).click();
 await expect(page.getByText('Item is also in Next upgrade collection')).toBeVisible();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Add selected items'}).click();
 await expect(page.getByRole('button',{name:'View in Watchlist'})).toBeVisible();
 await page.getByRole('button',{name:'Edit collection',exact:true}).click();
 await page.getByLabel('Collection name',{exact:true}).fill('Travel gear');
 await page.getByRole('button',{name:'Save name'}).click();
 await expect(page.getByRole('heading',{level:1,name:'Travel gear'})).toBeVisible();
 await page.getByRole('button',{name:'Back to Collections'}).click();
 await page.getByRole('button',{name:/Next upgrade/}).click();
 await expect(page.getByRole('button',{name:'View in Watchlist'})).toBeVisible();
});
test('purchase requires confirmation and can be cancelled',async({page})=>{
 await page.goto(fixture('watchlist'));
 await page.getByRole('button',{name:'View Product',exact:true}).click();
 await page.getByRole('button',{name:'Mark as bought',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Mark this item as bought?'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Mark as bought',exact:true}).click();
 await page.getByRole('button',{name:'Confirm purchase',exact:true}).click();
 await expect(page.getByRole('heading',{name:"It's quiet in here."})).toBeVisible();
});
test('purchase details retain history and undo removes the purchase',async({page})=>{
 await page.goto(fixture('savings'));
 await page.getByRole('button',{name:/Wireless headphones/}).click();
 await expect(page.getByText(/Purchased:/)).toBeVisible();
 await page.getByRole('button',{name:'Price History',exact:true}).click();
 const chart=page.getByRole('img',{name:'Price history chart'});await chart.focus();
 await expect(page.getByRole('status')).toContainText('Tax: Not provided');
 await page.getByRole('button',{name:'Undo mark as bought'}).click();
 await expect(page.getByText(/No purchases yet/)).toBeVisible();
});
test('name edits require saving and account email is read only',async({page})=>{
 await page.goto(fixture('settings'));
 await page.getByRole('button',{name:'Account settings'}).click();
 await expect(page.getByText('test@example.com')).toBeVisible();
 await expect(page.locator('input[type=email]')).toHaveCount(0);
 await page.getByRole('button',{name:'Edit display name'}).click();
 await page.getByLabel('Display name',{exact:true}).fill('Alex Rivera');
 await expect(page.locator('.st-profile-name')).toContainText('Alex');
 await page.getByRole('button',{name:'Confirm and save name'}).click();
 await expect(page.locator('.st-profile-name')).toContainText('Alex Rivera');
 await page.getByRole('button',{name:'Change password'}).click();
 await page.getByLabel('Current password',{exact:true}).fill('OldPass123!');
 await page.getByLabel('New password',{exact:true}).fill('NewPass123!');
 await page.getByLabel('Confirm new password',{exact:true}).fill('NewPass123!');
 await page.getByRole('button',{name:'Update password'}).click();
 await expect(page.getByRole('heading',{name:'Confirm password change'})).toBeVisible();
});
test('header profile actions and notifications are nonmodal popovers',async({page})=>{
 await page.goto(fixture('dashboard'));await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Profile menu'}).click();
 await expect(page.getByRole('dialog',{name:'Your profile'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Profile menu'})).toBeFocused();
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Notifications'})).toBeVisible();
 await expect(page.locator('dialog:modal')).toHaveCount(0);
 await expect(page.locator('.db-side')).not.toHaveAttribute('inert','');
});
for(const route of ['privacy','help']) test(`${route} public page is accessible`,async({page})=>{
 await page.goto('/'+route);await expect(page.locator('h1')).toBeVisible();
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
});

test('registration returns to sign in with the registered email',async({page})=>{
 const source=readFileSync('src/lib/firebase.js','utf8');
 const names=[...source.matchAll(/export const (\w+)/g)].map(m=>m[1]);
 const implementations={auth:'{currentUser:null}',watchAuth:'(callback)=>{callback(null);return ()=>{};}',register:'async(email,password,fullName)=>{window.__registered={email,fullName};return {user:{email}};}',registerWithGoogle:'async()=>"google@example.com"'};
 await page.route('**/src/lib/firebase.js*',route=>route.fulfill({contentType:'application/javascript',body:names.map(n=>`export const ${n} = ${implementations[n] || '()=>{}'};`).join('\n')}));
 await page.goto('/register');
 const fields=page.locator('.li-form input');
 await expect(fields.nth(0)).toHaveAttribute('id','su-name');await expect(fields.nth(1)).toHaveAttribute('id','su-email');
 await page.getByLabel('Full name',{exact:true}).fill('Maria Clara Santos');
 await page.getByLabel('Email',{exact:true}).fill('maria@example.com');
 await page.getByLabel('Password',{exact:true}).fill('TestPass123!');await page.getByLabel('Confirm password',{exact:true}).fill('TestPass123!');
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page).toHaveURL(/\/login$/);
 await expect(page.getByLabel('Email',{exact:true})).toHaveValue('maria@example.com');
 expect(await page.evaluate(()=>window.__registered.fullName)).toBe('Maria Clara Santos');
 await page.goto('/register');await page.getByRole('button',{name:'Continue with Google'}).click();
 await expect(page).toHaveURL(/\/login$/);await expect(page.getByLabel('Email',{exact:true})).toHaveValue('google@example.com');
});

test('price notification opens the matching product',async({page})=>{
 await page.goto(fixture('notifications'));await page.getByRole('button',{name:'Open notifications'}).click();
 await page.getByRole('button',{name:/Your tracked price has changed/}).click();
 await expect(page.getByRole('dialog',{name:'Wireless headphones for everyday listening'})).toBeVisible();
});
