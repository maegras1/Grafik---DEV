// api/scrape.js
const puppeteer = require('puppeteer');
const cors = require('cors');

// Funkcja pomocnicza do obsługi CORS
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Lub konkretna domena Twojej aplikacji
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

// Główna funkcja serwerowa
const handler = async (req, res) => {
    console.log('Rozpoczynam scraping...');
    let browser = null;
    try {
        browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();

        // 1. Logowanie
        await page.goto(process.env.TARGET_URL);
        await page.type('#username-input-selector', process.env.SCRAPER_LOGIN); // Zastąp selektorami
        await page.type('#password-input-selector', process.env.SCRAPER_PASSWORD); // Zastąp selektorami
        await page.click('#login-button-selector'); // Zastąp selektorami
        await page.waitForNavigation();
        console.log('Zalogowano pomyślnie.');

        // 2. Przejście do strony z dokumentami
        await page.goto(process.env.DOCUMENTS_URL);
        console.log('Pobieram listę dokumentów...');

        // 3. Scraping danych
        const documents = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.lista-dokumentow a')); // Zastąp selektorem
            return links.map(link => ({
                title: link.innerText.trim(),
                url: link.href
            }));
        });

        console.log(`Znaleziono ${documents.length} dokumentów.`);
        res.status(200).json(documents);

    } catch (error) {
        console.error('Błąd podczas scrapingu:', error);
        res.status(500).json({ error: 'Nie udało się pobrać danych.' });
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('Scraping zakończony.');
    }
};

module.exports = allowCors(handler);
