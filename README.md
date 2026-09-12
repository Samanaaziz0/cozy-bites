# Cozy Bites 🍽️

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Site-2EC4B6?style=for-the-badge)](https://cozy-bites-deploy.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github)](https://github.com/Samanaaziz0/cozy-bites)

**Western Bistro restaurant app — menu browsing, reservations, dine-in & online orders, loyalty rewards, and admin panel.**

[**→ Try it live**](https://cozy-bites-deploy.vercel.app)

</div>

---

## Stack

Flask + MongoDB + HTML/CSS/JavaScript

Three files:

- `app.py` — Flask backend (unchanged from your version)
- `index.html` — Frontend, now wired to the backend instead of localStorage
- `requirements.txt` — Python dependencies

## 1) Install dependencies

```bash
pip install -r requirements.txt
```

You also need **MongoDB** running locally on the default port `mongodb://localhost:27017/`.
On Windows install MongoDB Community Server, on macOS `brew install mongodb-community`,
on Linux follow the official mongo install guide. Make sure `mongod` is running before
you start the Flask app.

## 2) Run the backend

```bash
python app.py
```

Flask serves on `http://localhost:5000`. The database used is `hotelDB` (created
automatically on first write).

## 3) Seed the database (one-time)

In a new terminal:

```bash
curl -X POST http://localhost:5000/seed
```

This inserts default menu items, tables, event rooms, and loyalty tiers.

## 4) Open the frontend

Just double-click `index.html`, or serve it with any static server, e.g.:

```bash
python -m http.server 8000
# then open http://localhost:8000/index.html
```

> The frontend talks to the backend at `http://localhost:5000`. If you change the
> backend host/port, edit the `API_BASE` constant near the top of the `<script>`
> block in `index.html`.

## What's connected to MongoDB

| Action on the page         | Endpoint hit                       | Collection           |
|----------------------------|------------------------------------|----------------------|
| Register / Login           | `/users/register`, `/users/login`  | `users`              |
| Load menu                  | `GET /menu`                        | `menu_items`         |
| Load tables / event rooms  | `GET /tables`                      | `tables`             |
| Place dine-in / online order | `POST /orders/add`               | `orders`, `payment_transactions`, `order_status_history`, `activity_logs` |
| Make reservation           | `POST /reservations/add`           | `reservations`, `tables`, `activity_logs` |
| Send contact message       | `POST /contact/add`                | `contacts`           |
| Loyalty info               | `GET /loyalty/<phone>`             | `users`, `loyalty_tiers` |
| Admin: orders list / status| `GET /orders`, `POST /orders/status` | `orders`           |
| Admin: reservations / status | `GET /reservations`, `POST /reservations/status` | `reservations` |
| Admin: stats               | `GET /admin/stats`                 | aggregate            |
| Admin: activity feed       | `GET /activity`                    | `activity_logs`      |
| Seed demo data button      | `POST /seed`                       | all collections      |

## Admin login

Frontend gate uses **admin / admin123** (change in `adminLogin()` inside
`index.html`). The backend itself is open — add authentication later if you
deploy this.

## Notes

- The cart stays in `localStorage` for UX convenience and is only sent to the
  backend at checkout (this matches the `/cart/add` and `/cart/clear` design
  in `app.py`, which is invoked by `/orders/add` to clear the cart server-side).
- Loyalty visits and free-meal rewards are computed by `update_loyalty()` on
  the server. The frontend re-fetches `/loyalty/<phone>` after each order.
- If you see CORS errors, confirm `flask-cors` is installed and `CORS(app)` is
  active (it already is in `app.py`).
