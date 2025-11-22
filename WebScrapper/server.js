const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

let scrapedData = []; 

// Read the parser logic from file to inject into browser
// This ensures we use the exact same logic that is tested in domParser.test.js
const parserLogicPath = path.join(__dirname, 'domParser.js');
// We need to read the content and wrap it because module.exports won't work in browser directly without bundler
// A simple way is to read the function body or just the function definition.
// Since domParser.js exports the function, we can read it and make sure it's available.
// However, 'require' works in Node, but not in browser.
// We will just copy the function logic for now, OR read the file and strip the module.exports line.
let parserFunctionString = fs.readFileSync(parserLogicPath, 'utf8');
// Remove "module.exports = ..."
parserFunctionString = parserFunctionString.replace(/module\.exports\s*=\s*parseDocumentsInBrowser;/, '');
// Remove comments if needed, but not strictly necessary.

async function scrapePdfLinks() {
  console.log('Rozpoczynam scraping...');
  let browser = null;

  try {
    browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    if (process.env.LOGIN_USERNAME && process.env.LOGIN_PASSWORD) {
        await page.authenticate({
            username: process.env.LOGIN_USERNAME,
            password: process.env.LOGIN_PASSWORD,
        });
    }

    if (!process.env.TARGET_URL) {
        throw new Error('TARGET_URL environment variable is not set');
    }

    await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle2' });

    // Inject the parser function code
    // We wrap it in a function execution
    const documents = await page.evaluate(new Function(`${parserFunctionString}; return parseDocumentsInBrowser();`));

    // Only update if we got valid results or confirmed empty array (not undefined)
    if (Array.isArray(documents)) {
        scrapedData = documents;
        console.log(`Pobrano dane ${scrapedData.length} dokumentów.`);
        if (documents.length === 0) {
            console.warn('Scraping zakończony sukcesem, ale nie znaleziono żadnych dokumentów.');
        }
    } else {
        console.error('Otrzymano nieprawidłowe dane ze scrapera:', documents);
    }

  } catch (error) {
    console.error('Błąd podczas scrapingu:', error);
    // Do not clear scrapedData on temporary errors, keep serving old data
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

app.get('/api/pdfs', (req, res) => {
  res.json(scrapedData); 
});

// Run immediately on start
scrapePdfLinks();

// Schedule every hour
setInterval(scrapePdfLinks, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Zamykanie serwera...');
    process.exit();
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
