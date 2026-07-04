/* =========================================================
   ADMIN DATA ACCESS LAYER
   -----------------------------------------------------------
   Provides a single `AdminDB` object with async methods used by
   the Admin Panel (Avinash.html + js/admin.js).

   - If Supabase is configured (js/supabase-config.js), every
     method talks directly to Supabase (Postgres + Auth).
   - If NOT configured yet, everything falls back to a JSON
     "database" kept in localStorage (seeded from js/site-data.js
     and js/batches-data.js) so the whole Admin Panel can be
     explored/tested immediately, before Supabase is wired up.
     A clear banner tells the admin that changes are LOCAL ONLY
     in that mode (they will NOT show on the live public site
     until Supabase is connected).
========================================================= */

const LOCAL_DB_KEY = 'cwa_admin_local_db_v1';
const LOCAL_AUTH_KEY = 'cwa_admin_local_auth_v1';

function loadLocalDB() {
  const raw = localStorage.getItem(LOCAL_DB_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallthrough to reseed */ }
  }
  const seed = {
    site_settings: Object.assign({}, (typeof SITE_SETTINGS_DEFAULT !== 'undefined') ? SITE_SETTINGS_DEFAULT : {}),
    hero_slides: (typeof HERO_SLIDES_DEFAULT !== 'undefined' ? HERO_SLIDES_DEFAULT : []).map((s, i) => Object.assign({ id: i + 1, sort_order: i, active: true }, s)),
    notices: (typeof NOTICES_DEFAULT !== 'undefined' ? NOTICES_DEFAULT : []).map((t, i) => ({ id: i + 1, text: t, sort_order: i, active: true })),
    batches: (typeof BATCHES_DATA !== 'undefined' ? BATCHES_DATA.batches : []).map((b, bi) => ({
      id: b.id, class_name: b.class, title: b.title, subtitle: b.subtitle, color: b.color, icon: b.icon,
      image_url: b.image_url || '', offer_text: b.offer_text || '', price: b.price || '', payment_link: b.payment_link || '',
      sort_order: bi, active: true,
      subjects: (b.subjects || []).map((s, si) => ({
        id: `${b.id}-s${si}`, name: s.name, icon: s.icon, sort_order: si,
        chapters: (s.chapters || []).map((ch, ci) => ({
          id: `${b.id}-s${si}-c${ci}`, title: ch.title, youtube_id: ch.youtube, duration: ch.duration,
          description: ch.description || '', sort_order: ci,
          chapter_resources: (ch.resources || []).map((r, ri) => ({
            id: `${b.id}-s${si}-c${ci}-r${ri}`, resource_type: r.type, url: r.url, description: r.description || '', sort_order: ri
          }))
        }))
      }))
    })),
    students: [],
    results: [],
    admin_profile: { username: 'AVINASH', auth_email: 'avinash@cwa-admin.local' }
  };
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seed));
  return seed;
}

function saveLocalDB(db) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function nextLocalId(arr) {
  return arr.length ? Math.max(...arr.map(x => (typeof x.id === 'number' ? x.id : 0))) + 1 : 1;
}

/* ---------------------------------------------------------
   LOCAL AUTH (used only when Supabase is not configured)
--------------------------------------------------------- */
function loadLocalAuth() {
  const raw = localStorage.getItem(LOCAL_AUTH_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  const def = { username: 'AVINASH', password: 'AVINASH' };
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(def));
  return def;
}
function saveLocalAuth(a) { localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(a)); }

