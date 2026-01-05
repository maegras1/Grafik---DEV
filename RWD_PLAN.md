# Plan Wdrożenia RWD dla Całej Aplikacji Grafik

## 📋 Przegląd

Aplikacja składa się z następujących stron:
1. **Schedule** (Grafik) - ✅ **ZROBIONE**
2. **Leaves** (Urlopy)
3. **Changes** (Zmiany)
4. **Options** (Opcje)
5. **Scrapped PDFs** (ISO/PDFy)
6. **Login** (Logowanie)

### Status Obecny
- ✅ **Schedule**: Pełne wsparcie RWD z selektorem pracownika dla adminów
- ⚠️ **Header/Navigation**: Częściowe wsparcie (hamburger menu jako FAB na mobile)
- ❌ **Pozostałe strony**: Brak dedykowanego wsparcia mobilnego

---

## 🎯 Priorytety i Strategia

### Priorytet 1: Krytyczne (Najczęściej używane)
1. **Leaves** - Duża, złożona tabela z kalendarzem
2. **Changes** - Tabela zmian

### Priorytet 2: Ważne
3. **Options** - Panel administracyjny (2-kolumnowy layout)

### Priorytet 3: Niski
4. **Scrapped PDFs** - Prosta lista
5. **Login** - Już responsywny (max-width: 550px)

---

## 📱 Szczegółowy Plan dla Każdej Strony

### 1. LEAVES (Urlopy) - PRIORYTET 1

#### Obecna Struktura
- Zakładki: Widok Miesięczny / Podsumowanie Roczne / Opieka
- Duża tabela z pracownikami (kolumny) i dniami (wiersze)
- Kalendarz modalny do wyboru dat
- Legenda i filtry

#### Strategia RWD

**A. Widok Miesięczny (Tabela)**
```
Desktop: Pełna tabela (scroll horizontal)
Mobile:  Karty pracowników z listą dni
```

**Implementacja:**
- Ukryj tabelę na mobile (`@media (max-width: 768px)`)
- Renderuj widok kartowy:
  - Selektor pracownika (jeśli admin)
  - Dla każdego dnia miesiąca: karta z datą i statusem urlopu
  - Kolor tła karty odpowiada typowi urlopu
  - Tap na kartę = otwórz kalendarz

**B. Podsumowanie Roczne**
```
Desktop: Tabela z kolumnami (Pracownik, Należny, Wykorzystany, etc.)
Mobile:  Karty pracowników ze statystykami
```

**Implementacja:**
- Każdy pracownik = osobna karta
- Statystyki w formie "label: value" w pionie
- Edycja "Zaległy" poprzez tap na wartość

**C. Opieka**
```
Desktop: Tabela podobna do podsumowania
Mobile:  Karty pracowników
```

**D. Kalendarz Modalny**
- Już responsywny (`.modal-content.wide`)
- Drobne poprawki:
  - Zmniejsz padding na mobile
  - Stack buttons pionowo
  - Pojedynczy miesiąc widoczny na raz (zamiast 3)

#### Pliki do Modyfikacji
- `scripts/leaves.ts` - logika renderowania
- `styles/leaves.css` - style mobilne
- Nowy helper: `renderMobileLeaves()`

---

### 2. CHANGES (Zmiany) - PRIORYTET 1

#### Obecna Struktura
- Tabela z pracownikami (kolumny) i miesiącami (wiersze)
- Edytowalne komórki
- Context menu (kopiuj/wklej/wyczyść)

#### Strategia RWD

```
Desktop: Pełna tabela
Mobile:  Karty pracowników z listą miesięcy
```

**Implementacja:**
- Selektor pracownika (dla adminów)
- Każdy miesiąc = karta z:
  - Nazwa miesiąca (nagłówek)
  - Treść komórki (edytowalna)
  - Long-press = context menu

#### Pliki do Modyfikacji
- `scripts/changes.ts`
- `styles/changes.css`

