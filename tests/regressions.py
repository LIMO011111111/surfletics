import asyncio, json
from playwright.async_api import async_playwright
URL="http://localhost:8765/index.html"
res=[]
def ok(c,n): res.append(("PASS" if c else "FAIL")+"  "+n)
async def fresh(b, w=390,h=844):
    ctx=await b.new_context(viewport={"width":w,"height":h},is_mobile=True,has_touch=True)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(400); pg.errs=errs; return pg
async def demo(pg):
    await pg.click('[data-a=skipdemo]'); await pg.wait_for_timeout(1100); await pg.click('#sheet [data-a=closesheet]'); await pg.wait_for_timeout(400)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await fresh(b)
        await pg.click('[data-a=obnext]'); await pg.fill('#f-name','Mia'); await pg.fill('#f-age','27')
        await pg.dblclick('.ob-foot [data-a=obnext]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#view [data-screen=ob2]').count()==1 and await pg.locator('.ferr').count()==0,"double-tap Continue stays on step 2 without errors")
        pg=await fresh(b); await demo(pg)
        await pg.click('[data-a=tab][data-v=profile]'); await pg.click('.settings [data-v=boards]'); await pg.wait_for_timeout(300)
        await pg.dblclick('[data-a=delboard][data-v="0"]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('.bitem').count()==2,"double-tap trash deletes one board")
        await pg.click('[data-a=tab][data-v=lessons]'); await pg.wait_for_timeout(300)
        await pg.dblclick('[data-a=book]'); await pg.wait_for_timeout(600)
        ok(await pg.locator('#sheet.open').count()==1 and not await pg.locator('#sheet').get_attribute('hidden') is not None,"double-tap Book keeps the sheet open")
        lbl=await pg.evaluate("getComputedStyle(document.querySelector('#sheet .condrow .fit small')).color")
        bg=await pg.evaluate("getComputedStyle(document.querySelector('#sheet .condrow .fit')).color")
        ok(lbl==bg,f"fit label colour matches badge text ({lbl} vs {bg})")
        await pg.dblclick('[data-a=confirmbook]'); await pg.wait_for_timeout(600)
        ok(await pg.locator('#sheet.open [data-a=viewbooking]').count()==1,"double-tap Confirm shows success sheet")
        await pg.click('[data-a=viewbooking]'); await pg.wait_for_timeout(400)
        # mode switch with sheet
        await pg.click('[data-a=tab][data-v=lessons]'); await pg.click('[data-a=book]'); await pg.wait_for_timeout(500)
        await pg.evaluate("document.querySelector('.aside [data-a=mode][data-v=mvp]').click()"); await pg.wait_for_timeout(500)
        ok(await pg.locator('#sheet.open').count()==0,"switching to MVP closes the booking sheet")
        await pg.evaluate("document.querySelector('.aside [data-a=mode][data-v=full]').click()"); await pg.wait_for_timeout(300)
        # rental cancel copy
        await pg.click('[data-a=lmode][data-v=rental]'); await pg.click('[data-a=rent]'); await pg.wait_for_timeout(500); await pg.click('[data-a=confirmrent]'); await pg.wait_for_timeout(400); await pg.click('[data-a=viewbooking]'); await pg.wait_for_timeout(400)
        cards=pg.locator('.bcard', has_text="Rental")
        await cards.first.locator('[data-a=cancelbook]').click(); await pg.wait_for_timeout(500)
        t=await pg.inner_text('#sheetbody'); ok("refund" not in t.lower() and "pay at the shop" in t.lower(),"rental cancel copy has no refund")
        await pg.click('#sheet [data-a=closesheet]'); await pg.wait_for_timeout(300)
        # log empty time
        await pg.click('[data-a=tab][data-v=spots]'); await pg.click('#fab'); await pg.wait_for_timeout(500)
        await pg.fill('#lg-start',''); await pg.dispatch_event('#lg-start','change'); await pg.click('[data-a=logfit][data-v="1"]'); await pg.click('[data-a=logsave]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#err-logtime').count()==1,"empty start time is rejected")
        await pg.click('#sheet [data-a=closesheet]'); await pg.wait_for_timeout(300)
        # edit profile tab bypass
        await pg.click('[data-a=tab][data-v=profile]'); await pg.click('.settings [data-v=edit]'); await pg.wait_for_timeout(300)
        await pg.fill('#f-name',''); await pg.click('[data-a=tab][data-v=spots]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('#err-name').count()==1,"tab bar can't leave edit profile with an empty name")
        await pg.fill('#f-name','Ella R.'); await pg.click('[data-a=subdone]')
        # board length 100
        await pg.click('.settings [data-v=boards]'); await pg.wait_for_timeout(300)
        await pg.fill('#nb-len','100'); await pg.fill('#nb-vol','70'); await pg.click('.addbox button[type=submit]'); await pg.wait_for_timeout(300)
        ok(await pg.locator('.bitem', has_text="8'4\"").count()==1,"length 100 normalises to 8'4\"")
        ok(not pg.errs, f"no page errors ({pg.errs[:2]})")
        # 320: long name + consent
        pg=await fresh(b,320,568)
        await pg.click('[data-a=obnext]'); await pg.fill('#f-name','Maximilian'+'X'*70); await pg.fill('#f-age','30'); await pg.click('.ob-foot [data-a=obnext]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a=fitness][data-v="3"]'); await pg.click('[data-a=level][data-v=Expert]'); await pg.click('.ob-foot [data-a=obnext]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a=obskip]'); await pg.wait_for_timeout(300); await pg.click('[data-a=obskip]'); await pg.wait_for_timeout(300)
        await pg.click('.ob-foot [data-a=finish]'); await pg.wait_for_timeout(900)
        box=await pg.locator('#err-consent').bounding_box()
        ok(box and box['y']+box['height']<568-80,f"consent error visible above footer ({box})")
        await pg.check('#f-consent'); await pg.click('.ob-foot [data-a=finish]'); await pg.wait_for_timeout(1200)
        if await pg.locator('#sheet.open').count(): await pg.click('#sheet [data-a=closesheet]'); await pg.wait_for_timeout(400)
        await pg.click('[data-a=tab][data-v=profile]'); await pg.wait_for_timeout(400)
        r=await pg.evaluate("document.querySelector('.pname h1').getBoundingClientRect().right")
        ok(r<=320,f"long name wraps inside the hero (right={r})")
        # corrupt states
        for name,patch in [("bookings string","s.bookings='x'"),("booking +10 days","s.bookings=[{id:'a',kind:'lesson',name:'X',spot:'carc',iso:'2099-01-01',time:'09:00–11:00',price:1,extra:'',status:'up'}]"),("ob 9","s.done=false;s.ob=9"),("user null","s.user=null"),("unknown spot","s.done=true;s.tab='spots';s.spotDetail='zzz'"),("broken json",None)]:
            ctx=await b.new_context(viewport={"width":390,"height":844}); q=await ctx.new_page(); errs=[]; q.on("pageerror",lambda e: errs.append(str(e)))
            await q.goto(URL); await q.wait_for_timeout(300)
            if patch: await q.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('surfletics:v2')||'{}');s.v=2;"+patch+";localStorage.setItem('surfletics:v2',JSON.stringify(s))})()")
            else: await q.evaluate("localStorage.setItem('surfletics:v2','{oops')")
            await q.reload(); await q.wait_for_timeout(500)
            ok(not errs and await q.locator('#view h1').count()>=1, f"boots with corrupt state: {name} {errs[:1]}")
            await ctx.close()
        await b.close()
    print("\n".join(res))
asyncio.run(main())
