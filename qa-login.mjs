export default async function run(page, ui) {
  const result = { steps: [] }
  const user = page.locator('input[name="username"]')
  const pass = page.locator('input[name="password"]')
  await user.fill('admin')
  await pass.fill('admin123')
  const captcha = (await page.locator('.captcha-code').innerText()).trim()
  await page.locator('input[placeholder="Masukkan huruf dan angka"]').fill(captcha)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(1500)
  result.steps.push('login selesai')
  const hasError = await page.locator('.login-error').count()
  if (hasError) {
    result.steps.push('LOGIN GAGAL: ' + (await page.locator('.login-error').innerText()))
    return result
  }
  result.title = await page.title()
  await page.waitForTimeout(1000)
  result.nav = await page.evaluate(() => Array.from(document.querySelectorAll('.nav-group button')).map(b => b.innerText.trim()))
  result.bodyText = (await page.locator('body').innerText()).slice(0, 600)
  return result
}
