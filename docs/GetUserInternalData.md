# GetUserInternalData.md - Azure Function

## 🎯 Účel
Získává všechny Internal Data pro konkrétního hráče v PlayFab.  
Slouží k načtení uložených interních hodnot, které nejsou součástí běžného userData nebo inventory.

## 📋 API

### Request Parameters:
```javascript
{
    "PlayFabId": "string" // ID hráče
}
```

### Response (Success):
```javascript
{
    "Success": true,
    "PlayFabId": "string",
    "InternalData": {
        "Key1": { "Value": "value1" },
        "Key2": { "Value": "value2" },
        ...
    }
}
```

### Response (Error):
```javascript
{
    "Success": false,
    "Error": "string"  // Popis chyby
}
```

## 🔧 Implementační detaily

### 1. **Validace**
- ✅ Kontrola, že je poskytnut `PlayFabId`
- ✅ Pokud chybí, vrací `Success: false` a chybovou zprávu

### 2. **Získání Internal Data**
- Volá se PlayFab Server API metoda `GetUserInternalData`
- Vrací se celý objekt `Data` s klíči a hodnotami uloženými pro hráče

### 3. **Struktura Internal Data**
- Každý klíč má formát:
```json
"KeyName": { "Value": "hodnota" }
```
- Např.:
```json
{
    "Initialized": { "Value": "true" },
    "InventoryV2Ready": { "Value": "true" },
    "EconomyV2Ready": { "Value": "true" }
}
```

## 📊 Příklady použití

### Příklad 1: Získání InternalData pro hráče
**Request:**
```json
{
    "PlayFabId": "ABC123"
}
```

**Response:**
```json
{
    "Success": true,
    "PlayFabId": "ABC123",
    "InternalData": {
        "Initialized": { "Value": "true" },
        "InventoryV2Ready": { "Value": "true" },
        "EconomyV2Ready": { "Value": "true" }
    }
}
```

### Příklad 2: Hráč bez InternalData
**Request:**
```json
{
    "PlayFabId": "XYZ999"
}
```

**Response:**
```json
{
    "Success": true,
    "PlayFabId": "XYZ999",
    "InternalData": {}
}
```

### Příklad 3: Chybějící PlayFabId
**Request:**
```json
{}
```

**Response:**
```json
{
    "Success": false,
    "Error": "Missing PlayFabId"
}
```

## ⚠️ Error Cases

### 1. Missing Parameters
```
Status: 200
Body: { "Success": false, "Error": "Missing PlayFabId" }
```

### 2. PlayFab Server Error
```
Status: 200
Body: { "Success": false, "Error": "Server error" }
```

## 🔍 PlayFab API Calls

### GetUserInternalData
**Účel:** Získat všechny Internal Data pro hráče

**Parametry:**
```javascript
{
    PlayFabId: "string"
}
```

**Response:**
```javascript
{
    Data: {
        "Key1": { "Value": "value1" },
        "Key2": { "Value": "value2" }
    }
}
```

## 🧪 Testování

### Test 1: Získání Internal Data
```bash
curl -X POST https://your-function-url/api/GetUserInternalData \
  -H "Content-Type: application/json" \
  -d '{
    "PlayFabId": "TEST123"
  }'
```
