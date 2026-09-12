// Menu data + tables + events. Every dish has its own image.
const IMG = {
  biryani:'assets/dish-biryani.jpg', karahi:'assets/dish-karahi.jpg',
  nihari:'assets/dish-nihari.jpg', handi:'assets/dish-handi.jpg',
  daal:'assets/dish-daal.jpg', sajji:'assets/dish-sajji.jpg',
  seekh:'assets/dish-seekh.jpg', tikka:'assets/dish-tikka.jpg',
  tikkaboti:'assets/dish-tikkaboti.jpg', samosa:'assets/dish-samosa.jpg',
  shami:'assets/dish-shami.jpg',
  steak:'assets/hero-steak.jpg', lemonchicken:'assets/dish-lemonchicken.jpg',
  salmon:'assets/dish-salmon.jpg', burger:'assets/dish-burger.jpg',
  mac:'assets/dish-mac.jpg', arabiata:'assets/dish-arabiata.jpg',
  chickenpasta:'assets/dish-chickenpasta.jpg', friedrice:'assets/dish-friedrice.jpg',
  caesar:'assets/dish-caesar.jpg', greek:'assets/dish-greek.jpg',
  gulabjamun:'assets/dish-gulabjamun.jpg', fondant:'assets/dish-fondant.jpg',
  cheesecake:'assets/dish-cheesecake.jpg', kheer:'assets/dish-kheer.jpg',
  brulee:'assets/dish-brulee.jpg',
  lemonade:'assets/dish-lemonade.jpg', lassi:'assets/dish-lassi.jpg',
  chai:'assets/dish-chai.jpg', fruitshake:'assets/dish-fruitshake.jpg',
  espresso:'assets/dish-espresso.jpg',
  naan:'assets/dish-naan.jpg', paratha:'assets/dish-paratha.jpg',
  garlicbread:'assets/dish-garlicbread.jpg',
  interior:'assets/interior.jpg',
};

// One unique image per dish id
const IMAGE_BY_ID = {
  1:IMG.biryani, 2:IMG.karahi, 3:IMG.nihari, 4:IMG.handi, 5:IMG.daal, 6:IMG.sajji,
  7:IMG.seekh, 8:IMG.tikka, 9:IMG.samosa, 10:IMG.shami,
  11:IMG.steak, 12:IMG.lemonchicken, 13:IMG.salmon, 15:IMG.burger,
  14:IMG.mac, 16:IMG.arabiata, 17:IMG.chickenpasta, 18:IMG.friedrice,
  19:IMG.caesar, 20:IMG.greek,
  21:IMG.gulabjamun, 22:IMG.fondant, 23:IMG.cheesecake, 24:IMG.kheer, 25:IMG.brulee,
  26:IMG.lemonade, 27:IMG.lassi, 28:IMG.chai, 29:IMG.fruitshake, 30:IMG.espresso,
  31:IMG.naan, 32:IMG.paratha, 33:IMG.garlicbread,
};

