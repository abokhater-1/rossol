
document.addEventListener('DOMContentLoaded', async () => {
  const els = {
    search:   document.getElementById('search'),
    addBtn:   document.getElementById('addBtn'),
    tbody:    document.getElementById('tbody'),
    empty:    document.getElementById('empty'),

    backdrop:     document.getElementById('modal-backdrop'),
    productModal: document.getElementById('productModal'),
    productForm:  document.getElementById('productForm'),
    modalTitle:   document.getElementById('modalTitle'),
    qtyModal:     document.getElementById('qtyModal'),
    qtyForm:      document.getElementById('qtyForm'),

    notiBar:   document.getElementById('notiBar'),
    notiText:  document.getElementById('notiText'),
    notiClose: document.getElementById('notiClose'),

    notiList:  document.getElementById('notiList'),
    notiEmpty: document.getElementById('notiEmpty'),
    notiCount: document.getElementById('notiCount')
  };

  function ensureModals() {
    if (!els.backdrop) {
      const b = document.createElement('div');
      b.id = 'modal-backdrop';
      b.className = 'modal-backdrop hidden';
      document.body.appendChild(b);
      els.backdrop = b;
    }
    if (!els.productModal) {
      const tmpl = document.createElement('div');
      tmpl.innerHTML = `
        <section id="productModal" class="modal hidden" aria-hidden="true">
          <div class="modal-panel">
            <header class="modal-head">
              <h3 id="modalTitle">Add product</h3>
              <button class="icon-btn" data-close aria-label="Close">✕</button>
            </header>
            <form id="productForm" class="modal-body">
              <input type="hidden" name="id" />
              <div class="grid">
                <label class="field"><span>Name</span><input name="name" type="text" required placeholder="e.g. Sugar" /></label>
                <label class="field"><span>Amount</span><input name="amount" type="number" step="0.01" min="0" required placeholder="e.g. 12" /></label>
                <label class="field"><span>Unit</span><input name="unit" type="text" required placeholder="e.g. kg / L / pcs" /></label>
                <label class="field"><span>Code</span><input name="code" type="text" required placeholder="e.g. SUG-100" /></label>
                <label class="field span-2"><span>Notify when ≤ (optional)</span>
                  <input name="notifyWhen" type="number" step="0.01" min="0" placeholder="e.g. 5" />
                </label>
              </div>
              <footer class="modal-foot">
                <button class="btn" type="button" data-close>Cancel</button>
                <button class="btn btn--primary" type="submit">Save</button>
              </footer>
            </form>
          </div>
        </section>`;
      document.body.appendChild(tmpl.firstElementChild);
      els.productModal = document.getElementById('productModal');
      els.productForm  = document.getElementById('productForm');
      els.modalTitle   = document.getElementById('modalTitle');
    }
    if (!els.qtyModal) {
      const tmpl = document.createElement('div');
      tmpl.innerHTML = `
        <section id="qtyModal" class="modal hidden" aria-hidden="true">
          <div class="modal-panel">
            <header class="modal-head">
              <h3>Change amount</h3>
              <button class="icon-btn" data-close aria-label="Close">✕</button>
            </header>
            <form id="qtyForm" class="modal-body">
              <input type="hidden" name="id" />
              <div class="grid grid-3">
                <label class="field"><span>Operation</span>
                  <select name="op"><option value="set">Set to</option><option value="add">Add</option><option value="sub">Subtract</option></select>
                </label>
                <label class="field span-2"><span>Amount</span>
                  <input name="amount" type="number" step="0.01" placeholder="e.g. 5" required />
                </label>
              </div>
              <footer class="modal-foot">
                <button class="btn" type="button" data-close>Cancel</button>
                <button class="btn btn--primary" type="submit">Apply</button>
              </footer>
            </form>
          </div>
        </section>`;
      document.body.appendChild(tmpl.firstElementChild);
      els.qtyModal = document.getElementById('qtyModal');
      els.qtyForm  = document.getElementById('qtyForm');
    }
  }

  const state = { products: [], dismissed: {}, search: '', notiTimer: null };

  async function loadFromDisk() {
    try {
      const data = await (window.api?.loadData?.() ?? Promise.resolve({ products: [], dismissed: {} }));
      state.products = Array.isArray(data.products) ? data.products : [];
      state.dismissed = data.dismissed && typeof data.dismissed === 'object' ? data.dismissed : {};
    } catch (e) {
      console.error(e); state.products = []; state.dismissed = {};
    }
  }
  async function saveToDisk() {
    try {
      await (window.api?.saveData?.({ products: state.products, dismissed: state.dismissed }) ?? Promise.resolve());
    } catch (e) {
      console.error(e); notify('Could not save to disk', 'warn', 3000);
    }
  }

  const isLow = (p) => typeof p.notifyWhen === 'number' && !Number.isNaN(p.notifyWhen) && Number(p.amount) <= Number(p.notifyWhen);
  const fmt = (v) => { const n = Number(v); return Number.isNaN(n) ? '0' : (Math.round(n*100)/100).toString(); };
  const esc = (s) => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function notify(msg, type='info', duration=2400){
    if(!els.notiBar || !els.notiText) return;
    els.notiText.textContent = msg;
    els.notiBar.classList.remove('hidden','hide','success','warn','info');
    els.notiBar.classList.add('show', type);
    clearTimeout(state.notiTimer);
    state.notiTimer = setTimeout(() => {
      els.notiBar.classList.remove('show');
      els.notiBar.classList.add('hide');
      els.notiBar.addEventListener('animationend', () => {
        els.notiBar.classList.add('hidden');
        els.notiBar.classList.remove('hide','success','warn','info');
      }, { once:true });
    }, duration);
  }
  els.notiClose?.addEventListener('click', () => {
    els.notiBar.classList.add('hidden');
    els.notiBar.classList.remove('show','hide','success','warn','info');
  });

  function lowItems(){ return state.products.filter(p => isLow(p) && !state.dismissed[p.id]); }
  function renderNotiCenter(){
    const items = lowItems();
    els.notiCount.textContent = String(items.length);
    els.notiCount.classList.toggle('hidden', items.length === 0);
    els.notiEmpty.classList.toggle('hidden', items.length !== 0);

    const frag = document.createDocumentFragment();
    items.forEach((p,i) => {
      const li = document.createElement('li');
      li.className = 'noti-item';
      li.dataset.id = p.id;
      li.style.animationDelay = `${Math.min(i*0.03, 0.2)}s`;
      li.innerHTML = `
        <div class="meta">
          <span class="name">${esc(p.name)}</span>
          <span class="dim">(${esc(p.code)})</span>
          <span class="dim">amount: <strong>${fmt(p.amount)}</strong>${p.unit ? ' ' + esc(p.unit) : ''}</span>
          <span class="dim">threshold: ≤ ${fmt(p.notifyWhen)}${p.unit ? ' ' + esc(p.unit) : ''}</span>
        </div>
        <div><button class="mini-btn" data-dismiss="${p.id}" aria-label="Delete notification">🗑 Delete</button></div>
      `;
      frag.appendChild(li);
    });
    els.notiList.innerHTML = '';
    els.notiList.appendChild(frag);
  }
  function renderTable(){
    const q = state.search.trim().toLowerCase();
    const rows = !q ? state.products
                    : state.products.filter(p =>
                        (p.name||'').toLowerCase().includes(q) ||
                        (p.code||'').toLowerCase().includes(q) ||
                        (p.unit||'').toLowerCase().includes(q)
                      );
    if (!rows.length) {
      els.tbody.innerHTML = '';
      els.empty.classList.remove('hidden');
      return;
    } else { els.empty.classList.add('hidden'); }

    const frag = document.createDocumentFragment();
    rows.forEach((p,i) => {
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      tr.className = 'row-enter';
      if (isLow(p)) tr.classList.add('low');
      tr.style.animationDelay = `${Math.min(i*0.03, 0.25)}s`;
      const notifySub = (typeof p.notifyWhen === 'number' && !Number.isNaN(p.notifyWhen))
        ? `<small class="sub">Notify ≤ ${fmt(p.notifyWhen)}${p.unit ? ' ' + esc(p.unit) : ''}</small>` : '';
      tr.innerHTML = `
        <td class="c-name"><strong>${esc(p.name)}</strong>${notifySub}</td>
        <td class="c-amount"><span class="amt">${fmt(p.amount)}</span></td>
        <td class="c-unit">${esc(p.unit)}</td>
        <td class="c-code">${esc(p.code)}</td>
        <td class="c-actions">
          <button class="act act-qty"   data-action="qty">Qty</button>
          <button class="act act-edit"  data-action="edit">Edit</button>
          <button class="act act-del"   data-action="del">Delete</button>
        </td>`;
      frag.appendChild(tr);
    });
    els.tbody.innerHTML = '';
    els.tbody.appendChild(frag);
  }
  function renderAll(){ renderNotiCenter(); renderTable(); }

  function openModal(modalEl){
    const panel = modalEl.querySelector('.modal-panel');
    els.backdrop.classList.remove('hidden');
    modalEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      els.backdrop.classList.add('open');
      if (panel){ panel.classList.remove('closing'); panel.classList.add('open'); }
    });
  }
  function closeModal(modalEl){
    const panel = modalEl.querySelector('.modal-panel');
    els.backdrop.classList.remove('open');
    if (panel){
      panel.classList.remove('open'); panel.classList.add('closing');
      panel.addEventListener('animationend', () => {
        modalEl.classList.add('hidden'); els.backdrop.classList.add('hidden'); panel.classList.remove('closing');
      }, { once:true });
    } else { modalEl.classList.add('hidden'); els.backdrop.classList.add('hidden'); }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.productModal.classList.contains('hidden')) closeModal(els.productModal);
    if (!els.qtyModal.classList.contains('hidden')) closeModal(els.qtyModal);
  });
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]'); if (!closeBtn) return;
    const modal = closeBtn.closest('.modal'); if (modal) closeModal(modal);
  });
  els.backdrop?.addEventListener('click', () => {
    if (!els.productModal.classList.contains('hidden')) closeModal(els.productModal);
    if (!els.qtyModal.classList.contains('hidden')) closeModal(els.qtyModal);
  });

  els.search?.addEventListener('input', (e) => { state.search = e.target.value || ''; renderTable(); });

  els.addBtn?.addEventListener('click', () => {
    ensureModals();                    
    openProductModal('add', null);     
  });

  els.notiList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-dismiss]'); if (!btn) return;
    const id = btn.getAttribute('data-dismiss');
    state.dismissed[id] = true;
    btn.closest('.noti-item')?.classList.add('notice-out');
    await saveToDisk();
    notify('Notification deleted', 'info', 1600);
    setTimeout(renderAll, 200);
  });

  els.tbody?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]'); if (!btn) return;
    const tr  = e.target.closest('tr[data-id]'); if (!tr) return;
    const id  = tr.dataset.id;
    const product = state.products.find(p => p.id === id); if (!product) return;
    const action = btn.dataset.action;
    if (action === 'edit') openProductModal('edit', product);
    if (action === 'qty')  openQtyModal(product);
    if (action === 'del')  confirmDelete(tr, product);
  });

  function setFormValue(form, name, value){ const input=form.elements.namedItem(name); if (input) input.value=value; }
  function getFormValue(form, name){ const input=form.elements.namedItem(name); return input ? input.value : ''; }

  function openProductModal(mode='add', product=null){
    ensureModals();
    els.modalTitle.textContent = mode === 'edit' ? 'Edit product' : 'Add product';
    els.productForm.reset();
    setFormValue(els.productForm, 'id',          product?.id ?? '');
    setFormValue(els.productForm, 'name',        product?.name ?? '');
    setFormValue(els.productForm, 'amount',      product?.amount ?? '');
    setFormValue(els.productForm, 'unit',        product?.unit ?? '');
    setFormValue(els.productForm, 'code',        product?.code ?? '');
    setFormValue(els.productForm, 'notifyWhen',  product?.notifyWhen ?? '');
    openModal(els.productModal);
  }
  function openQtyModal(product){
    ensureModals();
    els.qtyForm.reset();
    setFormValue(els.qtyForm, 'id', product.id);
    setFormValue(els.qtyForm, 'amount', product.amount);
    openModal(els.qtyModal);
  }

  els.productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const id          = getFormValue(form, 'id') || null;
    const name        = getFormValue(form, 'name').trim();
    const amount      = Number(getFormValue(form, 'amount'));
    const unit        = getFormValue(form, 'unit').trim();
    const code        = getFormValue(form, 'code').trim();
    const notifyInput = getFormValue(form, 'notifyWhen').trim();
    const notifyWhen  = notifyInput === '' ? null : Number(notifyInput);

    if (!name || !unit || !code || Number.isNaN(amount) || (notifyInput !== '' && Number.isNaN(notifyWhen))) {
      shake(form); return alert('Please fill all fields with valid values.');
    }
    if (amount < 0 || (notifyWhen !== null && notifyWhen < 0)) {
      shake(form); return alert('Amounts cannot be negative.');
    }
    const duplicate = state.products.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== id);
    if (duplicate) { shake(form); return alert('This product code already exists.'); }

    if (id) {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx !== -1) state.products[idx] = { id, name, amount, unit, code, notifyWhen };
      notify('Product updated', 'success');
      adjustDismissForProduct(state.products.find(p => p.id === id));
      maybeNotifyLow(state.products.find(p => p.id === id));
    } else {
      const prod = { id: uid(), name, amount, unit, code, notifyWhen };
      state.products.unshift(prod);
      notify('Product added', 'success');
      adjustDismissForProduct(prod);
      maybeNotifyLow(prod);
    }
    await saveToDisk();
    renderAll();
    closeModal(els.productModal);
  });

  els.qtyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const id     = getFormValue(form, 'id');
    const amount = Number(getFormValue(form, 'amount'));
    const op     = getFormValue(form, 'op') || 'set';

    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (Number.isNaN(amount)) { shake(form); return alert('Enter a valid amount.'); }

    let newAmt = Number(state.products[idx].amount) || 0;
    if (op === 'set') newAmt = amount;
    if (op === 'add') newAmt += amount;
    if (op === 'sub') newAmt -= amount;
    if (newAmt < 0) newAmt = 0;
    state.products[idx].amount = Number((Math.round(newAmt*100)/100).toFixed(2));

    notify('Amount updated', 'success');
    adjustDismissForProduct(state.products[idx]);
    maybeNotifyLow(state.products[idx]);
    await saveToDisk();
    renderAll();
    closeModal(els.qtyModal);
  });

  function confirmDelete(tr, product){
    if (!confirm(`Delete "${product.name}"?`)) return;
    tr.classList.add('row-out');
    tr.addEventListener('animationend', async () => {
      state.products = state.products.filter(p => p.id !== product.id);
      delete state.dismissed[product.id];
      notify('Product deleted', 'info');
      await saveToDisk();
      renderAll();
    }, { once:true });
  }

  function adjustDismissForProduct(p){ if (!p) return; if (!isLow(p)) { if (state.dismissed[p.id]) delete state.dismissed[p.id]; } }
  function maybeNotifyLow(p){ if (p && isLow(p) && !state.dismissed[p.id]) notify(`"${p.name}" is at or below ${fmt(p.notifyWhen)}${p.unit ? ' ' + p.unit : ''}`, 'warn', 3200); }
  function shake(el){ el.classList.remove('shake'); el.offsetHeight; el.classList.add('shake'); }
  function uid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,7)).toUpperCase(); }

  await loadFromDisk();
  renderAll();
});
