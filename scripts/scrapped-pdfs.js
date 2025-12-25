// scripts/scrapped-pdfs.js
export const ScrappedPdfs = (() => {
    const RENDER_API_URL = 'https://pdf-scraper-api-5qqr.onrender.com/api/pdfs';
    let allLinksData = [];

    const displayLinks = (linksToDisplay) => {
        const tableBody = document.getElementById('pdf-table-body');
        if (!tableBody) return;

        // Clear existing content
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }

        if (linksToDisplay.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'Brak wyników.';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        linksToDisplay.forEach((linkData) => {
            const row = document.createElement('tr');

            // Date cell
            const dateCell = document.createElement('td');
            dateCell.textContent = linkData.date;
            row.appendChild(dateCell);

            // Type cell
            const typeCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'doc-type-badge';

            // Apply color class based on type
            const typeLower = (linkData.type || '').toLowerCase();
            if (typeLower.includes('nfz')) badge.classList.add('type-nfz');
            else if (typeLower.includes('pisma')) badge.classList.add('type-pisma');
            else if (typeLower.includes('akty prawne')) badge.classList.add('type-akty');
            else if (typeLower.includes('komisja socjalna') || typeLower.includes('socjalne'))
                badge.classList.add('type-socjalna');
            else if (typeLower.includes('szkolenia') || typeLower.includes('szkoleń'))
                badge.classList.add('type-szkolenia');
            else if (typeLower.includes('iso')) badge.classList.add('type-iso');
            else if (typeLower.includes('karty charakterystyki') || typeLower.includes('ulotki'))
                badge.classList.add('type-med');
            else if (typeLower.includes('druki') || typeLower.includes('wywieszki'))
                badge.classList.add('type-druk');
            else if (typeLower.includes('covid')) badge.classList.add('type-covid');

            badge.textContent = linkData.type;
            typeCell.appendChild(badge);
            row.appendChild(typeCell);

            // Link cell
            const linkCell = document.createElement('td');
            const anchor = document.createElement('a');
            anchor.href = linkData.url;
            // Removed target blank to handle custom click
            anchor.className = 'pdf-link';

            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                if (ScrappedPdfs.openPdf) {
                    ScrappedPdfs.openPdf(linkData.url, linkData.title);
                } else {
                    // Fallback if modal logic not ready
                    window.open(linkData.url, '_blank');
                }
            });

            // Icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-file-pdf';
            anchor.appendChild(icon);

            // Text
            anchor.appendChild(document.createTextNode(` ${linkData.title}`));

            linkCell.appendChild(anchor);
            row.appendChild(linkCell);

            tableBody.appendChild(row);
        });
    };

    const fetchAndDisplayPdfLinks = async () => {
        const container = document.getElementById('pdf-links-container');
        const tableContainer = document.getElementById('pdf-table-container');

        if (!container) return;
        container.textContent = 'Ładowanie linków...';

        try {
            const response = await fetch(RENDER_API_URL);
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);

            // API zwraca teraz kompletną, posortowaną tablicę obiektów
            const documents = await response.json();

            if (!documents || !Array.isArray(documents) || documents.length === 0) {
                container.textContent = 'Brak dostępnych linków PDF.';
                return;
            }

            // Nie musimy już nic parsować, dane są gotowe. Sortujemy po dacie.
            allLinksData = documents.sort((a, b) => b.date.localeCompare(a.date));

            container.style.display = 'none';
            if (tableContainer) {
                tableContainer.style.display = 'block';
            }

            // Apply initial filtering if search input has value
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim()) {
                handleGlobalSearch({ detail: { searchTerm: searchInput.value.trim() } });
            } else {
                displayLinks(allLinksData);
            }
        } catch (error) {
            console.error('Błąd podczas pobierania linków PDF:', error);
            container.textContent = 'Wystąpił błąd podczas ładowania linków.';
        }
    };

    const initRefresh = () => {
        const refreshBtn = document.getElementById('refreshPdfsBtn');
        if (!refreshBtn) return;

        refreshBtn.addEventListener('click', async () => {
            if (refreshBtn.classList.contains('loading')) return;

            refreshBtn.classList.add('loading');
            const span = refreshBtn.querySelector('span');
            const originalText = span ? span.textContent : 'Odśwież';
            if (span) span.textContent = 'Ładowanie...';

            try {
                await fetchAndDisplayPdfLinks();
            } finally {
                refreshBtn.classList.remove('loading');
                if (span) span.textContent = originalText;
            }
        });
    };

    const handleGlobalSearch = (e) => {
        const searchTerm = (e.detail.searchTerm || '').toLowerCase();
        const filteredLinks = allLinksData.filter(
            (link) =>
                (link.title && link.title.toLowerCase().includes(searchTerm)) ||
                (link.type && link.type.toLowerCase().includes(searchTerm)) ||
                (link.date && link.date.toLowerCase().includes(searchTerm)),
        );
        displayLinks(filteredLinks);
    };

    const initModal = () => {
        const modal = document.getElementById('pdfModal');
        const closeBtn = document.getElementById('pdfCloseBtn');
        const openNewTabBtn = document.getElementById('pdfOpenNewTabBtn');
        const iframe = document.getElementById('pdfIframe');
        const title = document.getElementById('pdfModalTitle');

        const loginModal = document.getElementById('isoLoginModal');
        const loginConfirmBtn = document.getElementById('isoLoginConfirmBtn');
        const loginCancelBtn = document.getElementById('isoLoginCancelBtn');

        let pendingUrl = null;
        let pendingTitle = null;
        let isIsoAuthenticated = false;

        if (!modal || !closeBtn || !iframe) return;

        const closeModal = () => {
            modal.style.display = 'none';
            iframe.src = '';
        };

        const closeLoginModal = () => {
            if (loginModal) {
                loginModal.style.display = 'none';
                const l = document.getElementById('isoLogin');
                const p = document.getElementById('isoPassword');
                if (l) l.value = '';
                if (p) p.value = '';
            }
            pendingUrl = null;
            pendingTitle = null;
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (loginConfirmBtn) {
            loginConfirmBtn.addEventListener('click', () => {
                isIsoAuthenticated = true;
                closeLoginModal();
                if (pendingUrl) {
                    ScrappedPdfs.actualOpenPdf(pendingUrl, pendingTitle);
                }
            });
        }

        if (loginCancelBtn) {
            loginCancelBtn.addEventListener('click', closeLoginModal);
        }

        ScrappedPdfs.openPdf = (url, docTitle) => {
            if (isIsoAuthenticated) {
                ScrappedPdfs.actualOpenPdf(url, docTitle);
            } else {
                pendingUrl = url;
                pendingTitle = docTitle;
                if (loginModal) {
                    loginModal.style.display = 'flex';
                } else {
                    ScrappedPdfs.actualOpenPdf(url, docTitle);
                }
            }
        };

        ScrappedPdfs.actualOpenPdf = (url, docTitle) => {
            if (openNewTabBtn) openNewTabBtn.href = url;
            if (title) title.textContent = docTitle || 'Podgląd dokumentu';

            const separator = url.includes('#') ? '&' : '#';
            const cleanUrl = `${url}${separator}navpanes=0&toolbar=0&view=FitH`;

            iframe.src = cleanUrl;
            modal.style.display = 'flex';
        };
    };

    const init = () => {
        const fetchPromise = fetchAndDisplayPdfLinks();
        document.addEventListener('app:search', handleGlobalSearch);
        initRefresh();
        initModal();
        return fetchPromise;
    };

    const destroy = () => {
        allLinksData = [];
        document.removeEventListener('app:search', handleGlobalSearch);
    };

    return { init, destroy };
})();

// Backward compatibility
if (typeof window !== 'undefined') {
    window.ScrappedPdfs = ScrappedPdfs;
}
