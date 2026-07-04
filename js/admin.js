/* =========================================================
   CWA SCIENCE CLASSES — ADMIN PANEL UI CONTROLLER
   Consumes AdminDB (js/admin-db.js) for all data operations.
========================================================= */

let CURRENT_BATCHES = [];
let CURRENT_STUDENTS = [];
let CURRENT_STUDENT_FOR_RESULTS = null;

/* ---------------- TOAST ---------------- */
function toast(msg, type) {
  const wrap = document.getElementById('aToastWrap');
  const el = document.createElement('div');
  el.className = 'a-toast' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  el.innerHTML = `<i class="fa-solid ${type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => { el.remove(); }, 3200);
}

/* ---------------- MODAL HELPERS ---------------- */
function openModal(html) {
  const overlay = document.getElementById('aModalOverlay');
  document.getElementById('aModalBody').innerHTML = html;
  overlay.classList.add('show');
}
function closeModal() {
  document.getElementById('aModalOverlay').classList.remove('show');
  document.getElementById('aModalBody').innerHTML = '';
}
function confirmDelete(message, onYes) {
  openModal(`
    <h3>Delete Confirm <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <p style="color:var(--a-gray); margin-bottom:10px;">${message}</p>
    <div class="a-modal-actions">
      <button class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
      <button class="a-btn a-btn-danger" id="aConfirmYes">Haan, Delete Karein</button>
    </div>
  `);
  document.getElementById('aConfirmYes').onclick = async () => {
    closeModal();
    await onYes();
  };
}

/* ---------------- LOGIN ---------------- */
async function initLogin() {
  const form = document.getElementById('aLoginForm');
  const errBox = document.getElementById('aLoginError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.remove('show');
    const username = document.getElementById('aUsername').value.trim();
    const password = document.getElementById('aPassword').value;
    const btn = document.getElementById('aLoginBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    const res = await AdminDB.login(username, password);
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
    if (res.ok) {
      showApp();
    } else {
      errBox.textContent = res.error || 'Login fail hua.';
      errBox.classList.add('show');
    }
  });

  const already = await AdminDB.isLoggedIn();
  if (already) showApp();
}

async function showApp() {
  document.getElementById('aLoginWrap').style.display = 'none';
  document.getElementById('aShell').classList.add('show');
  document.getElementById('aUserName').textContent = await AdminDB.getUsername();
  const localBanner = document.getElementById('aLocalBanner');
  localBanner.style.display = AdminDB.isSupabase() ? 'none' : 'flex';
  await loadPanel('dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initNav();
  initLogout();
  initSidebarToggle();
  document.getElementById('year-admin') && (document.getElementById('year-admin').textContent = new Date().getFullYear());

  // Close modal on overlay click or Escape key
  const overlay = document.getElementById('aModalOverlay');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
});

function initLogout() {
  document.getElementById('aLogoutBtn').addEventListener('click', async () => {
    await AdminDB.logout();
    location.reload();
  });
}

function initSidebarToggle() {
  const btn = document.getElementById('aHamburger');
  const sidebar = document.getElementById('aSidebar');
  if (btn) btn.addEventListener('click', () => sidebar.classList.toggle('open'));
}

/* ---------------- NAV / ROUTING ---------------- */
function initNav() {
  document.querySelectorAll('.a-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.getAttribute('data-panel');
      loadPanel(panel);
      document.getElementById('aSidebar').classList.remove('open');
    });
  });
}

async function loadPanel(name) {
  document.querySelectorAll('.a-nav-item').forEach(i => i.classList.toggle('active', i.getAttribute('data-panel') === name));
  document.querySelectorAll('.a-panel').forEach(p => p.classList.remove('active'));
  const panelEl = document.getElementById('panel-' + name);
  if (panelEl) panelEl.classList.add('active');
  document.getElementById('aTopbarTitle').textContent = PANEL_TITLES[name] || 'Dashboard';

  if (name === 'dashboard') await renderDashboard();
  if (name === 'hero') await renderHeroPanel();
  if (name === 'notices') await renderNoticesPanel();
  if (name === 'about') await renderAboutPanel();
  if (name === 'batches') await renderBatchesPanel();
  if (name === 'settings') await renderSettingsPanel();
  if (name === 'terms') await renderTermsPanel();
  if (name === 'students') await renderStudentsPanel();
  if (name === 'results') await renderResultsPanel();
  if (name === 'login-settings') await renderLoginSettingsPanel();
}

const PANEL_TITLES = {
  dashboard: 'Dashboard',
  hero: 'Hero Slider',
  notices: 'Notice Marquee',
  about: 'About / Mentor Section',
  batches: 'Batches Management',
  settings: 'Site Settings (Footer/Contact)',
  terms: 'Terms & Privacy Policy',
  students: 'Student Data',
  results: 'Student Results',
  'login-settings': 'Change Login'
};

/* ---------------- DASHBOARD ---------------- */
async function renderDashboard() {
  const el = document.getElementById('panel-dashboard');
  const [batches, students, hero, notices] = await Promise.all([
    AdminDB.listBatches(), AdminDB.listStudents(), AdminDB.listHeroSlides(), AdminDB.listNotices()
  ]);
  const totalChapters = batches.reduce((sum, b) => sum + (b.subjects || []).reduce((s2, sub) => s2 + (sub.chapters || []).length, 0), 0);
  el.innerHTML = `
    <div class="a-panel-head">
      <div><h3>Welcome, Avinash 👋</h3><p>CWA SCIENCE CLASSES Admin Panel overview</p></div>
    </div>
    <div class="a-grid-3 a-mb">
      ${dashCard('fa-layer-group', batches.length, 'Total Batches', '#4C3CE3')}
      ${dashCard('fa-book', totalChapters, 'Total Chapters', '#00C2A8')}
      ${dashCard('fa-user-graduate', students.length, 'Students Added', '#FF6B6B')}
    </div>
    <div class="a-grid-2">
      <div class="a-card"><h4><i class="fa-solid fa-images"></i> Hero Slides</h4><p style="color:var(--a-gray); font-size:.85rem;">${hero.length} slide(s) active. Edit from "Hero Slider" menu.</p></div>
      <div class="a-card"><h4><i class="fa-solid fa-bullhorn"></i> Notices</h4><p style="color:var(--a-gray); font-size:.85rem;">${notices.length} notice(s) running in marquee. Edit from "Notices" menu.</p></div>
    </div>
    <div class="a-card">
      <h4><i class="fa-solid fa-circle-info"></i> Mode</h4>
      <p style="font-size:.85rem; color:var(--a-gray);">
        ${AdminDB.isSupabase()
          ? '<span class="a-tag a-tag-green">SUPABASE LIVE</span> Aapka data Supabase database mein save ho raha hai — public site par turant reflect hoga.'
          : '<span class="a-tag a-tag-red">LOCAL MODE</span> Supabase connect nahi hai. Changes sirf iss browser ke localStorage mein save honge, live site par nahi dikhenge jab tak Supabase connect na ho.'}
      </p>
      ${AdminDB.isSupabase() && batches.length === 0 ? `
        <div style="margin-top:14px;">
          <p style="font-size:.82rem; color:var(--a-gray); margin-bottom:10px;">Supabase database khali hai. Default demo data (hero slides, notices, batches/chapters/PDFs) ek click mein daalne ke liye:</p>
          <button class="a-btn a-btn-primary a-btn-sm" id="aSeedBtn"><i class="fa-solid fa-database"></i> Default Data Seed Karein</button>
        </div>` : ''}
    </div>
  `;
  const seedBtn = document.getElementById('aSeedBtn');
  if (seedBtn) seedBtn.onclick = async () => {
    seedBtn.disabled = true; seedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding...';
    const res = await AdminDB.seedFromDefaults();
    if (res.ok) { toast('Default data seed ho gaya!', 'ok'); renderDashboard(); }
    else { toast(res.error || 'Seed fail hua', 'err'); seedBtn.disabled = false; seedBtn.innerHTML = '<i class="fa-solid fa-database"></i> Default Data Seed Karein'; }
  };
}
function dashCard(icon, num, label, color) {
  return `<div class="a-card" style="text-align:center;">
    <div style="width:52px; height:52px; border-radius:14px; background:${color}22; color:${color}; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 10px;"><i class="fa-solid ${icon}"></i></div>
    <div style="font-size:1.6rem; font-weight:800;">${num}</div>
    <div style="font-size:.82rem; color:var(--a-gray);">${label}</div>
  </div>`;
}

/* ---------------- HERO SLIDES ---------------- */
async function renderHeroPanel() {
  const el = document.getElementById('panel-hero');
  const slides = await AdminDB.listHeroSlides();
  el.innerHTML = `
    <div class="a-panel-head">
      <div><h3>Hero Slider</h3><p>Homepage ke top par ghumne wale slides manage karein.</p></div>
      <button class="a-btn a-btn-primary" id="aAddHero"><i class="fa-solid fa-plus"></i> Naya Slide</button>
    </div>
    <div id="aHeroList">${slides.length ? slides.map(heroRow).join('') : emptyState('fa-images', 'Koi slide nahi hai.')}</div>
  `;
  document.getElementById('aAddHero').onclick = () => openHeroForm(null);
  slides.forEach(s => {
    document.getElementById('aHeroEdit' + s.id)?.addEventListener('click', () => openHeroForm(s));
    document.getElementById('aHeroDel' + s.id)?.addEventListener('click', () => {
      confirmDelete('Ye slide delete ho jayega.', async () => {
        await AdminDB.deleteHeroSlide(s.id);
        toast('Slide delete ho gaya', 'ok');
        renderHeroPanel();
      });
    });
  });
}
function heroRow(s) {
  return `<div class="a-list-row">
    <img class="a-list-thumb" src="${s.image_url || 'assets/img/teacher.webp'}" onerror="this.src='../assets/img/teacher.webp'">
    <div class="a-list-main"><b>${s.line1 || ''} ${s.highlight || ''}</b><span>${s.description || ''}</span></div>
    <div class="a-list-actions">
      <button class="a-btn a-btn-sm a-btn-outline" id="aHeroEdit${s.id}"><i class="fa-solid fa-pen"></i></button>
      <button class="a-btn a-btn-sm a-btn-danger" id="aHeroDel${s.id}"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}
