/* =========================================================
   LOCAL FALLBACK SITE DATA
   Used when Supabase is not configured yet (SUPABASE_URL /
   SUPABASE_ANON_KEY empty in js/supabase-config.js), and also
   as the very first defaults shown before Supabase data loads.
   Once Supabase is connected, the Admin Panel writes changes
   there and the public site + this fallback stay in sync
   conceptually (same shape of data).
========================================================= */
const SITE_SETTINGS_DEFAULT = {
  logo_url: 'assets/img/logo.webp',
  site_title: 'CWA SCIENCE CLASSES',
  site_tagline: 'Concept with Abhishek',
  about_teacher_name: 'Abhishek Garg Sir',
  about_role: 'Physics • Chemistry • Maths Expert Faculty',
  about_image_url: 'assets/img/teacher.webp',
  about_text: 'CWA SCIENCE CLASSES mein Physics, Chemistry aur Maths — teeno subjects sirf <strong>Abhishek Garg Sir</strong> hi padhate hain. Ek hi teacher se poora PCM padhne ka fayda ye hai ki concepts aapas mein connect hote hain aur students ko subjects better samajh aate hain. Bihar Board ke syllabus par based, simple aur exam-oriented teaching style students ko top score dilane mein madad karta hai.',
  batches_heading: 'Class 9 se 12 tak PCM Batches',
  batches_subheading: 'Har class ke liye Physics, Chemistry aur Maths ke batch — sath mein video lecture aur PDF notes.',
  helpline_number: '+91 6207434940',
  whatsapp_link: 'https://wa.me/916207434940',
  address: 'CWA SCIENCE CLASSES, Patel High School Road Maheshkhunt (Godavari Complex), Bihar - India',
  class_timing: 'Monday - Saturday | 8:00 AM - 8:00 PM',
  email: 'info@cwascienceclasses.com',
  map_embed_url: 'https://www.google.com/maps?q=Bihar,India&output=embed',
  social_youtube: 'https://youtube.com',
  social_facebook: 'https://facebook.com',
  social_instagram: 'https://instagram.com',
  terms_content: 'Terms & Conditions content — edit this from the Admin Panel.',
  policy_content: 'Privacy Policy content — edit this from the Admin Panel.',
  result_validity_days: 3
};

const HERO_SLIDES_DEFAULT = [
  {
    eyebrow: '🎓 Bihar Board | Class 9 to 12',
    line1: 'CWA <em>SCIENCE</em> CLASSES',
    line2: 'Concept with',
    highlight: 'Abhishek',
    description: 'Physics • Chemistry • Maths ki best online coaching — Abhishek Garg Sir ke saath. Batch video, PDF notes aur weekly test — sab ek hi jagah!',
    image_url: 'assets/img/teacher.webp',
    btn1_text: 'Batches Dekhein', btn1_link: '#batches',
    btn2_text: 'Test Result', btn2_link: '#result'
  },
  {
    eyebrow: '📚 Har Batch Ke Saath',
    line1: 'Video + PDF',
    line2: 'Ek Hi',
    highlight: 'Batch Mein',
    description: 'Har chapter ka HD video lecture + downloadable PDF notes. Mobile se kabhi bhi, kahin bhi padhai karein.',
    image_url: 'assets/img/subjects.webp',
    btn1_text: 'Video Dekhein', btn1_link: '#batches',
    btn2_text: 'Sir Ke Baare Mein', btn2_link: '#about'
  },
  {
    eyebrow: '📝 Weekly Test Result',
    line1: 'Apna Result',
    line2: 'Turant',
    highlight: 'Check Karein',
    description: 'Class aur mobile number daal kar apna weekly test result online dekhein — kahin jaane ki zaroorat nahi!',
    image_url: 'assets/img/hero-elements.webp',
    btn1_text: 'Result Dekhein', btn1_link: '#result',
    btn2_text: '', btn2_link: ''
  }
];

const NOTICES_DEFAULT = [
  '🎉 New Batch (Class 9 to 12 PCM) admission open now!',
  '📅 Weekly Test every Sunday - Check your result online',
  '📞 Admission Helpline: +91 6207434940 (24/7 Available)',
  '📚 Free PDF Notes with every video lecture',
  '🏆 Bihar Board Physics, Chemistry, Maths - Best Result Guaranteed',
  '🎓 Only Faculty: Abhishek Garg Sir (PCM Expert)'
];