const RAW = [
  {id:1,name:"Chicken Biryani",category:"Pakistani Mains",price:1200,badge:"Popular",description:"Fragrant basmati layered with saffron-marinated chicken, slow-dum cooked."},
  {id:2,name:"Mutton Karahi",category:"Pakistani Mains",price:1800,badge:"Chef's Pick",description:"Slow-braised mutton in tomato-ginger gravy, cast-iron seared."},
  {id:3,name:"Beef Nihari",category:"Pakistani Mains",price:1500,badge:"Halal",description:"Eight-hour stew of beef shank with traditional whole spices."},
  {id:4,name:"Chicken Handi",category:"Pakistani Mains",price:1300,badge:"Popular",description:"Creamy tomato-yogurt chicken finished with fresh cream."},
  {id:5,name:"Daal Makhani",category:"Pakistani Mains",price:750,badge:"Veg",description:"Black lentils simmered overnight with butter and cream."},
  {id:6,name:"Lamb Sajji",category:"Pakistani Mains",price:2200,badge:"Spicy",description:"Balochi-style whole lamb leg, smoked and slow-roasted."},
  {id:7,name:"Seekh Kebab",category:"Pakistani Starters",price:950,badge:"Popular",description:"Minced beef skewers char-grilled over coals."},
  {id:8,name:"Chicken Tikka",category:"Pakistani Starters",price:1100,badge:"Halal",description:"Tandoor-grilled chicken in yogurt-spice marinade."},
  {id:9,name:"Samosa (4 pcs)",category:"Pakistani Starters",price:400,badge:"Veg",description:"Crisp pastry parcels with spiced potato and peas."},
  {id:10,name:"Shami Kebab",category:"Pakistani Starters",price:700,badge:"",description:"Pan-seared beef-lentil patties with mint chutney."},
  {id:11,name:"Grilled Ribeye Steak",category:"Western Mains",price:3500,badge:"Popular",description:"Prime ribeye, herb butter, charred to your preference."},
  {id:12,name:"Lemon Herb Chicken",category:"Western Mains",price:2200,badge:"",description:"Sous-vide chicken breast, lemon-thyme jus."},
  {id:13,name:"Grilled Salmon",category:"Western Mains",price:2800,badge:"Chef's Pick",description:"Atlantic salmon, asparagus, beurre blanc."},
  {id:14,name:"Truffle Mac & Cheese",category:"Pasta & Rice",price:1800,badge:"Veg",description:"Three-cheese béchamel with shaved black truffle."},
  {id:15,name:"Beef Burger (Halal)",category:"Western Mains",price:1400,badge:"Halal",description:"Wagyu blend patty, aged cheddar, brioche, truffle fries."},
  {id:16,name:"Pasta Arabiata",category:"Pasta & Rice",price:1200,badge:"Veg",description:"Penne in spicy San Marzano tomato sugo."},
  {id:17,name:"Chicken Pasta Bake",category:"Pasta & Rice",price:1600,badge:"Popular",description:"Penne, grilled chicken, mozzarella, oven-finished."},
  {id:18,name:"Vegetable Fried Rice",category:"Pasta & Rice",price:900,badge:"Veg",description:"Wok-tossed jasmine rice with garden vegetables."},
  {id:19,name:"Caesar Salad",category:"Salads",price:900,badge:"Popular",description:"Romaine, parmesan, anchovy dressing, garlic croutons."},
  {id:20,name:"Greek Salad",category:"Salads",price:850,badge:"Veg",description:"Tomato, cucumber, feta, olives, oregano vinaigrette."},
  {id:21,name:"Gulab Jamun",category:"Desserts",price:450,badge:"Popular",description:"Cardamom-rose syrup-soaked milk dumplings."},
  {id:22,name:"Chocolate Fondant",category:"Desserts",price:950,badge:"Chef's Pick",description:"Molten dark chocolate, vanilla bean ice cream."},
  {id:23,name:"New York Cheesecake",category:"Desserts",price:800,badge:"",description:"Classic baked cheesecake, berry compote."},
  {id:24,name:"Kheer",category:"Desserts",price:400,badge:"Veg",description:"Slow-cooked rice pudding with pistachio and saffron."},
  {id:25,name:"Crème Brûlée",category:"Desserts",price:700,badge:"",description:"Vanilla custard with caramelized sugar crust."},
  {id:26,name:"Fresh Mint Lemonade",category:"Drinks",price:350,badge:"Popular",description:"House-pressed lemon with crushed mint."},
  {id:27,name:"Mango Lassi",category:"Drinks",price:400,badge:"Popular",description:"Yogurt blended with Sindhri mango pulp."},
  {id:28,name:"Kashmiri Chai",category:"Drinks",price:300,badge:"",description:"Pink salted tea with pistachio."},
  {id:29,name:"Fresh Fruit Shake",category:"Drinks",price:450,badge:"Veg",description:"Seasonal fruits, milk, honey."},
  {id:30,name:"Espresso",category:"Drinks",price:320,badge:"",description:"Single-origin double shot."},
  {id:31,name:"Garlic Naan",category:"Breads",price:220,badge:"Popular",description:"Tandoor-baked naan brushed with garlic butter."},
  {id:32,name:"Paratha",category:"Breads",price:180,badge:"",description:"Flaky layered flatbread."},
  {id:33,name:"Garlic Bread (Western)",category:"Breads",price:350,badge:"Veg",description:"Toasted baguette with garlic-herb butter."},
];

const MENU = RAW.map(m => ({...m, image: IMAGE_BY_ID[m.id] || IMG.steak}));
const CATEGORIES = [...new Set(MENU.map(m => m.category))];

const TABLES = [
  {id:"T1",name:"Window 2-seat",capacity:2,deposit:0},
  {id:"T2",name:"Booth 4-seat",capacity:4,deposit:0},
  {id:"T3",name:"Family 6-seat",capacity:6,deposit:500},
  {id:"T4",name:"Bar Table 2",capacity:2,deposit:0},
  {id:"T5",name:"Garden 4-seat",capacity:4,deposit:500},
  {id:"T6",name:"Corner 8-seat",capacity:8,deposit:1000},
  {id:"T7",name:"Terrace 4-seat",capacity:4,deposit:500},
  {id:"R1",name:"Birthday Room (12)",capacity:12,deposit:5000},
  {id:"R3",name:"Garden Pavilion (20)",capacity:20,deposit:10000},
  {id:"R4",name:"Skyline Suite (30)",capacity:30,deposit:15000},
];

// Event packages — per-person pricing
const EVENTS = [
  {id:"none",   name:"Standard dining",     perPerson:0,    desc:"Regular à la carte dining, no event setup."},
  {id:"birth",  name:"Birthday celebration",perPerson:1800, desc:"3-course menu, balloon arch, complimentary cake (1kg)."},
  {id:"anniv",  name:"Anniversary dinner",  perPerson:2500, desc:"5-course tasting menu, rose petal setup, dessert platter."},
  {id:"engage", name:"Engagement",          perPerson:3200, desc:"Premium 6-course menu, floral stage, photographer 1hr."},
  {id:"corp",   name:"Corporate dinner",    perPerson:2200, desc:"Buffet menu, projector, name cards, dedicated server."},
  {id:"other",  name:"Other / Custom",      perPerson:1500, desc:"Custom setup — our team will call to confirm details."},
];

const ADMIN = { email:"admin@westernbistro.com", password:"admin123" };
const fmt = n => "Rs " + Math.round(n).toLocaleString("en-PK");
