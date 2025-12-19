# TransferStack.js - Kompletní implementace

## 🎯 Účel
Přenáší určité množství uses/stacku z jednoho itemu na druhý. Používá se pro stackování itemů stejného typu.

## 📋 API

### Request Parameters:
```javascript
{
    "PlayFabId": "string",           // ID hráče
    "SourceInstanceId": "string",    // ItemInstanceId zdroje
    "TargetInstanceId": "string",    // ItemInstanceId cíle
    "Amount": number                 // Počet uses k přenosu (-1 nebo null = vše)
}
```

### Response (Success):
```javascript
{
    "Success": true,
    "TransferredAmount": number,     // Kolik bylo skutečně přeneseno
    "SourceRemaining": number,       // Kolik zbylo ve zdroji
    "TargetTotal": number           // Celkový počet v cíli
}
```

### Response (Error):
```javascript
{
    "Error": "string",
    "Details": "string"
}
```

## 🔧 Implementační detaily

### 1. **Validace**
- ✅ Kontrola přítomnosti všech parametrů
- ✅ Ověření existence obou itemů
- ✅ Kontrola, že jsou itemy stejného typu (ItemId)
- ✅ Validace množství (nesmí přesáhnout source uses)

### 2. **Stack Merging Logika**

#### Krok 1: Získání dat
```javascript
const sourceUses = sourceItem.RemainingUses || 1;
const targetUses = targetItem.RemainingUses || 1;
```

#### Krok 2: Výpočet transferAmount
```javascript
// Amount == -1 nebo null → přenést vše
// Amount > 0 → přenést specifikované množství (max sourceUses)
const transferAmount = (amount && amount > 0) 
    ? Math.min(amount, sourceUses) 
    : sourceUses;
```

#### Krok 3: Source Item Update
**Pokud zbývají nějaké uses:**
```javascript
server.ModifyItemUses({
    PlayFabId: playFabId,
    ItemInstanceId: sourceInstanceId,
    UsesToAdd: -transferAmount  // Záporná hodnota = odečtení
});
```

**Pokud se přenáší vše:**
```javascript
server.RevokeInventoryItem({
    PlayFabId: playFabId,
    ItemInstanceId: sourceInstanceId
});
```

#### Krok 4: Target Item Update
```javascript
server.ModifyItemUses({
    PlayFabId: playFabId,
    ItemInstanceId: targetInstanceId,
    UsesToAdd: transferAmount  // Kladná hodnota = přidání
});
```

## 📊 Příklady použití

### Příklad 1: Přenos části stacku
**Request:**
```json
{
    "PlayFabId": "ABC123",
    "SourceInstanceId": "item-001",
    "TargetInstanceId": "item-002",
    "Amount": 5
}
```

**Stav před:**
- item-001: RemainingUses = 10
- item-002: RemainingUses = 3

**Stav po:**
- item-001: RemainingUses = 5
- item-002: RemainingUses = 8

### Příklad 2: Přenos celého stacku
**Request:**
```json
{
    "PlayFabId": "ABC123",
    "SourceInstanceId": "item-001",
    "TargetInstanceId": "item-002",
    "Amount": -1
}
```

**Stav před:**
- item-001: RemainingUses = 10
- item-002: RemainingUses = 3

**Stav po:**
- item-001: **SMAZÁN** (RevokeInventoryItem)
- item-002: RemainingUses = 13

### Příklad 3: Přenos více než je dostupné
**Request:**
```json
{
    "PlayFabId": "ABC123",
    "SourceInstanceId": "item-001",
    "TargetInstanceId": "item-002",
    "Amount": 50
}
```

**Stav před:**
- item-001: RemainingUses = 10
- item-002: RemainingUses = 3

**Stav po:**
- item-001: **SMAZÁN** (přenesl se max, tedy vše)
- item-002: RemainingUses = 13

## ⚠️ Error Cases

### 1. Missing Parameters
```
Status: 400
Body: "Missing required parameters: PlayFabId, SourceInstanceId, TargetInstanceId"
```

### 2. Item Not Found
```
Status: 404
Body: "Source or target item not found"
```

### 3. Different Item Types
```
Status: 400
Body: "Cannot stack different item types"
```

### 4. Amount Exceeds Source (teoreticky nemůže nastat díky Math.min)
```
Status: 400
Body: "Amount exceeds source stack count"
```

### 5. Server Error
```
Status: 500
Body: { "Error": "Server error", "Details": "..." }
```

## 🔍 PlayFab API Calls

### ModifyItemUses
**Účel:** Upravit RemainingUses itemu (přidat nebo odebrat)

**Parametry:**
```javascript
{
    PlayFabId: "string",
    ItemInstanceId: "string",
    UsesToAdd: number  // Záporné = odečíst, Kladné = přičíst
}
```

**Poznámka:** Toto je PlayFab Classic Inventory API metoda.

### RevokeInventoryItem
**Účel:** Smazat item z inventáře hráče

**Parametry:**
```javascript
{
    PlayFabId: "string",
    ItemInstanceId: "string"
}
```

### GetUserInventory
**Účel:** Získat kompletní inventář hráče

**Parametry:**
```javascript
{
    PlayFabId: "string"
}
```

**Response:**
```javascript
{
    data: {
        Inventory: [
            {
                ItemInstanceId: "string",
                ItemId: "string",
                RemainingUses: number,
                CustomData: {}
            }
        ]
    }
}
```

## 🧪 Testování

### Test 1: Základní stack transfer
```bash
curl -X POST https://your-function-url/api/TransferStack \
  -H "Content-Type: application/json" \
  -d '{
    "PlayFabId": "TEST123",
    "SourceInstanceId": "source-item-id",
    "TargetInstanceId": "target-item-id",
    "Amount": 5
  }'
```

### Test 2: Transfer celého stacku
```bash
curl -X POST https://your-function-url/api/TransferStack \
  -H "Content-Type: application/json" \
  -d '{
    "PlayFabId": "TEST123",
    "SourceInstanceId": "source-item-id",
    "TargetInstanceId": "target-item-id",
    "Amount": -1
  }'
```

## 📝 Poznámky

1. **RemainingUses = Stack Count:** 
   V PlayFab Classic Inventory se stack count ukládá do `RemainingUses` fieldu.

2. **Item Merging:**
   Funkce neprovádí žádné merge CustomData - pouze přenáší uses/počet.

3. **Atomic Operation:**
   Operace NENÍ atomic - pokud selže update target itemu, source už může být změněn.
   Pro production použití zvažte použití PlayFab CloudScript transakcí.

4. **Max Stack Size:**
   Funkce **NEVALIDUJE** max stack size - to by mělo být validováno na straně serveru/klienta před voláním.

5. **Sloty:**
   Funkce **NEPŘESOUVÁ** itemy mezi sloty - pouze mění počet uses.
   Slot management se provádí přes `UpdateItemSlot`.

## 🔄 Vztah k ostatním funkcím

- **UpdateItemSlot** - mění slot pozici itemu
- **SwapItemSlots** - vyměňuje pozice dvou itemů
- **TransferStack** - mění počet uses/stacku
- **SplitStack** - rozděluje stack na dva itemy