---

### 3. OPTIONS (Opcje) - PRIORYTET 2

#### Obecna Struktura
- 2-kolumnowy layout:
  - Lewa: Lista pracowników
  - Prawa: Formularz edycji

#### Strategia RWD

```
Desktop: 2 kolumny obok siebie
Mobile:  Single column, toggle między listą a formularzem
```

**Implementacja:**
- Na mobile:
  - Domyślnie widoczna tylko lista pracowników
  - Po kliknięciu pracownika → ukryj listę, pokaż formularz
  - Przycisk "Wstecz" w formularzu → wróć do listy
- Backup controls na dole (zawsze widoczne)

#### Pliki do Modyfikacji
- `scripts/options.ts`
- `styles/options.css`

---

### 4. SCRAPPED PDFs (ISO) - PRIORYTET 3

#### Obecna Struktura
- Lista PDF-ów z przyciskami "Otwórz"

#### Strategia RWD
- Już w miarę responsywna (lista)
- Drobne poprawki:
  - Stack buttons pionowo na bardzo małych ekranach
  - Zwiększ padding dla touch targets

#### Pliki do Modyfikacji
- `styles/scrapped-pdfs.css`

---

### 5. LOGIN - PRIORYTET 3

#### Status
✅ **Już responsywny** (`max-width: 550px`)

Ewentualne poprawki:
- Stack logo i formularz pionowo na < 480px
- Zwiększ padding dla lepszej czytelności

---

## 🎨 Wspólne Komponenty

### Header & Navigation

#### Obecny Stan
- Desktop: Pełny header z przyciskami i wyszukiwarką
- Mobile: FAB hamburger menu (bottom-right)

#### Poprawki
1. **Action Buttons** (Schedule-specific)
   - Ukryj na mobile (nie są potrzebne w widoku kartowym)
   - Funkcjonalność dostępna przez long-press/context menu

2. **Search Bar**
   - Zachowaj na mobile (przydatna)
   - Zmniejsz szerokość expanded (150px zamiast 250px)

3. **Date/Time Display**
   - Już ukryte na mobile ✅

#### Pliki do Modyfikacji
- `styles/header.css` (minor tweaks)

---

## 📐 Design System dla Mobile

### Karty (Cards)
```css
.mobile-card {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    padding: 16px;
    margin-bottom: 12px;
    transition: transform 0.2s;
}

.mobile-card:active {
    transform: scale(0.98);
}

.mobile-card-header {
    font-weight: 600;
    color: var(--color-gray-700);
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-card-body {
    color: var(--color-gray-600);
}
```

### Selektor Pracownika (Reusable)
```css
.mobile-employee-selector {
    background: white;
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 12px;
}

.mobile-employee-selector select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-gray-300);
    border-radius: 6px;
    font-size: 16px; /* Prevent zoom on iOS */
}
```

### Touch Targets
- Minimum 44x44px dla wszystkich interaktywnych elementów
- Zwiększ padding w formularzach (12px → 16px)

---

## 🔧 Implementacja Krok po Kroku

### Faza 1: Leaves (Urlopy) - 2-3h
1. ✅ Dodaj media query `@media (max-width: 768px)` w `leaves.css`
2. ✅ Utwórz `renderMobileMonthlyView()` w `leaves.ts`
3. ✅ Utwórz `renderMobileSummaryView()` w `leaves-summary.ts`
4. ✅ Utwórz `renderMobileCareView()` w `leaves-care-summary.ts`
5. ✅ Dostosuj kalendarz modalny (single month view)
6. ✅ Test na różnych rozdzielczościach

### Faza 2: Changes (Zmiany) - 1-2h
1. ✅ Dodaj media query w `changes.css`
2. ✅ Utwórz `renderMobileChangesView()` w `changes.ts`
3. ✅ Dostosuj context menu dla touch (long-press)
4. ✅ Test

