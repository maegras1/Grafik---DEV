const ScrappedPdfs = (() => {
    // WAŻNE: Wklej tutaj adres URL Twojej usługi z Render.com
    const RENDER_API_URL = 'https://pdf-scraper-api-5qqr.onrender.com/api/pdfs';

    const fetchAndDisplayPdfLinks = async () => {
        const container = document.getElementById('pdf-links-container');
        if (!container) {
            console.error('Nie znaleziono kontenera na linki PDF.');
            return;
        }
        container.innerHTML = '<p>Ładowanie linków...</p>';

        try {
            const response = await fetch(RENDER_API_URL);
            if (!response.ok) {
                throw new Error(`Błąd HTTP: ${response.status}`);
            }
            const links = await response.json();

            if (!links || links.length === 0) {
                container.innerHTML = '<p>Brak dostępnych linków PDF. Scraper mógł jeszcze nie zakończyć pracy. Spróbuj odświeżyć stronę za chwilę.</p>';
                return;
            }

            const ul = document.createElement('ul');
            ul.className = 'pdf-link-list'; // Klasa do ewentualnej stylizacji

            links.forEach(link => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = link;
                a.target = "_blank"; // Otwórz w nowej karcie
                a.textContent = decodeURIComponent(link.substring(link.lastIndexOf('/') + 1)); // Wyświetl samą nazwę pliku
                li.appendChild(a);
                ul.appendChild(li);
            });
            container.innerHTML = '';
            container.appendChild(ul);

        } catch (error) {
            console.error('Błąd podczas pobierania linków PDF:', error);
            container.innerHTML = '<p>Wystąpił błąd podczas ładowania linków. Spróbuj ponownie później.</p>';
        }
    };

    const init = () => {
        fetchAndDisplayPdfLinks();
    };
    
    // Na tej prostej stronie nie ma potrzeby implementowania funkcji destroy
    const destroy = () => {};

    return {
        init,
        destroy
    };
})();