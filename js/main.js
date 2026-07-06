/* =========================================================
   CWA SCIENCE CLASSES - Main JS
   Handles: preloader, nav, hero slider, marquee, batches render,
   video modal, result lookup, animations, counters.

   DATA SOURCE STRATEGY
   ---------------------
   If Supabase is configured (js/supabase-config.js has a URL +
   anon key), all editable content (hero slides, notices, about,
   batches, footer/site settings) is fetched live from Supabase.
   Otherwise it falls back to the local defaults in js/site-data.js
   and js/batches-data.js so the site keeps working out of the box.
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- PRELOADER ---------- */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('hide'), 400);
  });
  setTimeout(() => preloader && preloader.classList.add('hide'), 2500);

  /* ---------- AOS INIT ---------- */
  if (window.AOS) {
    AOS.init({ duration: 800, once: true, offset: 60, easing: 'ease-out-cubic' });
  }

  /* ---------- MOBILE DRAWER ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');

  function openDrawer() {
    hamburger.classList.add('open');
    mobileDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    hamburger.classList.remove('open');
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  hamburger.addEventListener('click', () => {
    mobileDrawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  drawerOverlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('.mdrawer-link, .mdrawer-cta').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  /* ---------- NAV ACTIVE LINK ON SCROLL ---------- */
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      if (window.scrollY >= top) current = sec.getAttribute('id');
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });

    // header shadow
    const header = document.getElementById('siteHeader');
    if (window.scrollY > 10) header.style.boxShadow = '0 4px 24px rgba(20,20,43,0.12)';
    else header.style.boxShadow = '0 2px 18px rgba(20,20,43,0.06)';
  });

  /* =========================================================
     LOAD DYNAMIC CONTENT (Supabase if configured, else fallback)
  ========================================================= */
  let siteSettings = Object.assign({}, (typeof SITE_SETTINGS_DEFAULT !== 'undefined') ? SITE_SETTINGS_DEFAULT : {});
  let heroSlides = (typeof HERO_SLIDES_DEFAULT !== 'undefined') ? HERO_SLIDES_DEFAULT.slice() : [];
  let notices = (typeof NOTICES_DEFAULT !== 'undefined') ? NOTICES_DEFAULT.slice() : [];
  let batchesData = (typeof BATCHES_DATA !== 'undefined') ? BATCHES_DATA : { batches: [] };

  if (typeof IS_SUPABASE_CONFIGURED !== 'undefined' && IS_SUPABASE_CONFIGURED) {
    try {
      const { data: settingsRow } = await supabaseClient.from('site_settings').select('data').eq('id', 1).single();
      if (settingsRow && settingsRow.data) siteSettings = Object.assign({}, siteSettings, settingsRow.data);

      const { data: slidesRows } = await supabaseClient.from('hero_slides').select('*').eq('active', true).order('sort_order');
      if (slidesRows && slidesRows.length) {
        heroSlides = slidesRows.map(s => ({
          eyebrow: s.eyebrow, line1: s.line1, line2: s.line2, highlight: s.highlight,
          description: s.description, image_url: s.image_url,
          btn1_text: s.btn1_text, btn1_link: s.btn1_link, btn2_text: s.btn2_text, btn2_link: s.btn2_link
        }));
      }

      const { data: noticeRows } = await supabaseClient.from('notices').select('*').eq('active', true).order('sort_order');
      if (noticeRows && noticeRows.length) notices = noticeRows.map(n => n.text);

      const { data: batchRows } = await supabaseClient
        .from('batches')
        .select('*, subjects(*, chapters(*, chapter_resources(*)))')
        .eq('active', true)
        .order('sort_order');
      if (batchRows && batchRows.length) {
        batchesData = {
          batches: batchRows.map(b => ({
            id: b.id, class: b.class_name, title: b.title, subtitle: b.subtitle,
            color: b.color, icon: b.icon, image_url: b.image_url,
            offer_text: b.offer_text, price: b.price, payment_link: b.payment_link,
            subjects: (b.subjects || []).sort((a, c) => (a.sort_order||0) - (c.sort_order||0)).map(s => ({
              name: s.name, icon: s.icon,
              chapters: (s.chapters || []).sort((a, c) => (a.sort_order||0) - (c.sort_order||0)).map(ch => ({
                title: ch.title, youtube: ch.youtube_id, duration: ch.duration, description: ch.description,
                resources: (ch.chapter_resources || []).sort((a, c) => (a.sort_order||0) - (c.sort_order||0)).map(r => ({
                  type: r.resource_type, url: r.url, description: r.description
                }))
              }))
            }))
          }))
        };
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using local fallback data.', err);
    }
  }

  /* ---------- APPLY SITE SETTINGS TO DOM ---------- */
  function applySiteSettings() {
    const s = siteSettings;
    const setSrc = (id, val) => { const el = document.getElementById(id); if (el && val) el.src = val; };
    const setHtml = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerHTML = val; };
    const setText = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
    const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute('href', val); };

    setSrc('headerLogo', s.logo_url);
    setSrc('footerLogo', s.logo_url);
    setSrc('aboutImg', s.about_image_url);
    if (s.about_teacher_name) {
      const parts = s.about_teacher_name.trim().split(' ');
      const last = parts.pop();
      setHtml('aboutName', `${parts.join(' ')} <span class="text-gradient">${last}</span>`);
    }
    setText('aboutRole', s.about_role);
    setHtml('aboutText', s.about_text);

    setHtml('batchesHeading', s.batches_heading);
    setText('batchesSubheading', s.batches_subheading);

    setHref('contactHelpline', s.helpline_number ? 'tel:' + s.helpline_number.replace(/\s+/g,'') : null);
    setText('contactHelpline', s.helpline_number);
    setHref('contactWhatsapp', s.whatsapp_link);
    setText('contactAddress', s.address);
    setText('contactTiming', s.class_timing);

    setHref('footerPhone', s.helpline_number ? 'tel:' + s.helpline_number.replace(/\s+/g,'') : null);
    setText('footerPhone', s.helpline_number);
    setText('footerAddress', s.address);
    setText('footerEmail', s.email);
    const footerTiming = document.getElementById('footerTiming');
    if (footerTiming && s.class_timing) footerTiming.innerHTML = `<i class="fa-solid fa-clock"></i> ${s.class_timing}`;

    const mapFrame = document.getElementById('contactMapFrame');
    if (mapFrame && s.map_embed_url) mapFrame.src = s.map_embed_url;

    const waFloat = document.getElementById('floatingWhatsapp');
    if (waFloat && s.whatsapp_link) waFloat.setAttribute('href', s.whatsapp_link);

    // Socials (both contact section + footer + drawer)
    document.querySelectorAll('.social-btn.yt, .footer-socials a[aria-label="YouTube"], .mdrawer-social a[aria-label="YouTube"]')
      .forEach(a => { if (s.social_youtube) a.href = s.social_youtube; });
    document.querySelectorAll('.social-btn.fb, .footer-socials a[aria-label="Facebook"], .mdrawer-social a[aria-label="Facebook"]')
      .forEach(a => { if (s.social_facebook) a.href = s.social_facebook; });
    document.querySelectorAll('.social-btn.ig, .footer-socials a[aria-label="Instagram"], .mdrawer-social a[aria-label="Instagram"]')
      .forEach(a => { if (s.social_instagram) a.href = s.social_instagram; });
  }
  applySiteSettings();

  /* ---------- COUNTER ANIMATION (declared early; used by renderHero) ---------- */
  let counterObserver;
  function setupCounters() {
    if (counterObserver) counterObserver.disconnect();
    const counters = document.querySelectorAll('.num[data-count]');
    counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    let count = 0;
    const duration = 1400;
    const stepTime = Math.max(Math.floor(duration / target), 12);
    const timer = setInterval(() => {
      count++;
      el.textContent = count;
      if (count >= target) {
        el.textContent = target;
        clearInterval(timer);
      }
    }, stepTime);
  }

  /* =========================================================
     HERO SLIDER (built dynamically from heroSlides)
  ========================================================= */
  const heroSlider = document.getElementById('heroSlider');
  const dotsContainer = document.getElementById('heroDots');
  let currentSlide = 0;
  let sliderInterval;

  function renderHero() {
    let html = '';
    heroSlides.forEach((slide, i) => {
      html += `<div class="hero-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
        <div class="hero-content">
          <p class="hero-eyebrow">${slide.eyebrow || ''}</p>
          <h1 class="hero-title">
            <span class="line1">${slide.line1 || ''}</span>
            <span class="line2">${slide.line2 || ''} <span class="highlight">${slide.highlight || ''}</span></span>
          </h1>
          <p class="hero-desc">${slide.description || ''}</p>
          <div class="hero-btns">
            ${slide.btn1_text ? `<a href="${slide.btn1_link || '#'}" class="btn btn-primary"><i class="fa-solid fa-play"></i> ${slide.btn1_text}</a>` : ''}
            ${slide.btn2_text ? `<a href="${slide.btn2_link || '#'}" class="btn btn-outline"><i class="fa-solid fa-chart-line"></i> ${slide.btn2_text}</a>` : ''}
          </div>
          ${i === 0 ? `<div class="hero-stats">
            <div class="stat"><span class="num" data-count="4">0</span><small>Classes</small></div>
            <div class="stat"><span class="num" data-count="3">0</span><small>Subjects</small></div>
            <div class="stat"><span class="num" data-count="36">0</span><small>Video Lectures</small></div>
            <div class="stat"><span class="num" data-count="500">0</span>+<small>Students</small></div>
          </div>` : ''}
        </div>
        <div class="hero-visual">
          <img src="${slide.image_url || 'assets/img/teacher.webp'}" alt="${slide.line1 || 'CWA Science Classes'}" class="hero-float-img">
        </div>
      </div>`;
    });
    heroSlider.innerHTML = html;

    dotsContainer.innerHTML = '';
    heroSlides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    // (re)start counter observation for any new .num elements
    setupCounters();
  }

  function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dots .dot');
    if (!slides.length) return;
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }
  function nextSlide() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    goToSlide((currentSlide + 1) % slides.length);
  }
  function startSlider() {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, 5500);
  }

  renderHero();
  startSlider();

  const heroSection = document.getElementById('home');
  heroSection.addEventListener('mouseenter', () => clearInterval(sliderInterval));
  heroSection.addEventListener('mouseleave', startSlider);

  /* =========================================================
     NOTICE MARQUEE (built dynamically from notices)
  ========================================================= */
  const marqueeTrack = document.getElementById('marqueeTrack');
  if (marqueeTrack) {
    const itemsHtml = notices.map(n => `<span>${n} &nbsp;•&nbsp;</span>`).join('');
    // duplicate for seamless loop
    marqueeTrack.innerHTML = itemsHtml + itemsHtml;
  }

  /* ---------- FOOTER YEAR ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     FOOTER "CLASSES" LIST (extensible beyond Class 12)
  ========================================================= */
  const footerClasses = document.getElementById('footerClasses');
  if (footerClasses && batchesData.batches && batchesData.batches.length) {
    footerClasses.innerHTML = batchesData.batches
      .map(b => `<li><a href="#batches">${b.title}</a></li>`).join('');
  }

  /* =========================================================
     BATCHES RENDER (from batchesData)
  ========================================================= */
  const subjectIconMap = {
    Physics: { icon: 'fa-atom' },
    Chemistry: { icon: 'fa-flask' },
    Maths: { icon: 'fa-square-root-variable' }
  };
  const subjectColorMap = {
    Physics: 'linear-gradient(135deg,#6C63FF,#4C3CE3)',
    Chemistry: 'linear-gradient(135deg,#00E0B8,#00A98F)',
    Maths: 'linear-gradient(135deg,#FFB84D,#FF8A00)'
  };

  const batchTabsContainer = document.getElementById('batchTabs');
  const batchPanelsContainer = document.getElementById('batchPanels');

  function renderBatches() {
    if (!batchesData || !batchesData.batches) return;

    // Tabs
    batchTabsContainer.innerHTML = batchesData.batches.map((b, i) =>
      `<button class="batch-tab ${i === 0 ? 'active' : ''}" data-batch="${b.id}">Class ${b.class}</button>`
    ).join('');

    // Panels — every chapter (video + PDFs) lives INSIDE its batch/subject block.
    let html = '';
    batchesData.batches.forEach((batch, idx) => {
      html += `<div class="batch-panel ${idx === 0 ? 'active' : ''}" id="panel-${batch.id}">`;
      html += `
        <div class="batch-panel-head">
          <div class="batch-panel-icon" style="background:${batch.color || '#6C63FF'}"><i class="fa-solid fa-${batch.icon || 'layer-group'}"></i></div>
          <div>
            <h3>${batch.title}</h3>
            <p>${batch.subtitle || ''}</p>
            ${batch.offer_text ? `<p style="color:#FF6B6B;font-weight:700;margin-top:4px;">${batch.offer_text}</p>` : ''}
          </div>
          ${batch.price ? `<div style="margin-left:auto;text-align:right;">
              <div style="font-family:var(--font-head);font-weight:800;font-size:1.3rem;color:var(--primary);">₹${batch.price}</div>
              ${batch.payment_link ? `<a href="${batch.payment_link}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:6px;padding:8px 18px;font-size:.82rem;"><i class="fa-solid fa-credit-card"></i> Enroll / Pay Now</a>` : ''}
            </div>` : ''}
        </div>`;

      (batch.subjects || []).forEach(subject => {
        const iconInfo = subjectIconMap[subject.name] || { icon: 'fa-book' };
        const grad = subjectColorMap[subject.name] || 'linear-gradient(135deg,#999,#666)';
        html += `<div class="subject-block">
          <div class="subject-block-title">
            <i class="fa-solid ${iconInfo.icon}" style="background:${grad}"></i>
            <span>${subject.name}</span>
          </div>
          <div class="chapter-grid">`;

        (subject.chapters || []).forEach((ch, i) => {
          const resources = ch.resources && ch.resources.length ? ch.resources : [];
          html += `
            <div class="chapter-card" data-aos="fade-up" data-aos-delay="${(i % 3) * 80}">
              <div class="chapter-num">Chapter ${i + 1}</div>
              <div class="chapter-title">${ch.title}</div>
              ${ch.description ? `<div class="chapter-desc" style="font-size:.8rem;color:var(--gray);margin-bottom:10px;">${ch.description}</div>` : ''}
              <div class="chapter-meta"><i class="fa-regular fa-clock"></i> ${ch.duration || ''}</div>
              <div class="chapter-actions" style="flex-wrap:wrap;">
                ${ch.youtube ? `<button class="chapter-btn video" data-yt="${ch.youtube}" data-title="${subject.name} - ${ch.title}">
                  <i class="fa-solid fa-circle-play"></i> Video
                </button>` : ''}
                ${resources.map(r => `<a class="chapter-btn pdf" href="${r.url}" target="_blank" rel="noopener" title="${r.description || ''}">
                  <i class="fa-solid fa-file-pdf"></i> ${r.type || 'PDF'}
                </a>`).join('')}
              </div>
            </div>`;
        });

        html += `</div></div>`;
      });

      html += `</div>`;
    });
    batchPanelsContainer.innerHTML = html;

    // Re-attach video button listeners
    document.querySelectorAll('.chapter-btn.video').forEach(btn => {
      btn.addEventListener('click', () => openVideoModal(btn.dataset.yt, btn.dataset.title));
    });

    // Re-attach tab click listeners
    document.querySelectorAll('.batch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.batch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.batch-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('panel-' + tab.dataset.batch);
        if (target) target.classList.add('active');
      });
    });

    if (window.AOS) AOS.refreshHard();
  }

  renderBatches();

  /* =========================================================
     VIDEO MODAL
  ========================================================= */
  const videoModal = document.getElementById('videoModal');
  const videoFrame = document.getElementById('videoFrame');
  const videoModalTitle = document.getElementById('videoModalTitle');
  const videoModalClose = document.getElementById('videoModalClose');

  function openVideoModal(ytId, title) {
    videoFrame.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    videoModalTitle.textContent = title || '';
    videoModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeVideoModal() {
    videoModal.classList.remove('open');
    videoFrame.src = '';
    document.body.style.overflow = '';
  }
  videoModalClose.addEventListener('click', closeVideoModal);
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeVideoModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideoModal();
  });

  /* =========================================================
     WEEKLY TEST RESULT LOOKUP
     -----------------------------------------------------------
     Duplicate-mobile-safe: the same mobile number can legitimately
     belong to more than one student (siblings in different classes,
     or two students sharing a guardian's phone). We therefore:
       1. Look up ALL students matching (class + mobile).
       2. If exactly one match -> show it directly.
       3. If more than one match -> ask the user to pick their name
          before showing the result (keys on class+mobile+name).
     When Supabase is configured this calls the get_public_result()
     RPC function (which also enforces the 3-day validity window).
     Otherwise it uses the local RESULTS_DATA fallback (no expiry).
  ========================================================= */
  const resultForm = document.getElementById('resultForm');
  const resultOutput = document.getElementById('resultOutput');
  const resultError = document.getElementById('resultError');
  const resultTableBody = document.getElementById('resultTableBody');
  const resultSummary = document.getElementById('resultSummary');

  const gradeColors = {
    'A+': '#00C2A8', 'A': '#4C3CE3', 'B+': '#6C63FF',
    'B': '#FFA630', 'C': '#FF8E53', 'D': '#FF6B6B'
  };

  // Simple name-picker UI injected right above the result output
  let namePickerBox = document.getElementById('namePickerBox');
  if (!namePickerBox) {
    namePickerBox = document.createElement('div');
    namePickerBox.id = 'namePickerBox';
    namePickerBox.style.display = 'none';
    namePickerBox.style.marginTop = '20px';
    namePickerBox.innerHTML = `<p style="font-weight:700;margin-bottom:10px;color:var(--dark2);">Is number ke sath multiple students milte hain. Apna naam chunein:</p>
      <div id="namePickerList" style="display:flex;flex-wrap:wrap;gap:10px;"></div>`;
    resultForm.parentNode.insertBefore(namePickerBox, resultOutput);
  }

  async function fetchMatches(cls, mobile) {
    if (typeof IS_SUPABASE_CONFIGURED !== 'undefined' && IS_SUPABASE_CONFIGURED) {
      const { data, error } = await supabaseClient.rpc('get_public_result', { p_class: cls, p_mobile: mobile });
      if (error) { console.warn(error); return []; }
      return (data || []).map(row => ({
        name: row.student_name, class: row.student_class, mobile: row.student_mobile, tests: row.tests || []
      }));
    }
    if (typeof RESULTS_DATA === 'undefined') return [];
    return RESULTS_DATA.students.filter(s => s.class === cls && s.mobile === mobile);
  }

  function showStudentResult(student) {
    document.getElementById('rName').textContent = student.name;
    document.getElementById('rMeta').textContent = `Class ${student.class} | Mobile: ${student.mobile}`;

    let rowsHtml = '';
    let totalPct = 0;
    (student.tests || []).forEach(t => {
      totalPct += Number(t.percentage) || 0;
      const color = gradeColors[t.grade] || '#4C3CE3';
      rowsHtml += `
        <tr>
          <td>${t.testName}</td>
          <td>${formatDate(t.date)}</td>
          <td>${t.physics}</td>
          <td>${t.chemistry}</td>
          <td>${t.maths}</td>
          <td><strong>${t.total}</strong></td>
          <td>${t.percentage}%</td>
          <td><span class="grade-pill" style="background:${color}">${t.grade}</span></td>
        </tr>`;
    });
    resultTableBody.innerHTML = rowsHtml;

    const testCount = (student.tests || []).length || 1;
    const avgPct = (totalPct / testCount).toFixed(1);
    const bestTest = (student.tests && student.tests.length)
      ? student.tests.reduce((a, b) => (a.percentage > b.percentage ? a : b))
      : { percentage: 0, grade: '-' };

    resultSummary.innerHTML = `
      <div class="summary-item"><div class="val">${(student.tests || []).length}</div><div class="lab">Tests Taken</div></div>
      <div class="summary-item"><div class="val">${avgPct}%</div><div class="lab">Average Score</div></div>
      <div class="summary-item"><div class="val">${bestTest.percentage}%</div><div class="lab">Best Score</div></div>
      <div class="summary-item"><div class="val">${bestTest.grade}</div><div class="lab">Best Grade</div></div>
    `;

    namePickerBox.style.display = 'none';
    resultOutput.style.display = 'block';
    resultOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  resultForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cls = document.getElementById('resultClass').value.trim();
    const mobile = document.getElementById('resultMobile').value.trim();
    const submitBtn = resultForm.querySelector('.btn-primary');
    const btnOriginalHtml = submitBtn.innerHTML;

    resultOutput.style.display = 'none';
    resultError.style.display = 'none';
    namePickerBox.style.display = 'none';

    // Small animated "loading" state so the button gives instant feedback
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch"></i> Result Dhoondh Rahe Hain...';

    // tiny artificial delay so the loading animation is visible even on
    // instant local-fallback lookups (feels more alive / responsive)
    const [matches] = await Promise.all([
      fetchMatches(cls, mobile),
      new Promise(res => setTimeout(res, 450))
    ]);

    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = btnOriginalHtml;

    if (!matches || matches.length === 0) {
      resultError.style.display = 'flex';
      resultError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (matches.length === 1) {
      showStudentResult(matches[0]);
      return;
    }

    // Multiple students share this class+mobile -> let them pick by name
    const listEl = document.getElementById('namePickerList');
    listEl.innerHTML = matches.map((m, i) =>
      `<button type="button" class="btn btn-outline name-pick-btn" data-idx="${i}" style="color:var(--primary);border-color:var(--primary);background:rgba(76,60,227,0.08);">${m.name}</button>`
    ).join('');
    listEl.querySelectorAll('.name-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => showStudentResult(matches[parseInt(btn.dataset.idx, 10)]));
    });
    namePickerBox.style.display = 'block';
    namePickerBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
  }

  // Only allow digits in mobile input
  const mobileInput = document.getElementById('resultMobile');
  mobileInput.addEventListener('input', () => {
    mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
  });

});
