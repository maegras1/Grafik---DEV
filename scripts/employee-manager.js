// scripts/employee-manager.js

const EmployeeManager = (() => {
    let _employees = {}; // Prywatna zmienna na dane pracowników

    // Prywatna funkcja do pobierania danych z Firestore
    const _fetchFromDB = async () => {
        try {
            const docRef = db.collection("schedules").doc("mainSchedule");
            const doc = await docRef.get();
            if (doc.exists && doc.data().employees) {
                _employees = doc.data().employees;
            } else {
                 // Logika na wypadek, gdyby struktura 'employees' nie istniała
                _employees = {};
                console.warn("Brak obiektu 'employees' w Firestore. Inicjalizacja pustego stanu.");
            }
        } catch (error) {
            console.error("Błąd krytyczny przy pobieraniu danych pracowników:", error);
            window.showToast("Błąd pobierania danych pracowników!", 5000);
            _employees = {}; // W razie błędu zwróć pusty obiekt
        }
    };

    // Publiczne API modułu
    return {
        // Inicjalizuje moduł, pobierając dane
        load: async function() {
            await _fetchFromDB();
        },
        // Zwraca wszystkich pracowników
        getAll: () => _employees,
        // Zwraca konkretnego pracownika po jego indeksie/kluczu
        getById: (id) => _employees[id] || null,
        // Zwraca tylko imię i nazwisko pracownika
        getNameById: (id) => _employees[id]?.name || `Pracownik ${id}`,
        // Zwraca informacje urlopowe
        getLeaveInfoById: (id) => ({
            entitlement: _employees[id]?.leaveEntitlement || 0,
            carriedOver: _employees[id]?.carriedOverLeave || 0
        })
    };
})();
