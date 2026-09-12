/* Western Bistro — vanilla JS SPA: hash routing, localStorage, accounts, validation, receipts. */
(function(){
  document.getElementById('year').textContent = new Date().getFullYear();

  // ===== Storage =====
  const LS = {
    get:(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v) } catch{ return d } },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
  };
  const State = {
    cart: LS.get('wb_cart', []),
    orders: LS.get('wb_orders', []),
    reservations: LS.get('wb_resv', []),
    admin: LS.get('wb_admin', false),
    users: LS.get('wb_users', []),        // [{name,email,phone,password}]
    user: LS.get('wb_user', null),         // current logged-in customer email
  };
  const save = () => {
    LS.set('wb_cart', State.cart);
    LS.set('wb_orders', State.orders);
    LS.set('wb_resv', State.reservations);
    LS.set('wb_admin', State.admin);
    LS.set('wb_users', State.users);
    LS.set('wb_user', State.user);
    document.getElementById('cart-count').textContent =
      State.cart.reduce((s,i)=>s+i.qty,0);
    const btn = document.getElementById('account-btn');
    if(btn){
      btn.textContent = State.user ? ('Hi, ' + (currentUser()?.name?.split(' ')[0] || 'You')) : 'Sign in';
    }
  };
  const currentUser = () => State.user ? State.users.find(u=>u.email===State.user) : null;

  // ===== Toast =====
  let toastTimer;
  const toastEl = document.getElementById('toast');
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toastEl.classList.remove('show'), 2400);
  }

  // ===== Modal =====
  function modal(html, footer){
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-back" id="mb">
      <div class="modal" onclick="event.stopPropagation()">${html}
      ${footer ? `<div class="foot">${footer}</div>` : ''}
      </div></div>`;
    document.getElementById('mb').onclick = () => root.innerHTML = '';
    root.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>root.innerHTML='');
  }
  function closeModal(){ document.getElementById('modal-root').innerHTML=''; }
  window.__wbCloseModal = closeModal;

  // ===== Validation helpers =====
  const RX = {
    name: /^[A-Za-z][A-Za-z\s.'-]{1,49}$/,
    phone: /^(\+?\d[\d\s-]{7,15})$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    pwd:  /^.{6,}$/,
    card: /^\d{13,19}$/,
    cvc:  /^\d{3,4}$/,
    exp:  /^(0[1-9]|1[0-2])\/\d{2}$/,
  };
  function validate(form, rules){
    let ok = true;
    Object.entries(rules).forEach(([name, r])=>{
      const el = form.querySelector(`[name="${name}"]`);
      const errEl = form.querySelector(`[data-err="${name}"]`);
      if(!el) return;
      const raw = (el.value||'').trim();
      let msg = '';
      if(r.required && !raw) msg = (r.label||name) + ' is required';
      else if(raw && r.rx && !r.rx.test(raw)) msg = r.msg || ('Invalid ' + (r.label||name));
      else if(raw && r.min && Number(raw) < r.min) msg = (r.label||name) + ' must be ≥ ' + r.min;
      else if(raw && r.max && Number(raw) > r.max) msg = (r.label||name) + ' must be ≤ ' + r.max;
      if(msg){
        ok = false;
        el.classList.add('invalid');
        if(errEl){ errEl.textContent = msg; errEl.classList.add('show'); }
      } else {
        el.classList.remove('invalid');
        if(errEl){ errEl.textContent = ''; errEl.classList.remove('show'); }
      }
    });
    return ok;
  }
  // labelled input helper used in templates
  function field(label, name, opts={}){
    const t = opts.type || 'text';
    const req = opts.required ? '<span class="req">*</span>' : '';
    const ph = opts.placeholder ? ` placeholder="${opts.placeholder}"` : '';
    const val = opts.value!=null ? ` value="${opts.value}"` : '';
    const extra = opts.extra || '';
    if(t==='textarea') return `<div><label>${label}${req}</label><textarea name="${name}" rows="${opts.rows||3}"${ph}${opts.required?' required':''}>${opts.value||''}</textarea><div class="err" data-err="${name}"></div></div>`;
    if(t==='select') return `<div><label>${label}${req}</label><select name="${name}" ${opts.required?'required':''}>${opts.options.map(o=>`<option value="${o.v}" ${o.v==opts.value?'selected':''}>${o.t}</option>`).join('')}</select><div class="err" data-err="${name}"></div></div>`;
    return `<div><label>${label}${req}</label><input type="${t}" name="${name}"${ph}${val} ${opts.required?'required':''} ${extra}/><div class="err" data-err="${name}"></div></div>`;
  }

  // ===== Cart =====
  function addToCart(id){
    const ex = State.cart.find(i=>i.id===id);
    if(ex) ex.qty++; else State.cart.push({id,qty:1});
    save(); toast('Added to cart');
  }
  function setQty(id,q){
    if(q<=0) State.cart = State.cart.filter(i=>i.id!==id);
    else { const it = State.cart.find(i=>i.id===id); if(it) it.qty=q; }
    save(); render();
  }
  function cartSubtotal(){
    let s=0; State.cart.forEach(i=>{const m=MENU.find(x=>x.id===i.id); if(m) s+=m.price*i.qty;}); return s;
  }

  // ===== Router =====
  const routes = {
    '/': renderHome, '/menu': renderMenu, '/reservations': renderReservations,
    '/events': renderEvents, '/about': renderAbout, '/checkout': renderCheckout,
    '/account': renderAccount, '/admin': renderAdmin,
  };
  function getPath(){ return (location.hash.replace(/^#/,'') || '/').split('?')[0]; }
  function render(){
    const path = getPath();
    const fn = routes[path] || routes['/'];
    document.getElementById('app').innerHTML = fn();
    window.scrollTo({top:0,behavior:'instant'});
    bindPage(path);
    save();
  }
  window.addEventListener('hashchange', render);

  // ===== Pages =====
  function renderHome(){
    const feat = MENU.filter(m=>['Popular',"Chef's Pick"].includes(m.badge)).slice(0,6);
    return `
      <section class="hero"><div class="container">
        <div class="eyebrow">Fine Dining · Lahore</div>
        <h1>Where Pakistani warmth<br/>meets Western finesse.</h1>
        <p class="lead">A curated menu of slow-cooked classics and modern grills, served in a softly-lit dining room overlooking the city.</p>
        <div class="actions">
          <a href="#/menu" class="btn btn-primary">Explore Menu</a>
          <a href="#/reservations" class="btn btn-outline" style="color:#fff;border-color:#fff">Reserve a Table</a>
          <a href="#/events" class="btn btn-ghost" style="color:#f0dca8">Host an Event →</a>
        </div>
      </div></section>

      <section class="featured-strip"><div class="container feat">
        <img src="assets/interior.jpg" alt="Restaurant interior" loading="lazy"/>
        <div>
          <div style="color:var(--gold-deep);letter-spacing:.4em;font-size:.75rem;text-transform:uppercase">Our story</div>
          <h2>An evening, perfectly composed.</h2>
          <p style="color:var(--muted)">From hand-pulled biryani to dry-aged ribeye, every plate is built around seasonal ingredients and twenty years of culinary craft.</p>
          <a href="#/about" class="btn btn-ghost">Read more →</a>
        </div>
      </div></section>

      <section class="section"><div class="container">
        <div class="section-head"><div class="eyebrow">Featured</div><h2>Tonight's highlights</h2></div>
        <div class="grid grid-3">${feat.map(itemCard).join('')}</div>
      </div></section>`;
  }

  function itemCard(m){
    return `<article class="card">
      <div class="thumb"><img src="${m.image}" alt="${m.name}" loading="lazy"/></div>
      <div class="body">
        <div class="row" style="margin:0"><h3>${m.name}</h3>${m.badge?`<span class="chip">${m.badge}</span>`:''}</div>
        <p class="desc">${m.description}</p>
        <div class="row"><span class="price">${fmt(m.price)}</span>
          <button class="btn btn-primary btn-sm" data-add="${m.id}">Add</button></div>
      </div></article>`;
  }

  function renderMenu(){
    return `<section class="section"><div class="container">
      <div class="section-head"><div class="eyebrow">Menu</div><h2>Crafted plates, honest flavors</h2></div>
      <input id="menu-search" class="search" placeholder="Search dishes…" />
      <div id="menu-filters" class="filters">
        <button class="filter active" data-cat="All">All</button>
        ${CATEGORIES.map(c=>`<button class="filter" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <div id="menu-grid" class="grid grid-3"></div>
    </div></section>`;
  }

  function renderAbout(){
    return `<section class="section"><div class="container" style="max-width:780px">
      <div class="section-head"><div class="eyebrow">About</div><h2>Two cuisines, one table.</h2></div>
      <p style="color:var(--muted);font-size:1.05rem">Western Bistro opened in 2014 with a simple idea: serve the foods we grew up loving — daal that's been simmered all morning, biryani layered with patience — alongside the European classics our chefs trained on in London and Lyon.</p>
      <p style="color:var(--muted);font-size:1.05rem">Today our dining room seats sixty, our garden pavilion twenty more, and our private Skyline Suite hosts birthdays and rehearsal dinners overlooking Gulberg.</p>
      <img src="assets/interior.jpg" loading="lazy" style="border-radius:var(--radius);margin-top:32px;box-shadow:var(--shadow)"/>
    </div></section>`;
  }

  // ===== Account: Login / Sign up / Guest =====
  function renderAccount(){
    const u = currentUser();
    if(u){
      const myOrders = State.orders.filter(o=>o.customer.email===u.email);
      const myResv = State.reservations.filter(r=>r.email===u.email);
      return `<section class="section"><div class="container" style="max-width:780px">
        <div class="section-head"><div class="eyebrow">Account</div><h2>Welcome, ${u.name}</h2></div>
        <div class="record"><div class="head"><div>
          <strong>${u.name}</strong>
          <div class="meta">${u.email} · ${u.phone}</div>
        </div><button class="btn btn-outline btn-sm" id="signout">Sign out</button></div></div>

        <h3 style="margin-top:30px">Your orders (${myOrders.length})</h3>
        ${myOrders.length===0?'<div class="empty">No orders yet.</div>':myOrders.slice().reverse().map(o=>`
          <div class="record"><div class="head"><div>
            <strong>${o.id}</strong><span class="status ${o.status}">${o.status}</span>
            <div class="meta">${new Date(o.createdAt).toLocaleString()}</div>
          </div><div class="price">${fmt(o.total)}</div></div>
          <div class="meta">${o.items.map(i=>`${i.qty}× ${i.name}`).join(' · ')}</div></div>`).join('')}

        <h3 style="margin-top:30px">Your reservations (${myResv.length})</h3>
        ${myResv.length===0?'<div class="empty">No reservations yet.</div>':myResv.slice().reverse().map(r=>`
          <div class="record"><div class="head"><div>
            <strong>${r.id}</strong><span class="status ${r.status}">${r.status}</span>
            <div class="meta">${r.date} ${r.time} · ${r.guests} guests · ${r.tableName} · ${r.eventName}</div>
          </div><div class="price">${fmt(r.total)}</div></div></div>`).join('')}
      </div></section>`;
    }
    return `<section class="section"><div class="container" style="max-width:920px">
      <div class="section-head"><div class="eyebrow">Account</div><h2>Sign in or continue as guest</h2>
        <p>An account remembers your details and tracks your order history.</p></div>
      <div class="checkout-grid">
        <div>
          <h3>Sign in</h3>
          <form class="form" id="login-cust" novalidate>
            ${field('Email','email',{type:'email',required:true,placeholder:'you@example.com'})}
            ${field('Password','password',{type:'password',required:true,placeholder:'min 6 characters'})}
            <button class="btn btn-primary btn-block" type="submit">Sign in</button>
          </form>
        </div>
        <div>
          <h3>Create account</h3>
          <form class="form" id="signup-cust" novalidate>
            ${field('Full name','name',{required:true})}
            ${field('Email','email',{type:'email',required:true})}
            ${field('Phone','phone',{required:true,placeholder:'+92 300 1234567'})}
            ${field('Password','password',{type:'password',required:true,placeholder:'min 6 characters'})}
            <button class="btn btn-outline btn-block" type="submit">Create account</button>
          </form>
        </div>
      </div>
      <div style="text-align:center;margin-top:30px">
        <a href="#/menu" class="btn btn-ghost">Or continue as guest →</a>
      </div>
    </div></section>`;
  }

  // ===== Events page =====
  function renderEvents(){
    return `<section class="section"><div class="container">
      <div class="section-head"><div class="eyebrow">Private Events</div>
        <h2>Birthdays, anniversaries & celebrations</h2>
        <p>Choose a package below, then head to Reservations to book your date.</p></div>
      <div class="events-grid">
        ${EVENTS.filter(e=>e.id!=='none').map(e=>`
          <div class="event-card">
            <h3>${e.name}</h3>
            <div class="pp">${fmt(e.perPerson)} / person</div>
            <p style="color:var(--muted);font-size:.92rem">${e.desc}</p>
            <a href="#/reservations?event=${e.id}" class="btn btn-primary btn-sm" style="margin-top:8px">Book this package</a>
          </div>`).join('')}
      </div>
    </div></section>`;
  }

  // ===== Reservations =====
  function renderReservations(){
    const today = new Date().toISOString().slice(0,10);
    const u = currentUser();
    const params = new URLSearchParams((location.hash.split('?')[1])||'');
    const preEvent = params.get('event') || 'none';
    return `<section class="section"><div class="container" style="max-width:820px">
      <div class="section-head"><div class="eyebrow">Reservations</div>
        <h2>Save your seat</h2>
        <p>All fields marked <span class="req">*</span> are required. You'll see a full bill before confirming.</p></div>
      ${u ? `<div class="notice">Signed in as <strong>${u.name}</strong> — your details are pre-filled.</div>` : `<div class="notice">Booking as guest. <a href="#/account">Sign in</a> to save this reservation to your account.</div>`}
      <form class="form" id="resv-form" novalidate>
        <div class="row2">
          ${field('Full name','name',{required:true,value:u?.name||''})}
          ${field('Phone','phone',{required:true,value:u?.phone||'',placeholder:'+92 300 1234567'})}
        </div>
        ${field('Email','email',{type:'email',required:true,value:u?.email||''})}
        <div class="row2">
          ${field('Date','date',{type:'date',required:true,value:today,extra:`min="${today}"`})}
          ${field('Time','time',{type:'time',required:true,value:'19:30'})}
        </div>
        <div class="row2">
          ${field('Guests','guests',{type:'number',required:true,value:2,extra:'min="1" max="40"'})}
          ${field('Table / room','table',{type:'select',required:true,options:TABLES.map(t=>({v:t.id,t:`${t.name} · seats ${t.capacity}${t.deposit?` · deposit ${fmt(t.deposit)}`:''}`}))})}
        </div>
        <div>
          <label>Occasion / Event package<span class="req">*</span></label>
          <div class="choice-grid" id="ev-grid">
            ${EVENTS.map(e=>`<button type="button" class="choice ${e.id===preEvent?'active':''}" data-ev="${e.id}">
              <div class="t">${e.name}${e.perPerson?` · ${fmt(e.perPerson)}/pp`:''}</div>
              <div class="s">${e.desc}</div></button>`).join('')}
          </div>
          <input type="hidden" name="event" value="${preEvent}"/>
        </div>
        <div id="event-extras"></div>
        <div>
          <label>Payment method for deposit<span class="req">*</span></label>
          <div class="choice-grid">
            <button type="button" class="choice active" data-pay="cash">
              <div class="t">Pay at venue</div><div class="s">Cash or card on arrival</div></button>
            <button type="button" class="choice" data-pay="card">
              <div class="t">Pay now by card</div><div class="s">Visa / Master / Amex</div></button>
          </div>
          <input type="hidden" name="payment" value="cash"/>
        </div>
        <div id="card-fields" style="display:none">
          <div class="row2">
            ${field('Card number','card',{required:true,placeholder:'4242 4242 4242 4242'})}
            ${field('Name on card','cardName',{required:true})}
          </div>
          <div class="row2">
            ${field('Expiry (MM/YY)','exp',{required:true,placeholder:'04/28'})}
            ${field('CVC','cvc',{required:true,placeholder:'123'})}
          </div>
        </div>
        ${field('Special requests','notes',{type:'textarea',placeholder:'Cake message, allergies, seating preference…'})}
        <div id="resv-summary" class="totals" style="position:static"></div>
        <button class="btn btn-primary" type="submit">Review &amp; confirm reservation</button>
      </form>
    </div></section>`;
  }

  // ===== Checkout =====
  function renderCheckout(){
    if(State.cart.length === 0){
      return `<section class="section"><div class="container">
        <div class="section-head"><div class="eyebrow">Cart</div><h2>Your cart is empty</h2></div>
        <div class="empty"><a href="#/menu" class="btn btn-primary">Browse menu</a></div></div></section>`;
    }
    const u = currentUser();
    const items = State.cart.map(i=>{
      const m = MENU.find(x=>x.id===i.id); if(!m) return '';
      return `<div class="cart-item">
        <img src="${m.image}" alt="${m.name}" loading="lazy"/>
        <div><div style="font-weight:500">${m.name}</div>
          <div style="color:var(--muted);font-size:.9rem">${fmt(m.price)} each</div>
          <div class="qty" style="margin-top:6px">
            <button data-dec="${m.id}">−</button><span>${i.qty}</span>
            <button data-inc="${m.id}">+</button>
            <button data-rem="${m.id}" style="margin-left:8px;color:var(--danger)">✕</button>
          </div></div>
        <div style="font-weight:500">${fmt(m.price*i.qty)}</div></div>`;
    }).join('');
    const sub = cartSubtotal(); const tax = Math.round(sub*0.16); const delivery = 200;
    const total = sub+tax+delivery;

    return `<section class="section"><div class="container checkout-grid">
      <div>
        <div style="color:var(--gold-deep);letter-spacing:.4em;font-size:.75rem;text-transform:uppercase">Checkout</div>
        <h2>Review your order</h2>
        ${items}
        ${u ? `<div class="notice" style="margin-top:18px">Signed in as <strong>${u.name}</strong>.</div>`
            : `<div class="notice" style="margin-top:18px">Checking out as guest. <a href="#/account">Sign in</a> to save this order.</div>`}
        <form class="form" id="order-form" novalidate style="margin-top:20px;max-width:none">
          <div class="row2">
            ${field('Full name','name',{required:true,value:u?.name||''})}
            ${field('Phone','phone',{required:true,value:u?.phone||'',placeholder:'+92 300 1234567'})}
          </div>
          ${field('Email','email',{type:'email',required:true,value:u?.email||''})}
          ${field('Delivery address','address',{type:'textarea',required:true,rows:3,placeholder:'House #, street, area, landmark, city'})}
          <div>
            <label>Payment method<span class="req">*</span></label>
            <div class="choice-grid">
              <button type="button" class="choice active" data-pay="cash">
                <div class="t">Cash on delivery</div><div class="s">Pay the rider in cash</div></button>
              <button type="button" class="choice" data-pay="card">
                <div class="t">Pay now by card</div><div class="s">Visa / Master / Amex</div></button>
            </div>
            <input type="hidden" name="payment" value="cash"/>
          </div>
          <div id="card-fields" style="display:none">
            <div class="row2">
              ${field('Card number','card',{required:true,placeholder:'4242 4242 4242 4242'})}
              ${field('Name on card','cardName',{required:true})}
            </div>
            <div class="row2">
              ${field('Expiry (MM/YY)','exp',{required:true,placeholder:'04/28'})}
              ${field('CVC','cvc',{required:true,placeholder:'123'})}
            </div>
          </div>
          ${field('Order notes','notes',{type:'textarea',rows:2,placeholder:'No onions, ring bell twice…'})}
          <button class="btn btn-primary btn-block" type="submit">Place order · ${fmt(total)}</button>
        </form>
      </div>
      <div><div class="totals">
        <h3 style="margin:0 0 10px">Bill summary</h3>
        <div class="line"><span>Subtotal</span><span>${fmt(sub)}</span></div>
        <div class="line"><span>Tax (16%)</span><span>${fmt(tax)}</span></div>
        <div class="line"><span>Delivery</span><span>${fmt(delivery)}</span></div>
        <div class="line total"><span>Total</span><span>${fmt(total)}</span></div>
        <div style="margin-top:14px;font-size:.8rem;color:var(--muted)">Estimated 35–50 min within Lahore.</div>
      </div></div>
    </div></section>`;
  }

  // ===== Admin =====
  function renderAdmin(){
    if(!State.admin) return renderAdminLogin();
    return renderAdminDashboard();
  }
  function renderAdminLogin(){
    return `<section class="section"><div class="container" style="max-width:440px">
      <div class="section-head"><div class="eyebrow">Admin</div><h2>Sign in</h2>
        <p>Demo: <code>admin@westernbistro.com</code> / <code>admin123</code></p></div>
      <form class="form" id="admin-login" novalidate>
        ${field('Email','email',{type:'email',required:true})}
        ${field('Password','password',{type:'password',required:true})}
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      </form></div></section>`;
  }
  function renderAdminDashboard(){
    const pendingO = State.orders.filter(o=>o.status==='pending').length;
    const doneO = State.orders.filter(o=>o.status==='completed').length;
    const pendingR = State.reservations.filter(r=>r.status==='pending').length;
    const doneR = State.reservations.filter(r=>r.status==='completed').length;
    const revenue = State.orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total,0)
                  + State.reservations.filter(r=>r.status==='completed').reduce((s,r)=>s+(r.total||0),0);
    const params = new URLSearchParams(location.hash.split('?')[1]||'');
    const tab = params.get('t') || 'orders';
    const filter = params.get('f') || 'all';

    const filt = arr => filter==='all'? arr : arr.filter(x=>x.status===filter);

    const ordersHtml = (State.orders.length===0)
      ? `<div class="empty">No orders yet.</div>`
      : (filt(State.orders).slice().reverse().map(o=>`
        <div class="record"><div class="head">
          <div><strong>${o.id}</strong><span class="status ${o.status}">${o.status}</span>
            <span class="user-pill">${o.customer.userType||'guest'}</span>
            <div class="meta">${new Date(o.createdAt).toLocaleString()} · ${o.customer.name} · ${o.customer.phone}</div>
            <div class="meta">${o.customer.email||'—'} · ${o.payment.method}${o.payment.last4?` · card ****${o.payment.last4}`:''}</div>
            <div class="meta">📍 ${o.customer.address}</div>
            ${o.customer.notes?`<div class="meta">📝 ${o.customer.notes}</div>`:''}
          </div>
          <div style="text-align:right">
            <div class="price">${fmt(o.total)}</div>
            <div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
              <button class="btn btn-sm btn-outline" data-view-order="${o.id}">View bill</button>
              ${o.status==='pending'?`<button class="btn btn-sm btn-primary" data-order-done="${o.id}">Mark completed</button>`:''}
              ${(o.status!=='cancelled'&&o.status!=='completed')?`<button class="btn btn-sm btn-danger" data-order-cancel="${o.id}">Cancel</button>`:''}
            </div>
          </div></div>
          <div class="meta">${o.items.map(i=>`${i.qty}× ${i.name}`).join(' · ')}</div>
        </div>`).join('') || `<div class="empty">No ${filter} orders.</div>`);

    const resvHtml = (State.reservations.length===0)
      ? `<div class="empty">No reservations yet.</div>`
      : (filt(State.reservations).slice().reverse().map(r=>`
        <div class="record"><div class="head">
          <div><strong>${r.id}</strong><span class="status ${r.status}">${r.status}</span>
            <span class="user-pill">${r.userType||'guest'}</span>
            <div class="meta">${r.date} at ${r.time} · ${r.guests} guests · ${r.tableName}</div>
            <div class="meta">🎉 ${r.eventName} · ${r.name} · ${r.phone} · ${r.email}</div>
            <div class="meta">Payment: ${r.payment.method}${r.payment.last4?` · card ****${r.payment.last4}`:''}</div>
            ${r.notes?`<div class="meta">📝 ${r.notes}</div>`:''}
          </div>
          <div style="text-align:right">
            <div class="price">${fmt(r.total)}</div>
            <div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
              <button class="btn btn-sm btn-outline" data-view-resv="${r.id}">View bill</button>
              ${r.status==='pending'?`<button class="btn btn-sm btn-primary" data-resv-done="${r.id}">Mark completed</button>`:''}
              ${(r.status!=='cancelled'&&r.status!=='completed')?`<button class="btn btn-sm btn-danger" data-resv-cancel="${r.id}">Cancel</button>`:''}
            </div>
          </div></div>
        </div>`).join('') || `<div class="empty">No ${filter} reservations.</div>`);

    return `<section class="section"><div class="container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div><div style="color:var(--gold-deep);letter-spacing:.4em;font-size:.75rem;text-transform:uppercase">Admin</div>
          <h2 style="margin:6px 0 0">Dashboard</h2></div>
        <button class="btn btn-outline btn-sm" id="admin-logout">Sign out</button>
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="k">Pending orders</div><div class="v">${pendingO}</div></div>
        <div class="stat"><div class="k">Completed orders</div><div class="v">${doneO}</div></div>
        <div class="stat"><div class="k">Pending reservations</div><div class="v">${pendingR}</div></div>
        <div class="stat"><div class="k">Completed reservations</div><div class="v">${doneR}</div></div>
        <div class="stat"><div class="k">Revenue</div><div class="v">${fmt(revenue)}</div></div>
      </div>
      <div class="tabs">
        <button class="tab ${tab==='orders'?'active':''}" data-tab="orders">Orders (${State.orders.length})</button>
        <button class="tab ${tab==='resv'?'active':''}" data-tab="resv">Reservations (${State.reservations.length})</button>
      </div>
      <div class="filters" style="justify-content:flex-start;margin-bottom:18px">
        ${['all','pending','completed','cancelled'].map(f=>`<button class="filter ${filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}
      </div>
      <div>${tab==='orders'?ordersHtml:resvHtml}</div>
    </div></section>`;
  }

  // ===== Bill / receipt rendering =====
  function billHTML(title, lines, meta){
    return `
      <div class="head"><h3>${title}</h3><button class="close" data-close>&times;</button></div>
      <div class="body">
        ${meta?`<div class="receipt-meta">${meta}</div>`:''}
        ${lines.map(l=>`<div class="receipt-line ${l.bold?'tot':''}"><span>${l.k}</span><span>${l.v}</span></div>`).join('')}
      </div>`;
  }
  function showOrderBill(o, confirmCb){
    const lines = [
      ...o.items.map(i=>({k:`${i.qty}× ${i.name}`, v:fmt(i.price*i.qty)})),
      {k:'Subtotal',v:fmt(o.subtotal)},
      {k:'Tax (16%)',v:fmt(o.tax)},
      {k:'Delivery',v:fmt(o.delivery)},
      {k:'Total',v:fmt(o.total),bold:true},
    ];
    const meta = `<strong>${o.id}</strong> · ${new Date(o.createdAt).toLocaleString()}<br/>
      ${o.customer.name} · ${o.customer.phone} · ${o.customer.email||'—'}<br/>
      📍 ${o.customer.address}<br/>
      Payment: ${o.payment.method}${o.payment.last4?` · card ****${o.payment.last4}`:''}
      ${o.customer.notes?`<br/>📝 ${o.customer.notes}`:''}`;
    const foot = confirmCb
      ? `<button class="btn btn-outline" data-close>Back</button><button class="btn btn-primary" id="confirm-btn">Confirm &amp; place order</button>`
      : `<button class="btn btn-primary" data-close>Close</button>`;
    modal(billHTML('Order receipt', lines, meta), foot);
    if(confirmCb){
      document.getElementById('confirm-btn').onclick = () => { closeModal(); confirmCb(); };
    }
  }
  function showResvBill(r, confirmCb){
    const lines = [];
    if(r.eventCost) lines.push({k:`${r.eventName} · ${r.guests} × ${fmt(r.perPerson)}`, v:fmt(r.eventCost)});
    if(r.deposit) lines.push({k:'Room / table deposit', v:fmt(r.deposit)});
    lines.push({k:'Service charge (5%)', v:fmt(r.service)});
    lines.push({k:'Total payable', v:fmt(r.total), bold:true});
    const meta = `<strong>${r.id}</strong><br/>
      ${r.date} at ${r.time} · ${r.guests} guests<br/>
      ${r.tableName} · 🎉 ${r.eventName}<br/>
      ${r.name} · ${r.phone} · ${r.email}<br/>
      Payment: ${r.payment.method}${r.payment.last4?` · card ****${r.payment.last4}`:''}
      ${r.notes?`<br/>📝 ${r.notes}`:''}`;
    const foot = confirmCb
      ? `<button class="btn btn-outline" data-close>Back</button><button class="btn btn-primary" id="confirm-btn">Confirm reservation</button>`
      : `<button class="btn btn-primary" data-close>Close</button>`;
    modal(billHTML('Reservation receipt', lines, meta), foot);
    if(confirmCb){
      document.getElementById('confirm-btn').onclick = () => { closeModal(); confirmCb(); };
    }
  }

  // ===== Page bindings =====
  function bindPage(path){
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick = () => addToCart(+b.dataset.add));
    if(path==='/menu') bindMenu();
    if(path==='/reservations') bindReservations();
    if(path==='/checkout') bindCheckout();
    if(path==='/admin') bindAdmin();
    if(path==='/account') bindAccount();
  }

  function bindMenu(){
    const grid = document.getElementById('menu-grid');
    const search = document.getElementById('menu-search');
    let cat='All', q='';
    const draw = () => {
      const list = MENU.filter(m =>
        (cat==='All'||m.category===cat) &&
        (q===''||m.name.toLowerCase().includes(q)||m.description.toLowerCase().includes(q)));
      grid.innerHTML = list.length ? list.map(itemCard).join('') : `<div class="empty" style="grid-column:1/-1">No dishes match.</div>`;
      grid.querySelectorAll('[data-add]').forEach(b=>b.onclick = () => addToCart(+b.dataset.add));
    };
    document.querySelectorAll('#menu-filters .filter').forEach(b=>{
      b.onclick = () => {
        document.querySelectorAll('#menu-filters .filter').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); cat = b.dataset.cat; draw();
      };
    });
    search.oninput = e => { q = e.target.value.toLowerCase().trim(); draw(); };
    draw();
  }

  function wirePayChoice(form){
    form.querySelectorAll('[data-pay]').forEach(b=>b.onclick = () => {
      form.querySelectorAll('[data-pay]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      form.querySelector('[name="payment"]').value = b.dataset.pay;
      form.querySelector('#card-fields').style.display = b.dataset.pay==='card' ? 'block' : 'none';
    });
  }

  function bindReservations(){
    const form = document.getElementById('resv-form');
    wirePayChoice(form);
    const evInput = form.querySelector('[name="event"]');
    const refreshSummary = () => {
      const fd = new FormData(form);
      const guests = Number(fd.get('guests'))||0;
      const ev = EVENTS.find(e=>e.id===fd.get('event')) || EVENTS[0];
      const table = TABLES.find(t=>t.id===fd.get('table'));
      const eventCost = ev.perPerson * guests;
      const deposit = table?.deposit || 0;
      const sub = eventCost + deposit;
      const service = Math.round(sub*0.05);
      const total = sub + service;
      document.getElementById('resv-summary').innerHTML = `
        <h3 style="margin:0 0 10px">Bill preview</h3>
        ${eventCost?`<div class="line"><span>${ev.name} · ${guests} × ${fmt(ev.perPerson)}</span><span>${fmt(eventCost)}</span></div>`:''}
        ${deposit?`<div class="line"><span>Room / table deposit</span><span>${fmt(deposit)}</span></div>`:''}
        <div class="line"><span>Service (5%)</span><span>${fmt(service)}</span></div>
        <div class="line total"><span>Total payable</span><span>${fmt(total)}</span></div>
        ${total===0?`<div style="margin-top:8px;font-size:.85rem;color:var(--muted)">Standard dining — pay only for what you order on the day.</div>`:''}`;
    };
    form.querySelectorAll('[data-ev]').forEach(b=>b.onclick = () => {
      form.querySelectorAll('[data-ev]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); evInput.value = b.dataset.ev; refreshSummary();
    });
    form.addEventListener('input', refreshSummary);
    refreshSummary();

    form.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(form);
      const pay = fd.get('payment');
      const rules = {
        name:{required:true,rx:RX.name,label:'Name',msg:'Enter a valid name (letters only)'},
        phone:{required:true,rx:RX.phone,label:'Phone',msg:'Enter a valid phone number'},
        email:{required:true,rx:RX.email,label:'Email',msg:'Enter a valid email'},
        date:{required:true,label:'Date'},
        time:{required:true,label:'Time'},
        guests:{required:true,min:1,max:40,label:'Guests'},
        table:{required:true,label:'Table'},
      };
      if(pay==='card'){
        Object.assign(rules,{
          card:{required:true,rx:RX.card,label:'Card number',msg:'13–19 digits'},
          cardName:{required:true,rx:RX.name,label:'Name on card'},
          exp:{required:true,rx:RX.exp,label:'Expiry',msg:'Format MM/YY'},
          cvc:{required:true,rx:RX.cvc,label:'CVC',msg:'3–4 digits'},
        });
      }
      if(!validate(form, rules)){ toast('Please fix the highlighted fields'); return; }

      const guests = +fd.get('guests');
      const ev = EVENTS.find(e=>e.id===fd.get('event'));
      const table = TABLES.find(t=>t.id===fd.get('table'));
      const eventCost = ev.perPerson * guests;
      const deposit = table.deposit;
      const sub = eventCost + deposit;
      const service = Math.round(sub*0.05);
      const total = sub + service;
      const u = currentUser();
      const card = fd.get('card')||'';

      const r = {
        id: 'RV-' + Date.now().toString(36).toUpperCase(),
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
        date: fd.get('date'), time: fd.get('time'), guests,
        tableId: table.id, tableName: table.name,
        eventId: ev.id, eventName: ev.name, perPerson: ev.perPerson,
        eventCost, deposit, service, total,
        notes: fd.get('notes')||'',
        payment: { method: pay==='card'?'Card (paid)':'Pay at venue', last4: pay==='card'?card.slice(-4):'' },
        userType: u?'member':'guest',
        status: 'pending', createdAt: Date.now(),
      };
      showResvBill(r, ()=>{
        State.reservations.push(r); save();
        toast('Reservation confirmed · ' + r.id);
        showResvBill(r); // final receipt view
        form.reset();
        setTimeout(()=>{ /* keep modal */ }, 0);
      });
    };
  }

  function bindCheckout(){
    document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{
      const it=State.cart.find(i=>i.id===+b.dataset.inc); setQty(it.id,it.qty+1);
    });
    document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{
      const it=State.cart.find(i=>i.id===+b.dataset.dec); setQty(it.id,it.qty-1);
    });
    document.querySelectorAll('[data-rem]').forEach(b=>b.onclick=()=>setQty(+b.dataset.rem,0));

    const form = document.getElementById('order-form');
    if(!form) return;
    wirePayChoice(form);
    form.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(form);
      const pay = fd.get('payment');
      const rules = {
        name:{required:true,rx:RX.name,label:'Name',msg:'Enter a valid name'},
        phone:{required:true,rx:RX.phone,label:'Phone',msg:'Enter a valid phone'},
        email:{required:true,rx:RX.email,label:'Email',msg:'Enter a valid email'},
        address:{required:true,label:'Address'},
      };
      if(pay==='card'){
        Object.assign(rules,{
          card:{required:true,rx:RX.card,label:'Card number'},
          cardName:{required:true,rx:RX.name,label:'Name on card'},
          exp:{required:true,rx:RX.exp,label:'Expiry',msg:'Format MM/YY'},
          cvc:{required:true,rx:RX.cvc,label:'CVC'},
        });
      }
      if(!validate(form, rules)){ toast('Please fix the highlighted fields'); return; }

      const sub = cartSubtotal(); const tax = Math.round(sub*0.16); const delivery = 200;
      const u = currentUser();
      const card = fd.get('card')||'';
      const order = {
        id: 'WB-' + Date.now().toString(36).toUpperCase(),
        items: State.cart.map(i=>{const m=MENU.find(x=>x.id===i.id);return {id:i.id,name:m.name,qty:i.qty,price:m.price}}),
        subtotal: sub, tax, delivery, total: sub+tax+delivery,
        customer: {
          name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
          address: fd.get('address'), notes: fd.get('notes')||'',
          userType: u?'member':'guest',
        },
        payment: { method: pay==='card'?'Card (paid)':'Cash on delivery', last4: pay==='card'?card.slice(-4):'' },
        status: 'pending', createdAt: Date.now(),
      };
      showOrderBill(order, ()=>{
        State.orders.push(order);
        State.cart = [];
        save();
        toast('Order placed · ' + order.id);
        showOrderBill(order);
      });
    };
  }

  function bindAccount(){
    const lf = document.getElementById('login-cust');
    if(lf) lf.onsubmit = e => {
      e.preventDefault();
      if(!validate(lf,{email:{required:true,rx:RX.email,label:'Email'},password:{required:true,rx:RX.pwd,label:'Password',msg:'Min 6 chars'}})) return;
      const fd = new FormData(lf);
      const u = State.users.find(x=>x.email===fd.get('email').trim().toLowerCase());
      if(!u || u.password !== fd.get('password')){ toast('Invalid email or password'); return; }
      State.user = u.email; save(); toast('Welcome back, ' + u.name.split(' ')[0]);
      location.hash = '#/';
    };
    const sf = document.getElementById('signup-cust');
    if(sf) sf.onsubmit = e => {
      e.preventDefault();
      const rules = {
        name:{required:true,rx:RX.name,label:'Name'},
        email:{required:true,rx:RX.email,label:'Email'},
        phone:{required:true,rx:RX.phone,label:'Phone'},
        password:{required:true,rx:RX.pwd,label:'Password',msg:'Min 6 chars'},
      };
      if(!validate(sf, rules)) return;
      const fd = new FormData(sf);
      const email = fd.get('email').trim().toLowerCase();
      if(State.users.some(x=>x.email===email)){ toast('Account already exists — sign in'); return; }
      const user = { name: fd.get('name').trim(), email, phone: fd.get('phone').trim(), password: fd.get('password') };
      State.users.push(user); State.user = email; save();
      toast('Welcome, ' + user.name.split(' ')[0]); location.hash = '#/';
    };
    const out = document.getElementById('signout');
    if(out) out.onclick = () => { State.user = null; save(); render(); toast('Signed out'); };
  }

  function bindAdmin(){
    const login = document.getElementById('admin-login');
    if(login){
      login.onsubmit = e => {
        e.preventDefault();
        if(!validate(login,{email:{required:true,rx:RX.email},password:{required:true}})) return;
        const fd = new FormData(login);
        if(fd.get('email').trim().toLowerCase()===ADMIN.email && fd.get('password')===ADMIN.password){
          State.admin = true; save(); render(); toast('Welcome back');
        } else toast('Invalid credentials');
      };
      return;
    }
    document.getElementById('admin-logout').onclick = () => { State.admin=false; save(); render(); };
    const params = new URLSearchParams(location.hash.split('?')[1]||'');
    const tab = params.get('t') || 'orders';
    document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
      const f = params.get('f')||'all';
      location.hash = `#/admin?t=${t.dataset.tab}&f=${f}`;
    });
    document.querySelectorAll('[data-filter]').forEach(t=>t.onclick=()=>{
      location.hash = `#/admin?t=${tab}&f=${t.dataset.filter}`;
    });
    document.querySelectorAll('[data-order-done]').forEach(b=>b.onclick=()=>{
      const o=State.orders.find(x=>x.id===b.dataset.orderDone); if(o){o.status='completed';save();render();}
    });
    document.querySelectorAll('[data-order-cancel]').forEach(b=>b.onclick=()=>{
      const o=State.orders.find(x=>x.id===b.dataset.orderCancel); if(o){o.status='cancelled';save();render();}
    });
    document.querySelectorAll('[data-resv-done]').forEach(b=>b.onclick=()=>{
      const r=State.reservations.find(x=>x.id===b.dataset.resvDone); if(r){r.status='completed';save();render();}
    });
    document.querySelectorAll('[data-resv-cancel]').forEach(b=>b.onclick=()=>{
      const r=State.reservations.find(x=>x.id===b.dataset.resvCancel); if(r){r.status='cancelled';save();render();}
    });
    document.querySelectorAll('[data-view-order]').forEach(b=>b.onclick=()=>{
      const o=State.orders.find(x=>x.id===b.dataset.viewOrder); if(o) showOrderBill(o);
    });
    document.querySelectorAll('[data-view-resv]').forEach(b=>b.onclick=()=>{
      const r=State.reservations.find(x=>x.id===b.dataset.viewResv); if(r) showResvBill(r);
    });
  }

  // init
  save();
  render();
})();
