export default async function run(page, ui) {
  const out = {}
  await page.locator('.title-actions-inline button.primary', { hasText: 'E-Usulan Kegiatan' }).click()
  await page.waitForSelector('.modal')
  out.modalText = await page.evaluate(() => document.querySelector('.modal')?.innerText?.slice(0, 300))
  out.inputs = await page.evaluate(() => Array.from(document.querySelectorAll('.modal input, .modal select')).map(i => ({ name: i.name, type: i.type })))
  const setVal = (name, value) => page.evaluate(([n, v]) => {
    const el = document.querySelector(`.modal input[name="${n}"], .modal select[name="${n}"]`)
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }, [name, value])
  out.nama = await setVal('nama', 'Uji Coba Simpan QA')
  out.pagu = await setVal('pagu', '2500000')
  out.pj = await setVal('penanggung', 'PPTK QA')
  out.target = await setVal('target', 'Output uji coba')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.modal button[type="submit"]')).find(b => b.textContent.includes('E-Usulan Kegiatan'))
    btn?.click()
  })
  await page.waitForTimeout(1500)
  const body = await page.evaluate(() => document.body.innerText)
  out.saved = body.includes('Uji Coba Simpan QA')
  out.toast = (body.match(/[^\n]*berhasil[^\n]*/) || [''])[0]
  out.modalStillOpen = await page.evaluate(() => !!document.querySelector('.modal'))
  await page.screenshot({ path: 'c:/temp/after-save.png' })
  return out
}
const snap = await ui.snapshot()
const refs = snap.split('\n').filter(l => l.includes('textbox') || l.includes('spinbutton') || l.includes('combobox') || l.includes('Tambah'))
out.modalFields = refs

const fill = async (pattern, value) => {
  const ref = snap.match(pattern)?.[1]
  if (ref) { await ui.fill(ref, value); return true }
  return false
}
out.nama = await fill(/@(e\d+) textbox "Nama usulan kegiatan"/, 'Uji Coba Simpan QA')
out.pagu = await fill(/@(e\d+) spinbutton "Pagu anggaran \(Rp\)"/, '2500000')
out.pj = await fill(/@(e\d+) textbox "Penanggung jawab \(Kasi \/ PPTK\)"/, 'PPTK QA')
out.target = await fill(/@(e\d+) textbox "Target indikator \/ output"/, 'Output uji coba')

const submit = snap.match(/@(e\d+) button "Tambah E-Usulan Kegiatan"/)?.[1]
out.submitFound = !!submit
if (submit) { await ui.click(submit); await page.waitForTimeout(1500) }

const body = await page.evaluate(() => document.body.innerText)
out.saved = body.includes('Uji Coba Simpan QA')
out.toast = (body.match(/[^\n]*berhasil[^\n]*/) || [''])[0]

await page.evaluate(() => document.querySelector('.theme-switch')?.click())
await page.waitForTimeout(500)
out.theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
out.darkChecks = await page.evaluate(() => {
  const cs = el => el ? getComputedStyle(el).color : 'none'
  return {
    brandMark: cs(document.querySelector('.brand-mark')),
    navBtn: cs(document.querySelector('.nav-group button')),
  }
})
out.sidebarScroll = await page.evaluate(() => {
  const nav = document.querySelector('.sidebar nav')
  return nav ? { overflowY: getComputedStyle(nav).overflowY, scrollHeight: nav.scrollHeight, clientHeight: nav.clientHeight } : null
})
await page.screenshot({ path: 'c:/temp/dark-planning.png' })
return out
}
