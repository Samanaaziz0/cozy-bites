# ─────────────────────────────────────────────────────────────
#  Cozy Bites — Flask + MongoDB Backend
#  Database : hotelDB
#  Style    : simple, following NoSQL lecture notes
# ─────────────────────────────────────────────────────────────

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# ── App setup ────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── MongoDB connection ────────────────────────────────────────
client = MongoClient("mongodb://localhost:27017/")

# Database
db = client["hotelDB"]

# Collections
users                = db["users"]
menu_items           = db["menu_items"]
carts                = db["carts"]
orders               = db["orders"]
reservations         = db["reservations"]
tables               = db["tables"]
activity_logs        = db["activity_logs"]
reviews              = db["reviews"]
events               = db["events"]
contacts             = db["contacts"]
order_status_history = db["order_status_history"]
payment_transactions = db["payment_transactions"]
loyalty_tiers        = db["loyalty_tiers"]


# ── Small helpers ─────────────────────────────────────────────
def clean(doc):
    """Convert ObjectId → string so jsonify works."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean(d) for d in doc]
    if isinstance(doc, dict):
        return {k: (str(v) if isinstance(v, ObjectId) else clean(v))
                for k, v in doc.items()}
    return doc

def now():
    return datetime.utcnow().isoformat()


# ─────────────────────────────────────────────────────────────
#  1. USERS
# ─────────────────────────────────────────────────────────────

# Register a new user
@app.route("/users/register", methods=["POST"])
def register_user():
    data = request.json

    # Check if phone already exists
    existing = users.find_one({"phone": data["phone"]})
    if existing:
        return jsonify({"message": "Phone already registered"}), 400

    user = {
        "name":             data["name"],
        "phone":            data["phone"],
        "email":            data.get("email", ""),
        "password":         data["password"],
        "visits":           0,
        "tier":             "bronze",
        "reward_available": False,
        "created_at":       now()
    }

    users.insert_one(user)
    return jsonify({"message": "User registered successfully"})


# Login
@app.route("/users/login", methods=["POST"])
def login_user():
    data = request.json

    user = users.find_one({
        "phone":    data["phone"],
        "password": data["password"]
    })

    if not user:
        return jsonify({"message": "Wrong phone or password"}), 401

    return jsonify({"message": "Login successful", "user": clean(user)})


# Get all users (admin)
@app.route("/users", methods=["GET"])
def get_users():
    all_users = list(users.find({}, {"password": 0}))
    return jsonify(clean(all_users))


# Get one user
@app.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    user = users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(clean(user))


# Update user
@app.route("/users/<user_id>", methods=["POST"])
def update_user(user_id):
    data = request.json
    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": data}
    )
    return jsonify({"message": "User updated"})


# Delete user
@app.route("/users/delete", methods=["POST"])
def delete_user():
    data = request.json
    users.delete_one({"phone": data["phone"]})
    return jsonify({"message": "User deleted"})


# ─────────────────────────────────────────────────────────────
#  2. MENU ITEMS
# ─────────────────────────────────────────────────────────────

# Get all menu items (optional ?category=filter)
@app.route("/menu", methods=["GET"])
def get_menu():
    category = request.args.get("category")

    if category:
        items = list(menu_items.find({"category": category}, {"_id": 0}))
    else:
        items = list(menu_items.find({}, {"_id": 0}))

    return jsonify(items)


# Add menu item (admin)
@app.route("/menu/add", methods=["POST"])
def add_menu_item():
    data = request.json

    item = {
        "name":        data["name"],
        "price":       data["price"],
        "category":    data["category"],
        "description": data.get("description", ""),
        "emoji":       data.get("emoji", "🍽️"),
        "badge":       data.get("badge", ""),
        "available":   True,
        "created_at":  now()
    }

    menu_items.insert_one(item)
    return jsonify({"message": "Menu item added"})


# Update menu item
@app.route("/menu/update", methods=["POST"])
def update_menu_item():
    data = request.json
    menu_items.update_one(
        {"name": data["name"]},
        {"$set": data}
    )
    return jsonify({"message": "Menu item updated"})


# Delete menu item
@app.route("/menu/delete", methods=["POST"])
def delete_menu_item():
    data = request.json
    menu_items.delete_one({"name": data["name"]})
    return jsonify({"message": "Menu item deleted"})


# ─────────────────────────────────────────────────────────────
#  3. CARTS
# ─────────────────────────────────────────────────────────────

# Get cart for a user
@app.route("/cart/<user_id>", methods=["GET"])
def get_cart(user_id):
    cart = carts.find_one({"user_id": user_id})
    if not cart:
        return jsonify({"user_id": user_id, "items": []})
    return jsonify(clean(cart))


# Add item to cart
@app.route("/cart/add", methods=["POST"])
def add_to_cart():
    data    = request.json
    user_id = data["user_id"]
    new_item = data["item"]   # {name, emoji, category, price, qty}

    cart = carts.find_one({"user_id": user_id})

    if not cart:
        # Create new cart
        carts.insert_one({
            "user_id": user_id,
            "items":   [new_item]
        })
    else:
        # Check if item already in cart
        items = cart["items"]
        found = False

        for item in items:
            if item["name"] == new_item["name"]:
                item["qty"] += new_item["qty"]
                found = True
                break

        if not found:
            items.append(new_item)

        carts.update_one(
            {"user_id": user_id},
            {"$set": {"items": items}}
        )

    return jsonify({"message": "Item added to cart"})


# Clear cart
@app.route("/cart/clear", methods=["POST"])
def clear_cart():
    data = request.json
    carts.update_one(
        {"user_id": data["user_id"]},
        {"$set": {"items": []}}
    )
    return jsonify({"message": "Cart cleared"})


# ─────────────────────────────────────────────────────────────
#  4. ORDERS
# ─────────────────────────────────────────────────────────────

# Place an order
@app.route("/orders/add", methods=["POST"])
def place_order():
    data = request.json

    items    = data["items"]
    subtotal = sum(float(i["price"]) * int(i["qty"]) for i in items)
    tax      = round(subtotal * 0.05, 2)
    delivery = float(data.get("delivery_fee", 0))
    discount = float(data.get("discount", 0))
    total    = round(subtotal + tax + delivery - discount, 2)

    order_id = "WB-" + str(int(datetime.utcnow().timestamp() * 1000))

    order = {
        "order_id":       order_id,
        "user_id":        data.get("user_id", "guest"),
        "customer_name":  data.get("customer_name", "Guest"),
        "items":          items,
        "order_type":     data.get("order_type", "dine-in"),
        "subtotal":       subtotal,
        "tax":            tax,
        "delivery_fee":   delivery,
        "discount":       discount,
        "total":          total,
        "payment_method": data.get("payment_method", "cod"),
        "payment_detail": data.get("payment_detail", ""),
        "status":         "pending",
        "created_at":     now()
    }

    orders.insert_one(order)

    # Save status history
    order_status_history.insert_one({
        "order_id":   order_id,
        "status":     "pending",
        "changed_at": now()
    })

    # Save payment transaction
    payment_transactions.insert_one({
        "order_id":   order_id,
        "user_id":    order["user_id"],
        "method":     order["payment_method"],
        "reference":  order.get("payment_detail", ""),
        "amount":     total,
        "status":     "pending",
        "created_at": now()
    })

    # Clear cart
    carts.update_one(
        {"user_id": order["user_id"]},
        {"$set": {"items": []}}
    )

    # Log activity
    activity_logs.insert_one({
        "type":       "order",
        "message":    f"Order {order_id} placed — Rs. {total}",
        "created_at": now()
    })

    # Update loyalty visits
    if order["user_id"] != "guest":
        update_loyalty(order["user_id"])

    return jsonify({"message": "Order placed", "order_id": order_id})


# Get all orders (admin)
@app.route("/orders", methods=["GET"])
def get_orders():
    all_orders = list(orders.find({}, {"_id": 0}))
    return jsonify(all_orders)


# Get orders for a specific user
@app.route("/orders/<user_id>", methods=["GET"])
def get_user_orders(user_id):
    user_orders = list(orders.find({"user_id": user_id}, {"_id": 0}))
    return jsonify(user_orders)


# Update order status (admin)
@app.route("/orders/status", methods=["POST"])
def update_order_status():
    data = request.json

    orders.update_one(
        {"order_id": data["order_id"]},
        {"$set": {"status": data["status"]}}
    )

    order_status_history.insert_one({
        "order_id":   data["order_id"],
        "status":     data["status"],
        "changed_at": now()
    })

    activity_logs.insert_one({
        "type":       data["status"],
        "message":    f"Order {data['order_id']} → {data['status']}",
        "created_at": now()
    })

    return jsonify({"message": "Order status updated"})


# Delete / cancel order
@app.route("/orders/delete", methods=["POST"])
def delete_order():
    data = request.json
    orders.delete_one({"order_id": data["order_id"]})
    return jsonify({"message": "Order deleted"})


# ─────────────────────────────────────────────────────────────
#  5. RESERVATIONS
# ─────────────────────────────────────────────────────────────

# Make a reservation
@app.route("/reservations/add", methods=["POST"])
def add_reservation():
    data = request.json

    # Check table is free
    table = tables.find_one({"name": data["table_name"]})
    if table and table["status"] != "free":
        return jsonify({"message": "Table is not available"}), 400

    res_id = "RES-" + str(int(datetime.utcnow().timestamp() * 1000))

    preorder = data.get("preorder", [])
    subtotal = sum(float(i["price"]) * int(i["qty"]) for i in preorder)
    total    = round(subtotal * 1.1, 2)

    reservation = {
        "reservation_id":       res_id,
        "user_id":              data.get("user_id", "guest"),
        "table_name":           data["table_name"],
        "people":               data["people"],
        "date":                 data["date"],
        "time":                 data["time"],
        "special_instructions": data.get("special_instructions", ""),
        "preorder":             preorder,
        "subtotal":             subtotal,
        "total":                total,
        "status":               "confirmed",
        "created_at":           now()
    }

    reservations.insert_one(reservation)

    # Mark table as booked
    tables.update_one(
        {"name": data["table_name"]},
        {"$set": {"status": "booked"}}
    )

    activity_logs.insert_one({
        "type":       "res",
        "message":    f"Reservation {res_id}: {data['table_name']} for {data['people']} on {data['date']}",
        "created_at": now()
    })

    return jsonify({"message": "Reservation confirmed", "reservation_id": res_id})


# Get all reservations (admin)
@app.route("/reservations", methods=["GET"])
def get_reservations():
    all_res = list(reservations.find({}, {"_id": 0}))
    return jsonify(all_res)


# Get reservations for a user
@app.route("/reservations/<user_id>", methods=["GET"])
def get_user_reservations(user_id):
    user_res = list(reservations.find({"user_id": user_id}, {"_id": 0}))
    return jsonify(user_res)


# Update reservation status
@app.route("/reservations/status", methods=["POST"])
def update_reservation_status():
    data   = request.json
    res_id = data["reservation_id"]
    status = data["status"]

    reservations.update_one(
        {"reservation_id": res_id},
        {"$set": {"status": status}}
    )

    # Free table if done
    if status in ["completed", "cancelled", "no-show"]:
        res = reservations.find_one({"reservation_id": res_id})
        if res:
            tables.update_one(
                {"name": res["table_name"]},
                {"$set": {"status": "free"}}
            )

    return jsonify({"message": "Reservation status updated"})


# Cancel reservation
@app.route("/reservations/delete", methods=["POST"])
def delete_reservation():
    data = request.json
    res  = reservations.find_one({"reservation_id": data["reservation_id"]})

    reservations.delete_one({"reservation_id": data["reservation_id"]})

    if res:
        tables.update_one(
            {"name": res["table_name"]},
            {"$set": {"status": "free"}}
        )

    return jsonify({"message": "Reservation cancelled"})


# ─────────────────────────────────────────────────────────────
#  6. TABLES
# ─────────────────────────────────────────────────────────────

# Get all tables (optional ?type=table or ?type=event-room)
@app.route("/tables", methods=["GET"])
def get_tables():
    t_type = request.args.get("type")

    if t_type:
        result = list(tables.find({"type": t_type}, {"_id": 0}))
    else:
        result = list(tables.find({}, {"_id": 0}))

    return jsonify(result)


# Add table (admin)
@app.route("/tables/add", methods=["POST"])
def add_table():
    data = request.json

    table = {
        "name":       data["name"],
        "capacity":   data["capacity"],
        "type":       data.get("type", "table"),    # table or event-room
        "status":     data.get("status", "free"),   # free, booked, maintenance
        "location":   data.get("location", ""),
        "created_at": now()
    }

    tables.insert_one(table)
    return jsonify({"message": "Table added"})


# Update table status
@app.route("/tables/update", methods=["POST"])
def update_table():
    data = request.json
    tables.update_one(
        {"name": data["name"]},
        {"$set": data}
    )
    return jsonify({"message": "Table updated"})


# Delete table
@app.route("/tables/delete", methods=["POST"])
def delete_table():
    data = request.json
    tables.delete_one({"name": data["name"]})
    return jsonify({"message": "Table deleted"})


# ─────────────────────────────────────────────────────────────
#  7. ACTIVITY LOGS
# ─────────────────────────────────────────────────────────────

# Get recent logs
@app.route("/activity", methods=["GET"])
def get_activity():
    logs = list(activity_logs.find({}, {"_id": 0})
                              .sort("created_at", -1)
                              .limit(25))
    return jsonify(logs)


# Add manual log
@app.route("/activity/add", methods=["POST"])
def add_activity():
    data = request.json
    activity_logs.insert_one({
        "type":       data["type"],
        "message":    data["message"],
        "created_at": now()
    })
    return jsonify({"message": "Activity logged"})


# ─────────────────────────────────────────────────────────────
#  8. REVIEWS
# ─────────────────────────────────────────────────────────────

# Get all approved reviews
@app.route("/reviews", methods=["GET"])
def get_reviews():
    all_reviews = list(reviews.find({"approved": True}, {"_id": 0}))
    return jsonify(all_reviews)


# Submit a review
@app.route("/reviews/add", methods=["POST"])
def add_review():
    data = request.json

    review = {
        "user_id":       data.get("user_id", "guest"),
        "reviewer_name": data.get("reviewer_name", "Anonymous"),
        "rating":        data["rating"],
        "comment":       data["comment"],
        "approved":      True, ## False for when admin has buttons from frontend
        "created_at":    now()
    }

    reviews.insert_one(review)
    return jsonify({"message": "Review submitted"})


# Approve review (admin)
@app.route("/reviews/approve", methods=["POST"])
def approve_review():
    data = request.json
    reviews.update_one(
        {"_id": ObjectId(data["review_id"])},
        {"$set": {"approved": True}}
    )
    return jsonify({"message": "Review approved"})


# Delete review (admin)
@app.route("/reviews/delete", methods=["POST"])
def delete_review():
    data = request.json
    reviews.delete_one({"_id": ObjectId(data["review_id"])})
    return jsonify({"message": "Review deleted"})


# ─────────────────────────────────────────────────────────────
#  9. EVENTS
# ─────────────────────────────────────────────────────────────

# Get all events
@app.route("/events", methods=["GET"])
def get_events():
    all_events = list(events.find({}, {"_id": 0}))
    return jsonify(all_events)


# Add event (admin)
@app.route("/events/add", methods=["POST"])
def add_event():
    data = request.json

    event = {
        "title":       data["title"],
        "description": data.get("description", ""),
        "event_date":  data["event_date"],
        "time":        data.get("time", ""),
        "price":       data["price"],
        "image_url":   data.get("image_url", ""),
        "created_at":  now()
    }

    events.insert_one(event)
    return jsonify({"message": "Event added"})


# Update event
@app.route("/events/update", methods=["POST"])
def update_event():
    data = request.json
    events.update_one(
        {"title": data["title"]},
        {"$set": data}
    )
    return jsonify({"message": "Event updated"})


# Delete event
@app.route("/events/delete", methods=["POST"])
def delete_event():
    data = request.json
    events.delete_one({"title": data["title"]})
    return jsonify({"message": "Event deleted"})


# ─────────────────────────────────────────────────────────────
#  10. CONTACTS
# ─────────────────────────────────────────────────────────────

# Submit contact message
@app.route("/contact/add", methods=["POST"])
def add_contact():
    data = request.json

    message = {
        "name":       data["name"],
        "email":      data.get("email", ""),
        "message":    data["message"],
        "read":       False,
        "created_at": now()
    }

    contacts.insert_one(message)
    return jsonify({"message": "Message sent"})


# Get all messages (admin)
@app.route("/contact", methods=["GET"])
def get_contacts():
    all_messages = list(contacts.find({}, {"_id": 0}))
    return jsonify(all_messages)


# Mark message as read
@app.route("/contact/read", methods=["POST"])
def mark_read():
    data = request.json
    contacts.update_one(
        {"_id": ObjectId(data["contact_id"])},
        {"$set": {"read": True}}
    )
    return jsonify({"message": "Marked as read"})


# ─────────────────────────────────────────────────────────────
#  11. ORDER STATUS HISTORY
# ─────────────────────────────────────────────────────────────

# Get history for one order
@app.route("/order-history/<order_id>", methods=["GET"])
def get_order_history(order_id):
    history = list(order_status_history.find(
        {"order_id": order_id}, {"_id": 0}
    ))
    return jsonify(history)


# ─────────────────────────────────────────────────────────────
#  12. PAYMENT TRANSACTIONS
# ─────────────────────────────────────────────────────────────

# Get all payments (admin)
@app.route("/payments", methods=["GET"])
def get_payments():
    all_payments = list(payment_transactions.find({}, {"_id": 0}))
    return jsonify(all_payments)


# Get payment for one order
@app.route("/payments/<order_id>", methods=["GET"])
def get_payment(order_id):
    payment = payment_transactions.find_one(
        {"order_id": order_id}, {"_id": 0}
    )
    if not payment:
        return jsonify({"message": "Payment not found"}), 404
    return jsonify(payment)


# Verify / update payment status (admin)
@app.route("/payments/verify", methods=["POST"])
def verify_payment():
    data = request.json
    payment_transactions.update_one(
        {"order_id": data["order_id"]},
        {"$set": {"status": data["status"]}}
    )
    return jsonify({"message": "Payment status updated"})


# ─────────────────────────────────────────────────────────────
#  13. LOYALTY TIERS
# ─────────────────────────────────────────────────────────────

# Get all tiers
@app.route("/loyalty/tiers", methods=["GET"])
def get_tiers():
    tiers = list(loyalty_tiers.find({}, {"_id": 0}))
    return jsonify(tiers)


# Add tier (admin)
@app.route("/loyalty/tiers/add", methods=["POST"])
def add_tier():
    data = request.json

    tier = {
        "tier_name":    data["tier_name"],
        "icon":         data.get("icon", "🏅"),
        "min_visits":   data["min_visits"],
        "benefits":     data["benefits"],
        "discount_pct": data.get("discount_pct", 0)
    }

    loyalty_tiers.insert_one(tier)
    return jsonify({"message": "Tier added"})


# Update tier
@app.route("/loyalty/tiers/update", methods=["POST"])
def update_tier():
    data = request.json
    loyalty_tiers.update_one(
        {"tier_name": data["tier_name"]},
        {"$set": data}
    )
    return jsonify({"message": "Tier updated"})


# Delete tier
@app.route("/loyalty/tiers/delete", methods=["POST"])
def delete_tier():
    data = request.json
    loyalty_tiers.delete_one({"tier_name": data["tier_name"]})
    return jsonify({"message": "Tier deleted"})


# Get loyalty info for a user
@app.route("/loyalty/<user_id>", methods=["GET"])
def get_user_loyalty(user_id):
    user = users.find_one(
        {"phone": user_id},
        {"name": 1, "visits": 1, "tier": 1, "reward_available": 1, "_id": 0}
    )
    if not user:
        return jsonify({"message": "User not found"}), 404

    tiers    = list(loyalty_tiers.find({}, {"_id": 0}).sort("min_visits", 1))
    visits   = user.get("visits", 0)
    next_tier = None

    for t in tiers:
        if visits < t["min_visits"]:
            next_tier = t
            break

    return jsonify({
        "user":           user,
        "next_tier":      next_tier,
        "visits_to_next": (next_tier["min_visits"] - visits) if next_tier else 0
    })


# ─────────────────────────────────────────────────────────────
#  LOYALTY HELPER
# ─────────────────────────────────────────────────────────────

def update_loyalty(user_id):
    """Called after every order — increments visits and upgrades tier."""
    user = users.find_one({"phone": user_id})
    if not user:
        return

    visits = user.get("visits", 0) + 1
    reward = (visits % 4 == 0)          # free meal every 4 visits

    # Find matching tier
    tier_name = "bronze"
    all_tiers = list(loyalty_tiers.find().sort("min_visits", -1))
    for t in all_tiers:
        if visits >= t["min_visits"]:
            tier_name = t["tier_name"].lower()
            break

    update_data = {
        "visits": visits,
        "tier":   tier_name
    }
    if reward:
        update_data["reward_available"] = True

    users.update_one(
        {"phone": user_id},
        {"$set": update_data}
    )


# ─────────────────────────────────────────────────────────────
#  ADMIN STATS
# ─────────────────────────────────────────────────────────────

@app.route("/admin/stats", methods=["GET"])
def admin_stats():

    total_orders    = orders.count_documents({})
    pending_orders  = orders.count_documents({"status": "pending"})
    total_users     = users.count_documents({})
    unread_messages = contacts.count_documents({"read": False})
    pending_reviews = reviews.count_documents({"approved": False})
    today           = datetime.utcnow().strftime("%Y-%m-%d")
    todays_res      = reservations.count_documents({"date": today})

    # Total revenue from completed orders
    revenue = 0
    for o in orders.find({"status": "completed"}):
        revenue += o.get("total", 0)

    # Orders grouped by status
    status_count = {}
    for o in orders.find():
        s = o.get("status", "pending")
        status_count[s] = status_count.get(s, 0) + 1

    # Top 5 ordered items
    item_count = {}
    for o in orders.find():
        for item in o.get("items", []):
            name = item["name"]
            item_count[name] = item_count.get(name, 0) + item.get("qty", 1)

    top_items = sorted(item_count.items(), key=lambda x: x[1], reverse=True)[:5]
    top_items = [{"name": n, "qty": q} for n, q in top_items]

    return jsonify({
        "total_orders":        total_orders,
        "pending_orders":      pending_orders,
        "total_users":         total_users,
        "unread_messages":     unread_messages,
        "pending_reviews":     pending_reviews,
        "todays_reservations": todays_res,
        "total_revenue":       round(revenue, 2),
        "orders_by_status":    status_count,
        "top_menu_items":      top_items
    })


# ─────────────────────────────────────────────────────────────
#  SEED — run once to fill default data
# ─────────────────────────────────────────────────────────────

@app.route("/seed", methods=["POST"])
def seed():
    seeded = {}

    # Tables
    if tables.count_documents({}) == 0:
        default_tables = [
            {"name": "Table 1",   "capacity": 2,   "type": "table",      "status": "free", "location": "Main Hall"},
            {"name": "Table 2",   "capacity": 4,   "type": "table",      "status": "free", "location": "Main Hall"},
            {"name": "Table 3",   "capacity": 4,   "type": "table",      "status": "free", "location": "Main Hall"},
            {"name": "Table 4",   "capacity": 6,   "type": "table",      "status": "free", "location": "Outdoor"},
            {"name": "Table 5",   "capacity": 8,   "type": "table",      "status": "free", "location": "Outdoor"},
            {"name": "Marquee A", "capacity": 50,  "type": "event-room", "status": "free", "location": "1st Floor"},
            {"name": "Marquee B", "capacity": 100, "type": "event-room", "status": "free", "location": "Rooftop"},
        ]
        tables.insert_many(default_tables)
        seeded["tables"] = len(default_tables)

    # Loyalty tiers
    if loyalty_tiers.count_documents({}) == 0:
        default_tiers = [
            {"tier_name": "Bronze", "icon": "🍽️", "min_visits": 0,  "benefits": ["Welcome discount"],                             "discount_pct": 0},
            {"tier_name": "Silver", "icon": "🌟", "min_visits": 8,  "benefits": ["Priority reservations", "10% off events"],       "discount_pct": 5},
            {"tier_name": "Gold",   "icon": "👑", "min_visits": 20, "benefits": ["VIP lounge", "15% off all orders"],              "discount_pct": 15},
        ]
        loyalty_tiers.insert_many(default_tiers)
        seeded["loyalty_tiers"] = len(default_tiers)

    # Menu items
    if menu_items.count_documents({}) == 0:
        default_menu = [
            {"name": "Chicken Karahi",       "price": 1490, "category": "Pakistani Mains", "emoji": "🍲", "badge": "Popular",        "description": "Slow-cooked tomato & spice gravy", "available": True},
            {"name": "Beef Nihari",           "price": 1650, "category": "Pakistani Mains", "emoji": "🥘", "badge": "Chef's Special", "description": "Overnight slow-braised beef shank", "available": True},
            {"name": "Mutton Biryani",        "price": 1350, "category": "Pakistani Mains", "emoji": "🍛", "badge": "Popular",        "description": "Fragrant basmati with tender mutton", "available": True},
            {"name": "Grilled Chicken Steak", "price": 1850, "category": "Continental",     "emoji": "🥩", "badge": "Popular",        "description": "Herb-marinated halal chicken breast", "available": True},
            {"name": "Beef Tenderloin",       "price": 2490, "category": "Continental",     "emoji": "🥩", "badge": "Chef's Special", "description": "Halal dry-aged tenderloin", "available": True},
            {"name": "Penne Arrabiata",       "price": 950,  "category": "Continental",     "emoji": "🍝", "badge": "",              "description": "Spicy tomato, garlic & fresh basil", "available": True},
            {"name": "Beef Seekh Kebab",      "price": 1150, "category": "Starters",        "emoji": "🍢", "badge": "Popular",        "description": "Charcoal-grilled minced beef skewers", "available": True},
            {"name": "Chicken Wings",         "price": 850,  "category": "Starters",        "emoji": "🍗", "badge": "Spicy",          "description": "Crispy buffalo-style halal wings", "available": True},
            {"name": "Garlic Bread",          "price": 450,  "category": "Starters",        "emoji": "🥖", "badge": "Veg",            "description": "Toasted ciabatta with herb butter", "available": True},
            {"name": "Chocolate Lava Cake",   "price": 650,  "category": "Desserts",        "emoji": "🍫", "badge": "Popular",        "description": "Warm dark chocolate, vanilla gelato", "available": True},
            {"name": "Mango Kulfi",           "price": 450,  "category": "Desserts",        "emoji": "🍦", "badge": "",              "description": "Traditional Pakistani frozen dessert", "available": True},
            {"name": "Kashmiri Chai",         "price": 350,  "category": "Beverages",       "emoji": "☕", "badge": "Popular",        "description": "Pink milk tea with pistachios", "available": True},
            {"name": "Fresh Lemonade",        "price": 250,  "category": "Beverages",       "emoji": "🍋", "badge": "",              "description": "Chilled mint lemonade", "available": True},
            {"name": "Cold Coffee",           "price": 380,  "category": "Beverages",       "emoji": "☕", "badge": "",              "description": "Blended iced coffee with cream", "available": True},
        ]
        menu_items.insert_many(default_menu)
        seeded["menu_items"] = len(default_menu)

    if not seeded:
        return jsonify({"message": "Already seeded — nothing to insert."})

    return jsonify({"message": "Seed done!", "inserted": seeded})


# ─────────────────────────────────────────────────────────────
#  Run server
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)