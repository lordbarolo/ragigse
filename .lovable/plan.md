

## Plan: Gör /consultant/fakturakontroll/ny tillgänglig utan inloggning

### Ändring
Ta bort `ProtectedRoute`-wrappern från `FakturakontrollNy`-routen i `src/App.tsx` så att sidan blir åtkomlig utan att vara inloggad.

### Teknisk detalj
Rad ~111 i App.tsx ändras från:
```tsx
<Route path="/consultant/fakturakontroll/ny" element={<ProtectedRoute><FakturakontrollNy /></ProtectedRoute>} />
```
till:
```tsx
<Route path="/consultant/fakturakontroll/ny" element={<FakturakontrollNy />} />
```

Inga andra filer behöver ändras.

