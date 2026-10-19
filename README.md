# Week 11 Laundry API

A beginner-friendly Express and SQLite API with input validation, API key authentication, and rate limiting.

## Setup

1. Install Node.js.
2. Open this folder in VS Code.
3. In the terminal, run:

   ```powershell
   npm install
   ```

4. Check that `.env` exists and contains an `API_KEY` value.
5. Start the server:

   ```powershell
   npm start
   ```

6. The server runs at `http://localhost:3000`.

## Security features

- `validateOrder()` collects validation errors for all supplied fields.
- POST requires all order fields; PUT validates only fields included in the update.
- POST, PUT, and DELETE require the `x-api-key` header.
- GET routes do not require an API key.
- Rate limiting allows up to 20 requests per minute per client.

## Custom validation rule

`loadCount` must be a positive number, and `status` must be one of `Pending`, `Washing`, `Ready for Pickup`, or `Claimed`. This helps prevent invalid laundry orders from being stored and keeps status values consistent.

## Routes

| Method | Route | API key? | Purpose |
|---|---|---|---|
| GET | `/orders` | No | List all orders |
| GET | `/orders/:id` | No | Get one order |
| POST | `/orders` | Yes | Create an order |
| PUT | `/orders/:id` | Yes | Update supplied fields |
| DELETE | `/orders/:id` | Yes | Delete an order |

## Example POST body

```json
{
  "customerName": "Maria Santos",
  "loadCount": 2,
  "status": "Pending",
  "dropOffTime": "2026-10-19 08:00"
}
```

For POST, send header `x-api-key` with the value stored in your local `.env` file.

## Thunder Client checks

1. POST without `x-api-key` -> expect `401`.
2. POST with a wrong key -> expect `401`.
3. POST with a valid key and invalid data -> expect `400` with validation errors.
4. POST with a valid key and valid data -> expect `201`.
5. Send enough requests within one minute -> expect `429` after the rate limit is exceeded.

## Important

Never commit `.env` or share the API key publicly. The example key is for local classroom testing only. If your instructor needs to test your submission, follow their private submission instructions.
