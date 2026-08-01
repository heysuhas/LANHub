export default async (page) => {
  await page.getByRole('tab', { name: 'Register' }).click();
  await page.getByLabel('Username').fill(`before-${Date.now()}`);
  await page.getByLabel('Display Name').fill('Before Fix');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByRole('button', { name: 'Encrypted Chat' }).click();
  await page.getByPlaceholder(/Message #General Chat/).fill('General chat should show this message');
  await page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).last().click();
  await page.waitForTimeout(1000);
};
