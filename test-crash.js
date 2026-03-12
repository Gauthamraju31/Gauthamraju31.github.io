import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-web-security', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
            ignoreDefaultArgs: ['--mute-audio']
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        
        await page.goto('http://localhost:5174/projects/computer-vision', { waitUntil: 'networkidle2' });
        
        // Wait for initialize
        console.log('Waiting for initialize...');
        await page.waitForSelector('button', { timeout: 5000 });
        const initBtn = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('INITIALIZE'));
        });
        if (initBtn && initBtn.asElement()) {
            await initBtn.click();
            console.log('Clicked INITIALIZE');
            await new Promise(r => setTimeout(r, 6000));
        }
        
        console.log('On CV page');
        const btnHandle = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Face Mesh'));
        });
        
        if (btnHandle && btnHandle.asElement()) {
            console.log('Clicking Face Mesh');
            await btnHandle.click();
            await new Promise(r => setTimeout(r, 10000));
        } else {
            console.log('Face Mesh button not found');
            console.log(await page.evaluate(() => document.body.innerHTML.slice(0, 500)));
        }
        
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