const AdminDB = {
  isSupabase: () => (typeof IS_SUPABASE_CONFIGURED !== 'undefined' && IS_SUPABASE_CONFIGURED),

  /* ---------------- AUTH ---------------- */
  async login(username, password) {
    if (this.isSupabase()) {
      const { data: profile } = await supabaseClient.from('admin_profile').select('*').eq('id', 1).single();
      const expectedUsername = profile ? profile.username : 'AVINASH';
      if (username.trim().toUpperCase() !== expectedUsername.trim().toUpperCase()) {
        return { ok: false, error: 'Galat username ya password.' };
      }
      const email = profile ? profile.auth_email : 'avinash@cwa-admin.local';
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: 'Galat username ya password.' };
      return { ok: true, session: data.session };
    } else {
      const auth = loadLocalAuth();
      if (username.trim().toUpperCase() === auth.username.trim().toUpperCase() && password === auth.password) {
        localStorage.setItem('cwa_admin_local_logged_in', '1');
        return { ok: true, local: true };
      }
      return { ok: false, error: 'Galat username ya password.' };
    }
  },

  async logout() {
    if (this.isSupabase()) { await supabaseClient.auth.signOut(); }
    else { localStorage.removeItem('cwa_admin_local_logged_in'); }
  },

  async isLoggedIn() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.auth.getSession();
      return !!(data && data.session);
    }
    return localStorage.getItem('cwa_admin_local_logged_in') === '1';
  },

  async getUsername() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.from('admin_profile').select('username').eq('id', 1).single();
      return data ? data.username : 'AVINASH';
    }
    return loadLocalAuth().username;
  },

  async changeCredentials(newUsername, newPassword) {
    if (this.isSupabase()) {
      if (newUsername) {
        await supabaseClient.from('admin_profile').update({ username: newUsername, updated_at: new Date().toISOString() }).eq('id', 1);
      }
      if (newPassword) {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true };
    } else {
      const auth = loadLocalAuth();
      if (newUsername) auth.username = newUsername;
      if (newPassword) auth.password = newPassword;
      saveLocalAuth(auth);
      return { ok: true };
    }
  },

  /* ---------------- SITE SETTINGS ---------------- */
  async getSettings() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.from('site_settings').select('data').eq('id', 1).single();
      return data ? data.data : {};
    }
    return loadLocalDB().site_settings;
  },
  async saveSettings(newData) {
    if (this.isSupabase()) {
      const { data: cur } = await supabaseClient.from('site_settings').select('data').eq('id', 1).single();
      const merged = Object.assign({}, cur ? cur.data : {}, newData);
      await supabaseClient.from('site_settings').update({ data: merged, updated_at: new Date().toISOString() }).eq('id', 1);
    } else {
      const db = loadLocalDB();
      db.site_settings = Object.assign({}, db.site_settings, newData);
      saveLocalDB(db);
    }
  },

  /* ---------------- HERO SLIDES ---------------- */
  async listHeroSlides() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.from('hero_slides').select('*').order('sort_order');
      return data || [];
    }
    return loadLocalDB().hero_slides.sort((a,b)=>a.sort_order-b.sort_order);
  },
  async saveHeroSlide(slide) {
    if (this.isSupabase()) {
      if (slide.id) await supabaseClient.from('hero_slides').update(slide).eq('id', slide.id);
      else await supabaseClient.from('hero_slides').insert(slide);
    } else {
      const db = loadLocalDB();
      if (slide.id) {
        const idx = db.hero_slides.findIndex(s => s.id === slide.id);
        if (idx >= 0) db.hero_slides[idx] = Object.assign({}, db.hero_slides[idx], slide);
      } else {
        slide.id = nextLocalId(db.hero_slides);
        slide.sort_order = db.hero_slides.length;
        slide.active = true;
        db.hero_slides.push(slide);
      }
      saveLocalDB(db);
    }
  },
  async deleteHeroSlide(id) {
    if (this.isSupabase()) { await supabaseClient.from('hero_slides').delete().eq('id', id); }
    else { const db = loadLocalDB(); db.hero_slides = db.hero_slides.filter(s => s.id !== id); saveLocalDB(db); }
  },

  /* ---------------- NOTICES ---------------- */
  async listNotices() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.from('notices').select('*').order('sort_order');
      return data || [];
    }
    return loadLocalDB().notices.sort((a,b)=>a.sort_order-b.sort_order);
  },
  async saveNotice(notice) {
    if (this.isSupabase()) {
      if (notice.id) await supabaseClient.from('notices').update(notice).eq('id', notice.id);
      else await supabaseClient.from('notices').insert(notice);
    } else {
      const db = loadLocalDB();
      if (notice.id) {
        const idx = db.notices.findIndex(n => n.id === notice.id);
        if (idx >= 0) db.notices[idx] = Object.assign({}, db.notices[idx], notice);
      } else {
        notice.id = nextLocalId(db.notices);
        notice.sort_order = db.notices.length;
        notice.active = true;
        db.notices.push(notice);
      }
      saveLocalDB(db);
    }
  },
  async deleteNotice(id) {
    if (this.isSupabase()) { await supabaseClient.from('notices').delete().eq('id', id); }
    else { const db = loadLocalDB(); db.notices = db.notices.filter(n => n.id !== id); saveLocalDB(db); }
  },

  /* ---------------- BATCHES (+ subjects + chapters + resources) ---------------- */
  async listBatches() {
    if (this.isSupabase()) {
      const { data } = await supabaseClient
        .from('batches').select('*, subjects(*, chapters(*, chapter_resources(*)))')
        .order('sort_order');
      return data || [];
    }
    return loadLocalDB().batches;
  },
  async saveBatch(batch) {
    if (this.isSupabase()) {
      const row = {
        id: batch.id, class_name: batch.class_name, title: batch.title, subtitle: batch.subtitle,
        color: batch.color, icon: batch.icon, image_url: batch.image_url, offer_text: batch.offer_text,
        price: batch.price, payment_link: batch.payment_link, sort_order: batch.sort_order || 0
      };
      await supabaseClient.from('batches').upsert(row);
    } else {
      const db = loadLocalDB();
      const idx = db.batches.findIndex(b => b.id === batch.id);
      if (idx >= 0) db.batches[idx] = Object.assign({}, db.batches[idx], batch);
      else db.batches.push(Object.assign({ subjects: [] }, batch));
      saveLocalDB(db);
    }
  },
  async deleteBatch(id) {
    if (this.isSupabase()) { await supabaseClient.from('batches').delete().eq('id', id); }
    else { const db = loadLocalDB(); db.batches = db.batches.filter(b => b.id !== id); saveLocalDB(db); }
  },

  async saveSubject(batchId, subject) {
    if (this.isSupabase()) {
      if (subject.id) await supabaseClient.from('subjects').update({ name: subject.name, icon: subject.icon, sort_order: subject.sort_order }).eq('id', subject.id);
      else await supabaseClient.from('subjects').insert({ batch_id: batchId, name: subject.name, icon: subject.icon, sort_order: subject.sort_order || 0 });
    } else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      if (!batch) return;
      if (subject.id) {
        const idx = batch.subjects.findIndex(s => s.id === subject.id);
        if (idx >= 0) batch.subjects[idx] = Object.assign({}, batch.subjects[idx], subject);
      } else {
        subject.id = `${batchId}-s${Date.now()}`;
        subject.chapters = [];
        subject.sort_order = batch.subjects.length;
        batch.subjects.push(subject);
      }
      saveLocalDB(db);
    }
  },
  async deleteSubject(batchId, subjectId) {
    if (this.isSupabase()) { await supabaseClient.from('subjects').delete().eq('id', subjectId); }
    else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      if (batch) batch.subjects = batch.subjects.filter(s => s.id !== subjectId);
      saveLocalDB(db);
    }
  },

  async saveChapter(subjectId, chapter, batchId) {
    if (this.isSupabase()) {
      const row = { title: chapter.title, youtube_id: chapter.youtube_id, duration: chapter.duration, description: chapter.description, sort_order: chapter.sort_order || 0 };
      if (chapter.id) await supabaseClient.from('chapters').update(row).eq('id', chapter.id);
      else { row.subject_id = subjectId; await supabaseClient.from('chapters').insert(row); }
    } else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      const subject = batch && batch.subjects.find(s => s.id === subjectId);
      if (!subject) return;
      if (chapter.id) {
        const idx = subject.chapters.findIndex(c => c.id === chapter.id);
        if (idx >= 0) subject.chapters[idx] = Object.assign({}, subject.chapters[idx], chapter);
      } else {
        chapter.id = `${subjectId}-c${Date.now()}`;
        chapter.chapter_resources = [];
        chapter.sort_order = subject.chapters.length;
        subject.chapters.push(chapter);
      }
      saveLocalDB(db);
    }
  },
  async deleteChapter(batchId, subjectId, chapterId) {
    if (this.isSupabase()) { await supabaseClient.from('chapters').delete().eq('id', chapterId); }
    else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      const subject = batch && batch.subjects.find(s => s.id === subjectId);
      if (subject) subject.chapters = subject.chapters.filter(c => c.id !== chapterId);
      saveLocalDB(db);
    }
  },

  async saveResource(chapterId, resource, batchId, subjectId) {
    if (this.isSupabase()) {
      const row = { resource_type: resource.resource_type, url: resource.url, description: resource.description, sort_order: resource.sort_order || 0 };
      if (resource.id) await supabaseClient.from('chapter_resources').update(row).eq('id', resource.id);
      else { row.chapter_id = chapterId; await supabaseClient.from('chapter_resources').insert(row); }
    } else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      const subject = batch && batch.subjects.find(s => s.id === subjectId);
      const chapter = subject && subject.chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      if (resource.id) {
        const idx = chapter.chapter_resources.findIndex(r => r.id === resource.id);
        if (idx >= 0) chapter.chapter_resources[idx] = Object.assign({}, chapter.chapter_resources[idx], resource);
      } else {
        resource.id = `${chapterId}-r${Date.now()}`;
        resource.sort_order = chapter.chapter_resources.length;
        chapter.chapter_resources.push(resource);
      }
      saveLocalDB(db);
    }
  },
  async deleteResource(batchId, subjectId, chapterId, resourceId) {
    if (this.isSupabase()) { await supabaseClient.from('chapter_resources').delete().eq('id', resourceId); }
    else {
      const db = loadLocalDB();
      const batch = db.batches.find(b => b.id === batchId);
      const subject = batch && batch.subjects.find(s => s.id === subjectId);
      const chapter = subject && subject.chapters.find(c => c.id === chapterId);
      if (chapter) chapter.chapter_resources = chapter.chapter_resources.filter(r => r.id !== resourceId);
      saveLocalDB(db);
    }
  },

  /* ---------------- STUDENTS ---------------- */
  async listStudents(classFilter) {
    if (this.isSupabase()) {
      let q = supabaseClient.from('students').select('*').order('name');
      if (classFilter) q = q.eq('class', classFilter);
      const { data } = await q;
      return data || [];
    }
    const db = loadLocalDB();
    return classFilter ? db.students.filter(s => s.class === classFilter) : db.students;
  },
  async saveStudent(student) {
    if (this.isSupabase()) {
      if (student.id) await supabaseClient.from('students').update(student).eq('id', student.id);
      else await supabaseClient.from('students').insert(student);
    } else {
      const db = loadLocalDB();
      if (student.id) {
        const idx = db.students.findIndex(s => s.id === student.id);
        if (idx >= 0) db.students[idx] = Object.assign({}, db.students[idx], student);
      } else {
        student.id = nextLocalId(db.students);
        db.students.push(student);
      }
      saveLocalDB(db);
    }
  },
  async deleteStudent(id) {
    if (this.isSupabase()) { await supabaseClient.from('students').delete().eq('id', id); }
    else { const db = loadLocalDB(); db.students = db.students.filter(s => s.id !== id); db.results = db.results.filter(r => r.student_id !== id); saveLocalDB(db); }
  },

  /* ---------------- RESULTS ---------------- */
  async listResultsForStudent(studentId) {
    if (this.isSupabase()) {
      const { data } = await supabaseClient.from('results').select('*').eq('student_id', studentId).order('test_date');
      return data || [];
    }
    return loadLocalDB().results.filter(r => r.student_id === studentId);
  },
  async saveResult(result) {
    if (this.isSupabase()) {
      if (result.id) await supabaseClient.from('results').update(result).eq('id', result.id);
      else await supabaseClient.from('results').insert(result);
    } else {
      const db = loadLocalDB();
      const settings = db.site_settings || {};
      const validityDays = settings.result_validity_days || 3;
      const grade = (pct) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';
      const total = Number(result.physics||0) + Number(result.chemistry||0) + Number(result.maths||0);
      const outOf = result.out_of || 75;
      const pct = Math.round((total / outOf) * 1000) / 10;
      const now = new Date();
      const validUntil = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);
      const enriched = Object.assign({}, result, {
        total, out_of: outOf, percentage: pct, grade: grade(pct),
        published_at: now.toISOString(), valid_until: validUntil.toISOString()
      });
      if (result.id) {
        const idx = db.results.findIndex(r => r.id === result.id);
        if (idx >= 0) db.results[idx] = Object.assign({}, db.results[idx], enriched);
      } else {
        enriched.id = nextLocalId(db.results);
        db.results.push(enriched);
      }
      saveLocalDB(db);
    }
  },
  async deleteResult(id) {
    if (this.isSupabase()) { await supabaseClient.from('results').delete().eq('id', id); }
    else { const db = loadLocalDB(); db.results = db.results.filter(r => r.id !== id); saveLocalDB(db); }
  },

  /* ---------------- ONE-TIME SEED (push local defaults into Supabase) ---------------- */
  // Useful right after connecting Supabase for the first time: pushes the
  // default hero slides / notices / batches (with subjects/chapters/resources)
  // from site-data.js + batches-data.js into the Supabase tables, but only
  // if those tables are currently empty (safe to click multiple times).
  async seedFromDefaults() {
    if (!this.isSupabase()) return { ok: false, error: 'Supabase configured nahi hai.' };
    try {
      const { data: existingHero } = await supabaseClient.from('hero_slides').select('id').limit(1);
      if (!existingHero || existingHero.length === 0) {
        const slides = (typeof HERO_SLIDES_DEFAULT !== 'undefined' ? HERO_SLIDES_DEFAULT : []).map((s, i) => Object.assign({ sort_order: i, active: true }, s));
        if (slides.length) await supabaseClient.from('hero_slides').insert(slides);
      }

      const { data: existingNotices } = await supabaseClient.from('notices').select('id').limit(1);
      if (!existingNotices || existingNotices.length === 0) {
        const notices = (typeof NOTICES_DEFAULT !== 'undefined' ? NOTICES_DEFAULT : []).map((t, i) => ({ text: t, sort_order: i, active: true }));
        if (notices.length) await supabaseClient.from('notices').insert(notices);
      }

      const { data: existingBatches } = await supabaseClient.from('batches').select('id').limit(1);
      if (!existingBatches || existingBatches.length === 0 && typeof BATCHES_DATA !== 'undefined') {
        for (let bi = 0; bi < BATCHES_DATA.batches.length; bi++) {
          const b = BATCHES_DATA.batches[bi];
          await supabaseClient.from('batches').upsert({
            id: b.id, class_name: b.class, title: b.title, subtitle: b.subtitle,
            color: b.color, icon: b.icon, image_url: b.image_url || '', offer_text: b.offer_text || '',
            price: b.price || '', payment_link: b.payment_link || '', sort_order: bi
          });
          for (let si = 0; si < (b.subjects || []).length; si++) {
            const sub = b.subjects[si];
            const { data: subRow } = await supabaseClient.from('subjects')
              .insert({ batch_id: b.id, name: sub.name, icon: sub.icon, sort_order: si })
              .select('id').single();
            const subjectId = subRow.id;
            for (let ci = 0; ci < (sub.chapters || []).length; ci++) {
              const ch = sub.chapters[ci];
              const { data: chRow } = await supabaseClient.from('chapters')
                .insert({ subject_id: subjectId, title: ch.title, youtube_id: ch.youtube, duration: ch.duration, description: ch.description || '', sort_order: ci })
                .select('id').single();
              const chapterId = chRow.id;
              for (let ri = 0; ri < (ch.resources || []).length; ri++) {
                const r = ch.resources[ri];
                await supabaseClient.from('chapter_resources').insert({
                  chapter_id: chapterId, resource_type: r.type, url: r.url, description: r.description || '', sort_order: ri
                });
              }
            }
          }
        }
      }

      const { data: cur } = await supabaseClient.from('site_settings').select('data').eq('id', 1).single();
      if (cur && (!cur.data || Object.keys(cur.data).length === 0) && typeof SITE_SETTINGS_DEFAULT !== 'undefined') {
        await supabaseClient.from('site_settings').update({ data: SITE_SETTINGS_DEFAULT }).eq('id', 1);
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
};