function openHeroForm(slide) {
  const s = slide || {};
  openModal(`
    <h3>${slide ? 'Slide Edit Karein' : 'Naya Slide'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aHeroForm">
      <div class="a-grid-2">
        <div class="a-field"><label>Eyebrow Text</label><input name="eyebrow" value="${esc(s.eyebrow)}"></div>
        <div class="a-field"><label>Image URL</label><input name="image_url" value="${esc(s.image_url)}"></div>
        <div class="a-field"><label>Line 1</label><input name="line1" value="${esc(s.line1)}"></div>
        <div class="a-field"><label>Line 2</label><input name="line2" value="${esc(s.line2)}"></div>
        <div class="a-field"><label>Highlight Word</label><input name="highlight" value="${esc(s.highlight)}"></div>
      </div>
      <div class="a-field"><label>Description</label><textarea name="description" rows="2">${esc(s.description)}</textarea></div>
      <div class="a-grid-2">
        <div class="a-field"><label>Button 1 Text</label><input name="btn1_text" value="${esc(s.btn1_text)}"></div>
        <div class="a-field"><label>Button 1 Link</label><input name="btn1_link" value="${esc(s.btn1_link)}"></div>
        <div class="a-field"><label>Button 2 Text</label><input name="btn2_text" value="${esc(s.btn2_text)}"></div>
        <div class="a-field"><label>Button 2 Link</label><input name="btn2_link" value="${esc(s.btn2_link)}"></div>
      </div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aHeroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (slide && slide.id) data.id = slide.id;
    await AdminDB.saveHeroSlide(data);
    closeModal();
    toast('Slide save ho gaya', 'ok');
    renderHeroPanel();
  });
}

/* ---------------- NOTICES ---------------- */
async function renderNoticesPanel() {
  const el = document.getElementById('panel-notices');
  const notices = await AdminDB.listNotices();
  el.innerHTML = `
    <div class="a-panel-head">
      <div><h3>Notice Marquee</h3><p>Top marquee mein chalne wale notices manage karein.</p></div>
      <button class="a-btn a-btn-primary" id="aAddNotice"><i class="fa-solid fa-plus"></i> Nayi Notice</button>
    </div>
    <div>${notices.length ? notices.map(noticeRow).join('') : emptyState('fa-bullhorn', 'Koi notice nahi hai.')}</div>
  `;
  document.getElementById('aAddNotice').onclick = () => openNoticeForm(null);
  notices.forEach(n => {
    document.getElementById('aNEdit' + n.id)?.addEventListener('click', () => openNoticeForm(n));
    document.getElementById('aNDel' + n.id)?.addEventListener('click', () => {
      confirmDelete('Ye notice delete ho jayega.', async () => {
        await AdminDB.deleteNotice(n.id);
        toast('Notice delete ho gaya', 'ok');
        renderNoticesPanel();
      });
    });
  });
}
function noticeRow(n) {
  return `<div class="a-list-row">
    <div class="a-list-main"><b>${esc(n.text)}</b></div>
    <div class="a-list-actions">
      <button class="a-btn a-btn-sm a-btn-outline" id="aNEdit${n.id}"><i class="fa-solid fa-pen"></i></button>
      <button class="a-btn a-btn-sm a-btn-danger" id="aNDel${n.id}"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}
function openNoticeForm(notice) {
  const n = notice || {};
  openModal(`
    <h3>${notice ? 'Notice Edit Karein' : 'Nayi Notice'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aNoticeForm">
      <div class="a-field"><label>Notice Text</label><textarea name="text" rows="2">${esc(n.text)}</textarea></div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aNoticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (notice && notice.id) data.id = notice.id;
    await AdminDB.saveNotice(data);
    closeModal();
    toast('Notice save ho gayi', 'ok');
    renderNoticesPanel();
  });
}

/* ---------------- ABOUT / MENTOR ---------------- */
async function renderAboutPanel() {
  const el = document.getElementById('panel-about');
  const s = await AdminDB.getSettings();
  el.innerHTML = `
    <div class="a-panel-head"><div><h3>About / Mentor Section</h3><p>Teacher ki photo aur intro text edit karein.</p></div></div>
    <div class="a-card">
      <form id="aAboutForm">
        <div class="a-grid-2">
          <div class="a-field"><label>Teacher Name</label><input name="about_teacher_name" value="${esc(s.about_teacher_name)}"></div>
          <div class="a-field"><label>Role / Designation</label><input name="about_role" value="${esc(s.about_role)}"></div>
        </div>
        <div class="a-field"><label>Photo URL</label><input name="about_image_url" value="${esc(s.about_image_url)}"></div>
        <div class="a-field"><label>About Text (HTML allowed)</label><textarea name="about_text" rows="5">${esc(s.about_text)}</textarea></div>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
      </form>
    </div>
  `;
  document.getElementById('aAboutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await AdminDB.saveSettings(formToObj(e.target));
    toast('About section update ho gaya', 'ok');
  });
}

/* ---------------- SITE SETTINGS (footer/contact) ---------------- */
async function renderSettingsPanel() {
  const el = document.getElementById('panel-settings');
  const s = await AdminDB.getSettings();
  el.innerHTML = `
    <div class="a-panel-head"><div><h3>Site Settings</h3><p>Logo, footer, contact aur social links manage karein.</p></div></div>
    <div class="a-card">
      <form id="aSettingsForm">
        <div class="a-grid-2">
          <div class="a-field"><label>Site Logo URL</label><input name="logo_url" value="${esc(s.logo_url)}"></div>
          <div class="a-field"><label>Site Title</label><input name="site_title" value="${esc(s.site_title)}"></div>
          <div class="a-field"><label>Helpline Number</label><input name="helpline_number" value="${esc(s.helpline_number)}"></div>
          <div class="a-field"><label>WhatsApp Link</label><input name="whatsapp_link" value="${esc(s.whatsapp_link)}"></div>
          <div class="a-field"><label>Email</label><input name="email" value="${esc(s.email)}"></div>
          <div class="a-field"><label>Class Timing</label><input name="class_timing" value="${esc(s.class_timing)}"></div>
        </div>
        <div class="a-field"><label>Address</label><textarea name="address" rows="2">${esc(s.address)}</textarea></div>
        <div class="a-field"><label>Google Maps Embed URL</label><input name="map_embed_url" value="${esc(s.map_embed_url)}"></div>
        <div class="a-grid-3">
          <div class="a-field"><label>YouTube Link</label><input name="social_youtube" value="${esc(s.social_youtube)}"></div>
          <div class="a-field"><label>Facebook Link</label><input name="social_facebook" value="${esc(s.social_facebook)}"></div>
          <div class="a-field"><label>Instagram Link</label><input name="social_instagram" value="${esc(s.social_instagram)}"></div>
        </div>
        <div class="a-grid-2">
          <div class="a-field"><label>Batches Heading</label><input name="batches_heading" value="${esc(s.batches_heading)}"></div>
          <div class="a-field"><label>Batches Subheading</label><input name="batches_subheading" value="${esc(s.batches_subheading)}"></div>
        </div>
        <div class="a-field"><label>Result Validity (Days)</label><input type="number" min="1" name="result_validity_days" value="${esc(s.result_validity_days || 3)}"></div>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
      </form>
    </div>
  `;
  document.getElementById('aSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    data.result_validity_days = Number(data.result_validity_days) || 3;
    await AdminDB.saveSettings(data);
    toast('Site settings update ho gayi', 'ok');
  });
}

/* ---------------- TERMS & POLICY ---------------- */
async function renderTermsPanel() {
  const el = document.getElementById('panel-terms');
  const s = await AdminDB.getSettings();
  el.innerHTML = `
    <div class="a-panel-head"><div><h3>Terms & Privacy Policy</h3><p>terms.html aur policy.html par dikhne wala content edit karein.</p></div></div>
    <div class="a-card">
      <form id="aTermsForm">
        <div class="a-field"><label>Terms & Conditions Content</label><textarea name="terms_content" rows="8">${esc(s.terms_content)}</textarea></div>
        <div class="a-field"><label>Privacy Policy Content</label><textarea name="policy_content" rows="8">${esc(s.policy_content)}</textarea></div>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
      </form>
    </div>
  `;
  document.getElementById('aTermsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await AdminDB.saveSettings(formToObj(e.target));
    toast('Terms/Policy update ho gaya', 'ok');
  });
}

/* ---------------- CHANGE LOGIN ---------------- */
async function renderLoginSettingsPanel() {
  const el = document.getElementById('panel-login-settings');
  const username = await AdminDB.getUsername();
  el.innerHTML = `
    <div class="a-panel-head"><div><h3>Change Login</h3><p>Admin username / password change karein.</p></div></div>
    <div class="a-card" style="max-width:460px;">
      <form id="aCredForm">
        <div class="a-field"><label>Username</label><input name="username" value="${esc(username)}"></div>
        <div class="a-field"><label>New Password (khali chodein agar change nahi karna)</label><input type="password" name="password" placeholder="••••••••"></div>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Update Login</button>
      </form>
    </div>
  `;
  document.getElementById('aCredForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    const res = await AdminDB.changeCredentials(data.username, data.password);
    if (res.ok) {
      toast('Login details update ho gaye', 'ok');
      document.getElementById('aUserName').textContent = data.username;
    } else {
      toast(res.error || 'Update fail hua', 'err');
    }
  });
}

/* ---------------- BATCHES ---------------- */
async function renderBatchesPanel() {
  const el = document.getElementById('panel-batches');
  CURRENT_BATCHES = await AdminDB.listBatches();
  el.innerHTML = `
    <div class="a-panel-head">
      <div><h3>Batches Management</h3><p>Har batch ke subjects, chapters, video & PDF resources manage karein.</p></div>
      <button class="a-btn a-btn-primary" id="aAddBatch"><i class="fa-solid fa-plus"></i> Naya Batch</button>
    </div>
    <div id="aBatchList">${CURRENT_BATCHES.length ? CURRENT_BATCHES.map(batchBlock).join('') : emptyState('fa-layer-group', 'Koi batch nahi hai.')}</div>
  `;
  document.getElementById('aAddBatch').onclick = () => openBatchForm(null);
  wireBatchEvents();
}
function batchBlock(b) {
  return `<div class="a-batch-block" id="aBatchBlock-${b.id}">
    <div class="a-batch-block-head" data-toggle="${b.id}">
      <div class="a-flex">
        <div style="width:40px;height:40px;border-radius:10px;background:${b.color || '#4C3CE3'}22; color:${b.color || '#4C3CE3'}; display:flex; align-items:center; justify-content:center;"><i class="fa-solid ${b.icon || 'fa-layer-group'}"></i></div>
        <div><h4>${esc(b.title)}</h4><span style="font-size:.78rem; color:var(--a-gray);">${esc(b.subtitle || '')} ${b.price ? '• ₹' + esc(b.price) : ''}</span></div>
      </div>
      <div class="a-list-actions">
        <button class="a-btn a-btn-sm a-btn-outline" data-edit-batch="${b.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="a-btn a-btn-sm a-btn-danger" data-del-batch="${b.id}"><i class="fa-solid fa-trash"></i></button>
        <i class="fa-solid fa-chevron-down" style="padding:8px;"></i>
      </div>
    </div>
    <div class="a-batch-block-body" id="aBatchBody-${b.id}">
      <button class="a-btn a-btn-sm a-btn-outline a-mb" data-add-subject="${b.id}"><i class="fa-solid fa-plus"></i> Subject Add Karein</button>
      ${(b.subjects || []).map(sub => subjectBlock(b, sub)).join('') || '<p style="color:var(--a-gray); font-size:.82rem;">Koi subject nahi hai.</p>'}
    </div>
  </div>`;
}
function subjectBlock(b, sub) {
  return `<div class="a-subject-block" id="aSubject-${sub.id}">
    <div class="a-flex-between">
      <div class="a-flex"><i class="fa-solid ${sub.icon || 'fa-book'}"></i><b>${esc(sub.name)}</b></div>
      <div class="a-list-actions">
        <button class="a-btn a-btn-sm a-btn-outline" data-edit-subject="${b.id}|${sub.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="a-btn a-btn-sm a-btn-danger" data-del-subject="${b.id}|${sub.id}"><i class="fa-solid fa-trash"></i></button>
        <button class="a-btn a-btn-sm a-btn-primary" data-add-chapter="${b.id}|${sub.id}"><i class="fa-solid fa-plus"></i> Chapter</button>
      </div>
    </div>
    ${(sub.chapters || []).map(ch => chapterRow(b, sub, ch)).join('')}
  </div>`;
}
function chapterRow(b, sub, ch) {
  return `<div class="a-chapter-row" id="aChapter-${ch.id}">
    <div class="a-flex-between">
      <div><b style="font-size:.88rem;">${esc(ch.title)}</b><div style="font-size:.76rem; color:var(--a-gray);">YouTube: ${esc(ch.youtube_id)} • ${esc(ch.duration || '')}</div></div>
      <div class="a-list-actions">
        <button class="a-btn a-btn-sm a-btn-outline" data-edit-chapter="${b.id}|${sub.id}|${ch.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="a-btn a-btn-sm a-btn-danger" data-del-chapter="${b.id}|${sub.id}|${ch.id}"><i class="fa-solid fa-trash"></i></button>
        <button class="a-btn a-btn-sm a-btn-primary" data-add-resource="${b.id}|${sub.id}|${ch.id}"><i class="fa-solid fa-file-arrow-up"></i> PDF</button>
      </div>
    </div>
    <div style="margin-top:8px;">
      ${(ch.chapter_resources || []).map(r => `<span class="a-resource-chip"><i class="fa-solid fa-file-pdf"></i> ${esc(r.resource_type)} <button data-del-resource="${b.id}|${sub.id}|${ch.id}|${r.id}"><i class="fa-solid fa-xmark"></i></button></span>`).join('') || '<span style="font-size:.76rem; color:var(--a-gray);">Koi PDF nahi hai.</span>'}
    </div>
  </div>`;
}

function wireBatchEvents() {
  document.querySelectorAll('[data-toggle]').forEach(h => h.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const id = h.getAttribute('data-toggle');
    document.getElementById('aBatchBody-' + id).classList.toggle('open');
  }));
  document.querySelectorAll('[data-edit-batch]').forEach(b => b.addEventListener('click', () => {
    const batch = CURRENT_BATCHES.find(x => x.id === b.getAttribute('data-edit-batch'));
    openBatchForm(batch);
  }));
  document.querySelectorAll('[data-del-batch]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-del-batch');
    confirmDelete('Ye pura batch (subjects+chapters+PDFs sahit) delete ho jayega.', async () => {
      await AdminDB.deleteBatch(id); toast('Batch delete ho gaya', 'ok'); renderBatchesPanel();
    });
  }));
  document.querySelectorAll('[data-add-subject]').forEach(b => b.addEventListener('click', () => openSubjectForm(b.getAttribute('data-add-subject'), null)));
  document.querySelectorAll('[data-edit-subject]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId] = b.getAttribute('data-edit-subject').split('|');
    const batch = CURRENT_BATCHES.find(x => x.id === batchId);
    const sub = batch.subjects.find(s => s.id === subId);
    openSubjectForm(batchId, sub);
  }));
  document.querySelectorAll('[data-del-subject]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId] = b.getAttribute('data-del-subject').split('|');
    confirmDelete('Ye subject (chapters sahit) delete ho jayega.', async () => {
      await AdminDB.deleteSubject(batchId, subId); toast('Subject delete ho gaya', 'ok'); renderBatchesPanel();
    });
  }));
  document.querySelectorAll('[data-add-chapter]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId] = b.getAttribute('data-add-chapter').split('|');
    openChapterForm(batchId, subId, null);
  }));
  document.querySelectorAll('[data-edit-chapter]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId, chId] = b.getAttribute('data-edit-chapter').split('|');
    const batch = CURRENT_BATCHES.find(x => x.id === batchId);
    const sub = batch.subjects.find(s => s.id === subId);
    const ch = sub.chapters.find(c => c.id === chId);
    openChapterForm(batchId, subId, ch);
  }));
  document.querySelectorAll('[data-del-chapter]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId, chId] = b.getAttribute('data-del-chapter').split('|');
    confirmDelete('Ye chapter (video+PDFs sahit) delete ho jayega.', async () => {
      await AdminDB.deleteChapter(batchId, subId, chId); toast('Chapter delete ho gaya', 'ok'); renderBatchesPanel();
    });
  }));
  document.querySelectorAll('[data-add-resource]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId, chId] = b.getAttribute('data-add-resource').split('|');
    openResourceForm(batchId, subId, chId, null);
  }));
  document.querySelectorAll('[data-del-resource]').forEach(b => b.addEventListener('click', () => {
    const [batchId, subId, chId, resId] = b.getAttribute('data-del-resource').split('|');
    confirmDelete('Ye PDF resource delete ho jayega.', async () => {
      await AdminDB.deleteResource(batchId, subId, chId, resId); toast('Resource delete ho gaya', 'ok'); renderBatchesPanel();
    });
  }));
}

function openBatchForm(batch) {
  const b = batch || {};
  openModal(`
    <h3>${batch ? 'Batch Edit Karein' : 'Naya Batch'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aBatchForm">
      <div class="a-grid-2">
        <div class="a-field"><label>Batch ID (unique, jaise class9)</label><input name="id" value="${esc(b.id)}" ${batch ? 'readonly' : ''} required></div>
        <div class="a-field"><label>Class Name</label><input name="class_name" value="${esc(b.class_name || b.class)}" required></div>
        <div class="a-field"><label>Title</label><input name="title" value="${esc(b.title)}" required></div>
        <div class="a-field"><label>Subtitle</label><input name="subtitle" value="${esc(b.subtitle)}"></div>
        <div class="a-field"><label>Color (hex)</label><input name="color" value="${esc(b.color || '#4C3CE3')}"></div>
        <div class="a-field"><label>FontAwesome Icon (e.g. fa-seedling)</label><input name="icon" value="${esc(b.icon)}"></div>
        <div class="a-field"><label>Image URL</label><input name="image_url" value="${esc(b.image_url)}"></div>
        <div class="a-field"><label>Offer Text</label><input name="offer_text" value="${esc(b.offer_text)}"></div>
        <div class="a-field"><label>Price (₹)</label><input name="price" value="${esc(b.price)}"></div>
        <div class="a-field"><label>Payment Link (Cashfree)</label><input name="payment_link" value="${esc(b.payment_link)}"></div>
      </div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aBatchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    await AdminDB.saveBatch(data);
    closeModal(); toast('Batch save ho gaya', 'ok'); renderBatchesPanel();
  });
}
function openSubjectForm(batchId, subject) {
  const s = subject || {};
  openModal(`
    <h3>${subject ? 'Subject Edit Karein' : 'Naya Subject'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aSubjectForm">
      <div class="a-field"><label>Subject Name</label><input name="name" value="${esc(s.name)}" required></div>
      <div class="a-field"><label>FontAwesome Icon (e.g. fa-atom)</label><input name="icon" value="${esc(s.icon)}"></div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aSubjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (subject && subject.id) data.id = subject.id;
    await AdminDB.saveSubject(batchId, data);
    closeModal(); toast('Subject save ho gaya', 'ok'); renderBatchesPanel();
  });
}
function openChapterForm(batchId, subjectId, chapter) {
  const c = chapter || {};
  openModal(`
    <h3>${chapter ? 'Chapter Edit Karein' : 'Naya Chapter'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aChapterForm">
      <div class="a-field"><label>Chapter Title</label><input name="title" value="${esc(c.title)}" required></div>
      <div class="a-grid-2">
        <div class="a-field"><label>YouTube Video ID</label><input name="youtube_id" value="${esc(c.youtube_id)}"></div>
        <div class="a-field"><label>Duration (e.g. 1:20:00)</label><input name="duration" value="${esc(c.duration)}"></div>
      </div>
      <div class="a-field"><label>Description</label><textarea name="description" rows="2">${esc(c.description)}</textarea></div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aChapterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (chapter && chapter.id) data.id = chapter.id;
    await AdminDB.saveChapter(subjectId, data, batchId);
    closeModal(); toast('Chapter save ho gaya', 'ok'); renderBatchesPanel();
  });
}
function openResourceForm(batchId, subjectId, chapterId, resource) {
  const r = resource || {};
  openModal(`
    <h3>${resource ? 'PDF Edit Karein' : 'Naya PDF Resource'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aResourceForm">
      <div class="a-field"><label>Resource Type (jaise "Text Notes (PDF)")</label><input name="resource_type" value="${esc(r.resource_type)}" required></div>
      <div class="a-field"><label>PDF URL</label><input name="url" value="${esc(r.url)}" required></div>
      <div class="a-field"><label>Description</label><input name="description" value="${esc(r.description)}"></div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aResourceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (resource && resource.id) data.id = resource.id;
    await AdminDB.saveResource(chapterId, data, batchId, subjectId);
    closeModal(); toast('PDF save ho gaya', 'ok'); renderBatchesPanel();
  });
}

/* ---------------- STUDENTS ---------------- */
async function renderStudentsPanel() {
  const el = document.getElementById('panel-students');
  el.innerHTML = `
    <div class="a-panel-head">
      <div><h3>Student Data</h3><p>Students ki details manage karein (name, mobile, class, address).</p></div>
      <button class="a-btn a-btn-primary" id="aAddStudent"><i class="fa-solid fa-plus"></i> Naya Student</button>
    </div>
    <div class="a-card">
      <div class="a-field" style="max-width:220px;"><label>Class se Filter Karein</label>
        <select id="aStudentClassFilter">
          <option value="">Sabhi Classes</option>
          <option value="9">Class 9</option><option value="10">Class 10</option>
          <option value="11">Class 11</option><option value="12">Class 12</option>
        </select>
      </div>
      <div id="aStudentTableWrap"></div>
    </div>
  `;
  document.getElementById('aAddStudent').onclick = () => openStudentForm(null);
  document.getElementById('aStudentClassFilter').addEventListener('change', (e) => loadStudentTable(e.target.value));
  await loadStudentTable('');
}
async function loadStudentTable(classFilter) {
  CURRENT_STUDENTS = await AdminDB.listStudents(classFilter || undefined);
  const wrap = document.getElementById('aStudentTableWrap');
  if (!CURRENT_STUDENTS.length) { wrap.innerHTML = emptyState('fa-user-graduate', 'Koi student nahi mila.'); return; }
  wrap.innerHTML = `<table class="a-table">
    <thead><tr><th>Name</th><th>Class</th><th>Mobile</th><th>Address</th><th></th></tr></thead>
    <tbody>
      ${CURRENT_STUDENTS.map(s => `<tr>
        <td>${esc(s.name)}</td><td>${esc(s.class)}</td><td>${esc(s.mobile)}</td><td>${esc(s.address || '-')}</td>
        <td class="a-list-actions">
          <button class="a-btn a-btn-sm a-btn-outline" data-edit-student="${s.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="a-btn a-btn-sm a-btn-danger" data-del-student="${s.id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
  document.querySelectorAll('[data-edit-student]').forEach(b => b.addEventListener('click', () => {
    const student = CURRENT_STUDENTS.find(s => String(s.id) === b.getAttribute('data-edit-student'));
    openStudentForm(student);
  }));
  document.querySelectorAll('[data-del-student]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-del-student');
    confirmDelete('Student delete hone par uske results bhi delete ho jayenge.', async () => {
      await AdminDB.deleteStudent(isNaN(id) ? id : Number(id));
      toast('Student delete ho gaya', 'ok');
      loadStudentTable(document.getElementById('aStudentClassFilter').value);
    });
  }));
}
function openStudentForm(student) {
  const s = student || {};
  openModal(`
    <h3>${student ? 'Student Edit Karein' : 'Naya Student'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aStudentForm">
      <div class="a-grid-2">
        <div class="a-field"><label>Naam</label><input name="name" value="${esc(s.name)}" required></div>
        <div class="a-field"><label>Class</label>
          <select name="class" required>
            <option value="9" ${s.class === '9' ? 'selected' : ''}>Class 9</option>
            <option value="10" ${s.class === '10' ? 'selected' : ''}>Class 10</option>
            <option value="11" ${s.class === '11' ? 'selected' : ''}>Class 11</option>
            <option value="12" ${s.class === '12' ? 'selected' : ''}>Class 12</option>
          </select>
        </div>
        <div class="a-field"><label>Mobile Number</label><input name="mobile" value="${esc(s.mobile)}" required></div>
        <div class="a-field"><label>Address</label><input name="address" value="${esc(s.address)}"></div>
      </div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save</button>
      </div>
    </form>
  `);
  document.getElementById('aStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    if (student && student.id) data.id = student.id;
    await AdminDB.saveStudent(data);
    closeModal(); toast('Student save ho gaya', 'ok');
    loadStudentTable(document.getElementById('aStudentClassFilter').value);
  });
}

/* ---------------- RESULTS ---------------- */
async function renderResultsPanel() {
  const el = document.getElementById('panel-results');
  el.innerHTML = `
    <div class="a-panel-head"><div><h3>Student Results</h3><p>Class chunein, phir student select karke marks entry karein.</p></div></div>
    <div class="a-card">
      <div class="a-field" style="max-width:220px;"><label>Class Chunein</label>
        <select id="aResultClassFilter">
          <option value="">-- Class Select Karein --</option>
          <option value="9">Class 9</option><option value="10">Class 10</option>
          <option value="11">Class 11</option><option value="12">Class 12</option>
        </select>
      </div>
      <div id="aResultStudentList"></div>
    </div>
  `;
  document.getElementById('aResultClassFilter').addEventListener('change', async (e) => {
    const cls = e.target.value;
    const listEl = document.getElementById('aResultStudentList');
    if (!cls) { listEl.innerHTML = ''; return; }
    const students = await AdminDB.listStudents(cls);
    if (!students.length) { listEl.innerHTML = emptyState('fa-user-graduate', 'Iss class mein koi student nahi hai. Pehle "Student Data" se add karein.'); return; }
    listEl.innerHTML = students.map(s => `<div class="a-list-row">
      <div class="a-list-main"><b>${esc(s.name)}</b><span>Mobile: ${esc(s.mobile)}</span></div>
      <div class="a-list-actions"><button class="a-btn a-btn-sm a-btn-primary" data-view-results="${s.id}"><i class="fa-solid fa-chart-simple"></i> Results</button></div>
    </div>`).join('');
    listEl.querySelectorAll('[data-view-results]').forEach(b => b.addEventListener('click', () => {
      const student = students.find(x => String(x.id) === b.getAttribute('data-view-results'));
      openStudentResultsModal(student);
    }));
  });
}
async function openStudentResultsModal(student) {
  CURRENT_STUDENT_FOR_RESULTS = student;
  const results = await AdminDB.listResultsForStudent(student.id);
  openModal(`
    <h3>${esc(student.name)} — Results <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <button class="a-btn a-btn-primary a-btn-sm a-mb" id="aAddResult"><i class="fa-solid fa-plus"></i> Naya Test Result</button>
    <div id="aResultsListInner">
      ${results.length ? results.map(resultRow).join('') : '<p style="color:var(--a-gray); font-size:.85rem;">Koi result nahi hai.</p>'}
    </div>
  `);
  document.getElementById('aAddResult').onclick = () => openResultForm(student, null);
  results.forEach(r => {
    document.getElementById('aResEdit' + r.id)?.addEventListener('click', () => openResultForm(student, r));
    document.getElementById('aResDel' + r.id)?.addEventListener('click', () => {
      confirmDelete('Ye result delete ho jayega.', async () => {
        await AdminDB.deleteResult(r.id);
        toast('Result delete ho gaya', 'ok');
        openStudentResultsModal(student);
      });
    });
  });
}
function resultRow(r) {
  return `<div class="a-list-row" id="aResultRow-${r.id}">
    <div class="a-list-main"><b>${esc(r.test_name || 'Weekly Test')} — ${r.test_date ? esc(r.test_date) : ''}</b>
      <span>Phy:${r.physics ?? '-'} Chem:${r.chemistry ?? '-'} Maths:${r.maths ?? '-'} • Total: ${r.total ?? '-'}/${r.out_of ?? 75} (${r.percentage ?? '-'}%) • Grade: ${r.grade ?? '-'}</span>
    </div>
    <div class="a-list-actions">
      <button class="a-btn a-btn-sm a-btn-outline" id="aResEdit${r.id}"><i class="fa-solid fa-pen"></i></button>
      <button class="a-btn a-btn-sm a-btn-danger" id="aResDel${r.id}"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}
function openResultForm(student, result) {
  const r = result || {};
  openModal(`
    <h3>${result ? 'Result Edit Karein' : 'Naya Test Result'} <i class="fa-solid fa-xmark close" onclick="closeModal()"></i></h3>
    <form id="aResultForm">
      <div class="a-grid-2">
        <div class="a-field"><label>Test Name</label><input name="test_name" value="${esc(r.test_name || 'Weekly Test')}" required></div>
        <div class="a-field"><label>Test Date</label><input type="date" name="test_date" value="${esc(r.test_date) || new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="a-grid-3">
        <div class="a-field"><label>Physics Marks (max 25)</label><input type="number" name="physics" value="${esc(r.physics)}" required></div>
        <div class="a-field"><label>Chemistry Marks (max 25)</label><input type="number" name="chemistry" value="${esc(r.chemistry)}" required></div>
        <div class="a-field"><label>Maths Marks (max 25)</label><input type="number" name="maths" value="${esc(r.maths)}" required></div>
      </div>
      <div class="a-field"><label>Out Of (Total of all 3 subjects, default 75)</label><input type="number" name="out_of" value="${esc(r.out_of || 75)}"></div>
      <div class="a-modal-actions">
        <button type="button" class="a-btn a-btn-outline" onclick="closeModal()">Cancel</button>
        <button class="a-btn a-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Publish Result</button>
      </div>
    </form>
  `);
  document.getElementById('aResultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formToObj(e.target);
    data.student_id = student.id;
    if (result && result.id) data.id = result.id;
    await AdminDB.saveResult(data);
    toast('Result publish ho gaya', 'ok');
    openStudentResultsModal(student);
  });
}

/* ---------------- UTILS ---------------- */
function esc(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/"/g, '&quot;');
}
function formToObj(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v, k) => { obj[k] = v; });
  return obj;
}
function emptyState(icon, msg) {
  return `<div class="a-empty"><i class="fa-solid ${icon}"></i>${msg}</div>`;
}
