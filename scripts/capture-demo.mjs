import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin=process.env.DEMO_URL||'http://127.0.0.1:3210';
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('docs/screenshots',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:1});
 for(const [view,name] of [['overview','dashboard-desktop'],['leads','workspace-desktop'],['quality','quality-desktop']]){
  await page.goto(`${origin}/?view=${view}&lead=lead-1`);
  await page.locator('main h1').waitFor();
  await page.screenshot({path:`docs/screenshots/${name}.png`,animations:'disabled',fullPage:view==='quality'});
  console.log(`Saved ${name}`);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(`${origin}/?view=overview`);await page.locator('main h1').waitFor();await page.screenshot({path:'docs/screenshots/dashboard-mobile.png',animations:'disabled',fullPage:true});console.log('Saved dashboard-mobile');
}finally{await browser.close();}
