from flask import Flask, jsonify, request
from pymongo import MongoClient
from datetime import datetime

# ── MongoDB connection ────────────────────────────────────────
client = MongoClient("mongodb://localhost:27017/")

# Database
db = client["hotelDB"]
 
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
seeded = {}
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