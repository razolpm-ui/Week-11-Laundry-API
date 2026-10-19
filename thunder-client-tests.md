# Thunder Client Test Checklist

Base URL: `http://localhost:3000`

## 1. GET all orders
- Method: GET
- URL: `/orders`
- No API key required
- Expected: `200`

## 2. POST without key
- Method: POST
- URL: `/orders`
- Body type: JSON
- Body:
  ```json
  {
    "customerName": "Maria Santos",
    "loadCount": 2,
    "status": "Pending",
    "dropOffTime": "2026-10-19 08:00"
  }
  ```
- Do not add `x-api-key`
- Expected: `401`

## 3. POST with wrong key
- Same request as above
- Header: `x-api-key: wrong-key`
- Expected: `401`

## 4. POST with valid key but invalid data
- Header: `x-api-key: laundry-secret-2026`
- Body:
  ```json
  {
    "customerName": "",
    "loadCount": 0,
    "status": "Not a status",
    "dropOffTime": ""
  }
  ```
- Expected: `400`, with multiple validation errors

## 5. POST with valid key and valid data
- Header: `x-api-key: laundry-secret-2026`
- Body:
  ```json
  {
    "customerName": "Maria Santos",
    "loadCount": 2,
    "status": "Pending",
    "dropOffTime": "2026-10-19 08:00"
  }
  ```
- Expected: `201`

## 6. PUT an order
- Method: PUT
- URL: `/orders/1` (replace `1` with an existing order ID)
- Header: `x-api-key: laundry-secret-2026`
- Body:
  ```json
  {
    "status": "Washing"
  }
  ```
- Expected: `200`

## 7. DELETE an order
- Method: DELETE
- URL: `/orders/1` (replace `1` with an existing order ID)
- Header: `x-api-key: laundry-secret-2026`
- Expected: `200`

## 8. Rate limit
Send more than 20 requests within one minute. The server should eventually return `429`. Since the limit applies app-wide, previous requests in the same minute count too.
