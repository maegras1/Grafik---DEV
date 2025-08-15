// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors()); // Zezwól na zapytania z innych domen (Twojej aplikacji)

const PORT = process.env.PORT || 3000;

// Główny punkt końcowy API
app.get('/scrape', async (req, res) => {
    console.log('Rozpoczynam scraping...');
    let browser = null;
    try {
        browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Ważne dla środowisk takich jak Glitch
        });
        const page = await browser.newPage();

        // 1. Logowanie
        await page.goto(process.env.TARGET_URL);
        // Zastąp selektorami CSS z Twojej strony logowania
        await page.type('#username-input-selector', process.env.SCRAPER_LOGIN);
        await page.type('#password-input-selector', process.env.SCRAPER_PASSWORD);
        await page.click('#login-button-selector');
        
        // Poczekaj na załadowanie strony po zalogowaniu
        await page.waitForNavigation();
        console.log('Zalogowano pomyślnie.');

        // 2. Przejście do strony z dokumentami
        await page.goto(process.env.DOCUMENTS_URL);
        console.log('Pobieram listę dokumentów...');

        // 3. Scraping danych
        // Zastąp selektorem listy i linków z Twojej strony
        const documents = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.lista-dokumentow a'));
            return links.map(link => ({
                title: link.innerText.trim(),
                url: link.href
            }));
        });

        console.log(`Znaleziono ${documents.length} dokumentów.`);
        res.json(documents);

    } catch (error) {
        console.error('Błąd podczas scrapingu:', error);
        res.status(500).json({ error: 'Nie udało się pobrać danych.' });
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('Scraping zakończony.');
    }
});

app.listen(PORT, () => {
    console.log(`Serwer scrapera działa na porcie ${PORT}`);
});