### Faza 3: Options (Opcje) - 1-2h
1. ✅ Dodaj toggle logic w `options.ts`
2. ✅ Dodaj media query w `options.css`
3. ✅ Przycisk "Wstecz" w formularzu
4. ✅ Test

### Faza 4: Polish & Scrapped PDFs - 1h
1. ✅ Drobne poprawki w `scrapped-pdfs.css`
2. ✅ Finalne testy na prawdziwych urządzeniach
3. ✅ Optymalizacja touch targets

---

## 🧪 Plan Testowania

### Urządzenia Docelowe
- **Mobile**: 375px (iPhone SE), 414px (iPhone Pro Max)
- **Tablet**: 768px (iPad)
- **Desktop**: 1024px+

### Scenariusze Testowe

#### Leaves
1. Admin wybiera pracownika z selektora
2. Użytkownik widzi tylko swój grafik
3. Tap na dzień otwiera kalendarz
4. Wybór zakresu dat w kalendarzu
5. Podsumowanie roczne - edycja "Zaległy"

#### Changes
1. Admin przełącza między pracownikami
2. Edycja komórki (tap)
3. Long-press → context menu
4. Kopiuj/Wklej między komórkami

#### Options
1. Lista pracowników → wybór → formularz
2. Przycisk "Wstecz" → powrót do listy
3. Edycja i zapis danych
4. Backup controls dostępne

---

## 📊 Szacowany Czas Realizacji

| Strona | Czas | Priorytet |
|--------|------|-----------|
| Leaves | 3h | 1 |
| Changes | 2h | 1 |
| Options | 2h | 2 |
| Scrapped PDFs | 0.5h | 3 |
| Polish & Testing | 1.5h | - |
| **TOTAL** | **9h** | - |

---

## 🚀 Kolejność Wdrożenia (Rekomendacja)

1. **Leaves** (najważniejsza, najbardziej złożona)
2. **Changes** (podobna logika do Leaves)
3. **Options** (inny pattern, ale ważna)
4. **Scrapped PDFs** (szybka wygrana)
5. **Final Polish** (testy, optymalizacja)

---

## 📝 Notatki Techniczne

### Wspólny Pattern dla Tabel
```typescript
const renderMobileView = (data: any[], selectedId?: string) => {
    const container = document.querySelector('.mobile-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Selektor (jeśli admin)
    if (isAdmin && data.length > 1) {
        container.appendChild(createEmployeeSelector(data, selectedId));
    }
    
    // Karty
    data.forEach(item => {
        container.appendChild(createCard(item));
    });
};
```

### Media Query Breakpoints
```css
/* Mobile First */
@media (max-width: 768px) {
    .desktop-table { display: none; }
    .mobile-container { display: flex; }
}

@media (min-width: 769px) {
    .desktop-table { display: table; }
    .mobile-container { display: none; }
}
```

### Touch Event Handling
```typescript
let touchStartTime = 0;

element.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
});

element.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration > 500) {
        // Long press - show context menu
        showContextMenu(e);
    } else {
        // Short tap - normal action
        handleTap(e);
    }
});
```

---

## ✅ Checklist Przed Wdrożeniem

- [ ] Backup bazy danych
- [ ] Testy na localhost
- [ ] Weryfikacja na prawdziwych urządzeniach mobilnych
- [ ] Cross-browser testing (Safari iOS, Chrome Android)
- [ ] Accessibility check (touch targets, contrast)
- [ ] Performance check (lazy loading, bundle size)

---

## 🎯 Sukces Metryki

Po wdrożeniu RWD, aplikacja powinna:
- ✅ Być w pełni funkcjonalna na ekranach 375px+
- ✅ Wszystkie akcje dostępne przez touch
- ✅ Czytelne teksty bez zoomowania
- ✅ Płynne animacje i przejścia
- ✅ Brak horizontal scroll (poza zamierzonym)
