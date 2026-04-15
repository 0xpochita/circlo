# API Clarifications & Updates

Dokumen ini menjelaskan beberapa endpoint yang sering membingungkan,
plus endpoint baru yang ditambahkan setelah rilis awal.

> Semua endpoint di bawah **membutuhkan `Authorization: Bearer <token>`**
> kecuali disebutkan sebaliknya.

---

## 1. Update Profil User

**`PATCH /api/v1/users/me`**

Digunakan untuk mengubah data profil user yang sedang login.
Semua field bersifat **opsional** — hanya kirim field yang ingin diubah.

**Field yang tersedia:**

| Field | Type | Validasi |
|---|---|---|
| `name` | string | 1–80 karakter |
| `username` | string | 3–20 karakter, hanya `a-z A-Z 0-9 _` |
| `avatarEmoji` | string | maks 10 karakter |
| `avatarColor` | string | hex color, contoh `#ff6b6b` |

**Contoh request — ganti nama dan username:**
```json
{
  "name": "Alice Wonder",
  "username": "alice_celo"
}
```

**Contoh request — ganti avatar saja:**
```json
{
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b"
}
```

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "name": "Alice Wonder",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b",
  "createdAt": "2024-06-01T10:00:00.000Z"
}
```

**Response 409 — username sudah dipakai user lain:**
```json
{
  "error": "Conflict",
  "message": "Username already taken",
  "statusCode": 409
}
```

**Response 400 — format username tidak valid:**
```json
{
  "error": "ValidationError",
  "message": "Username must be alphanumeric + underscore only",
  "statusCode": 400
}
```

---

## 2. Get Participants Goal

**`GET /api/v1/goals/:id/participants`**

Mengembalikan semua user yang sudah **stake** di goal tertentu,
beserta side yang mereka pilih (Yes/No) dan jumlah USDT yang mereka stake.
Berguna untuk menampilkan leaderboard atau daftar peserta di halaman detail goal.

Hasil dipaginasi dengan **cursor-based pagination** (cursor = `userId` dari item terakhir).

**Query Parameters:**

| Param | Type | Required | Keterangan |
|---|---|---|---|
| `cursor` | UUID | No | `userId` dari item terakhir untuk halaman berikutnya |

**Response 200:**
```json
{
  "items": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "side": 0,
      "staked": "5.000000",
      "claimed": false,
      "claimedAmount": null,
      "createdAt": "2024-06-10T14:30:00.000Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "name": "Alice Wonder",
        "username": "alice_celo",
        "avatarEmoji": "🦁",
        "avatarColor": "#ff6b6b"
      }
    },
    {
      "userId": "660f9511-f39c-52e5-b827-557766551111",
      "side": 1,
      "staked": "10.000000",
      "claimed": true,
      "claimedAmount": "19.600000",
      "createdAt": "2024-06-11T09:00:00.000Z",
      "user": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Catatan field:**
- `side`: `0` = Yes, `1` = No — sesuai enum on-chain
- `staked`: jumlah USDT yang di-stake, format string 6 desimal
- `claimed`: `true` jika user sudah klaim reward dari smart contract
- `claimedAmount`: jumlah USDT yang diklaim; `null` jika belum claim

**Response 404 — goal tidak ditemukan:**
```json
{
  "error": "NotFound",
  "message": "Goal not found",
  "statusCode": 404
}
```

---

## 3. Cek Stake User yang Login *(NEW)*

**`GET /api/v1/goals/:id/my-stake`**

> Endpoint **baru** yang ditambahkan setelah rilis awal.

Digunakan untuk mengecek apakah user yang sedang login **sudah stake** di
goal tertentu atau belum. Berguna untuk tombol "Stake" di frontend —
cek dulu sebelum menampilkan form stake atau label "Already staked".

Tidak butuh query parameter apapun. Identity user diambil dari JWT token.

**Response 200 — user belum stake:**
```json
{
  "staked": false,
  "data": null
}
```

**Response 200 — user sudah stake (belum claim):**
```json
{
  "staked": true,
  "data": {
    "side": 0,
    "amount": "5.000000",
    "claimedAmount": null
  }
}
```

**Response 200 — user sudah stake dan sudah claim:**
```json
{
  "staked": true,
  "data": {
    "side": 0,
    "amount": "5.000000",
    "claimedAmount": "9.800000"
  }
}
```

**Catatan field:**
- `side`: `0` = Yes, `1` = No
- `amount`: jumlah USDT yang di-stake user ini, format string 6 desimal
- `claimedAmount`: jumlah winnings yang sudah diklaim; `null` jika belum claim

**Perbedaan dengan `/:id/participants`:**

| | `/:id/participants` | `/:id/my-stake` |
|---|---|---|
| Data yang dikembalikan | Semua peserta goal | Hanya user yang login |
| Paginasi | Ya (cursor-based) | Tidak |
| Kasus belum stake | *(tidak muncul di list)* | `{ staked: false, data: null }` |

---

## 4. Lihat Resolver Goal

**`GET /api/v1/goals/:id`**

Response endpoint ini menyertakan field **`resolvers`** — daftar user yang
ditunjuk sebagai resolver (juri) untuk goal tersebut. Resolver bertugas
memilih side mana yang menang saat goal masuk status `resolving`.

**Contoh field `resolvers` dalam response:**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "title": "BTC hits $100k by end of 2024",
  "status": "resolving",
  "resolvers": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "vote": 0,
      "votedAt": "2024-12-31T18:00:00.000Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "name": "Alice Wonder",
        "username": "alice_celo",
        "avatarEmoji": "🦁",
        "avatarColor": "#ff6b6b"
      }
    },
    {
      "userId": "660f9511-f39c-52e5-b827-557766551111",
      "vote": null,
      "votedAt": null,
      "user": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ]
}
```

**Catatan field `resolvers`:**
- `vote`: side yang dipilih resolver (`0` = Yes, `1` = No); `null` jika belum vote
- `votedAt`: timestamp kapan resolver memberikan vote; `null` jika belum vote
- Resolver ditentukan saat goal dibuat via field `resolverIds` di `POST /goals`
- Vote resolver direkam on-chain dan diindeks oleh indexer ke database

**Response 404 — goal tidak ditemukan:**
```json
{
  "error": "NotFound",
  "message": "Goal not found",
  "statusCode": 404
}
```
