/* =====================================================================
   CLINIC SETTINGS (DotCom Pro) — the ONLY file to edit for a new client.
   1. Fill in every field below (keep the quotes and commas).
   2. Replace doctor.jpg with the doctor's portrait (same file name).
   3. Push to the doctor's NEW GitHub repo and turn on GitHub Pages.
   Leave a field as "" to hide that part of the site.
   ===================================================================== */
window.SITE = {

  /* ---------- Main doctor (the hero at the top of the site) ---------- */
  doctor: {
    name: "Dr. Sample Name",              // full name as shown in the hero
    shortName: "Dr. Sample",              // used in sentences ("Consult Dr. Sample privately")
    photo: "doctor.jpg",                  // portrait in the same folder
    eyebrow: "Physician · Since 2015",    // small line above the name
    role: "MBBS, MD · Consultant Physician, Sample Clinic",
    lead: "Over a decade of clinical practice, now open for private video consultations with patients across India and abroad.",
    badgeNumber: "11",                    // big number on the photo badge
    badgeText: "years of<br>clinical practice"
  },

  /* ---------- Top bar ---------- */
  brand: {
    title: "DR. SAMPLE NAME",
    subtitle: "Online Clinic"
  },

  /* ---------- Colours (any hex colour) ---------- */
  theme: {
    brand: "#0e8a8a",       // main colour (buttons, highlights)
    brandDeep: "#074a50",   // dark colour (hero, footer)
    accent: "#d94a3d",      // "Book appointment" button
    light: "#9fe3dc"        // light highlight text on dark areas
  },

  /* ---------- Stats band under the hero ---------- */
  stats: {
    headline: "Healing hands, <span>caring heart.</span>",
    items: [
      { value: "11",   label: "Years in practice" },
      { value: "2015", label: "Clinic founded", countFrom: 2000 },
      { value: "30",   suffix: " min", label: "Every new consultation" }
    ]
  },

  /* ---------- About ---------- */
  about: {
    heading: "A physician who takes the time to understand the whole person, not just the complaint.",
    paragraphs: [
      "Dr. Sample Name trained at Sample Medical College and founded Sample Clinic in 2015.",
      "Consultations are unhurried and detailed. The online clinic brings that same approach to patients who cannot travel."
    ]
  },

  /* ---------- Experience ---------- */
  experience: {
    // icon: "degree" | "clinic" | "language" | "registration" | "award"
    credentials: [
      { icon: "degree",       title: "MBBS, MD",            text: "Sample Medical College" },
      { icon: "clinic",       title: "Founder & Consultant", text: "Sample Clinic, City" },
      { icon: "language",     title: "Languages",           text: "Malayalam, English" },
      { icon: "registration", title: "Registration",        text: "Reg. No. 00000" }
    ],
    timeline: [
      { year: "2010–2015", title: "Medical degree",        text: "Sample Medical College." },
      { year: "2015",      title: "Founded Sample Clinic", text: "Opened as a family clinic." },
      { year: "2026",      title: "Online clinic",         text: "Opened online video consultations." }
    ]
  },

  /* ---------- Clinic (Pro) ---------- */
  clinic: {
    name: "Sample Clinic",
    whatsapp: "919000000000",       // clinic's own WhatsApp (digits only) — patients reply here
    googleReviewUrl: "",            // the clinic's Google review link (for review requests)
    upiId: "sample@upi",            // default UPI for payments (a doctor can have their own below)
    payeeName: "Sample Clinic"
  },

  /* ---------- Doctors (Pro) — one or more. With one doctor the list hides itself. ----------
     Each doctor has their OWN Cal.com and Daily (opened with their own Microsoft email).
     calUser = cal.com/<calUser>;  each consultation calSlug = cal.com/<calUser>/<calSlug>
     kind: "new" or "review" (used in the monthly report)                                    */
  doctors: [
    {
      id: "sample",                                  // short id, letters/numbers only
      name: "Dr. Sample Name",
      photo: "doctor.jpg",
      title: "MBBS, MD · Consultant Physician",
      bio: "Over a decade of clinical practice. Consultations are unhurried and detailed.",
      languages: "Malayalam, English",
      calUser: "",                                   // e.g. "dr-sample-abc123"
      roomUrl: "",                                   // the doctor's Daily room, e.g. "https://drsample.daily.co/consult"
      upiId: "", payeeName: "",                      // leave "" to use the clinic UPI
      consultations: [
        { calSlug: "online-video-consultation", kind: "new", name: "New consultation", duration: "30 minutes", fee: 500, featured: true,
          text: "A detailed first consultation with a complete case history, followed by your prescription." },
        { calSlug: "review-consultation", kind: "review", name: "Review consultation", duration: "20 minutes", fee: 300,
          text: "For patients already under the doctor's care. Progress review and an updated prescription." },
        { calSlug: "clinic-visit", kind: "new", name: "Clinic visit", duration: "At the clinic", fee: 0, inClinic: true,
          text: "Book a time to see the doctor in person at the clinic. Pay at the clinic." }
      ]
    }
  ],
  consultations: { intro: "Choose your doctor and consultation, pay securely by UPI, then pick your time." },

  /* ---------- Clinic helper (Cloudflare) ---------- */
  helper: {
    url: "https://sample-clinic-helper.drmirshadck.workers.dev"   // each clinic gets its own helper
  },

  /* ---------- "Consult from anywhere" panel ---------- */
  panel: {
    eyebrow: "Consult from anywhere",
    heading: "The same careful consultation, wherever you are.",
    text: "Patients from Kerala, across India and the Gulf can consult without travelling.",
    ticks: ["Private video room", "Full 30 minutes", "Prescription after the call"]
  },

  /* ---------- Instagram (set handle to "" to hide the section) ---------- */
  instagram: {
    handle: "sample_clinic",
    displayName: "Sample Clinic",
    posts: "150+", followers: "1K+", since: "2015",
    bio: "<b>Trusted care since 2015</b><br>City, District",
    text: "Health tips, clinic updates and awareness videos. Follow along to stay up to date."
  },

  /* ---------- FAQ ---------- */
  faq: [
    { q: "Do I need to install an app?", a: "No. The consultation opens in your browser on this website. Chrome or Safari on a phone or laptop works best." },
    { q: "How do I receive the consultation link?", a: "After you pay and pick your time, a confirmation email with your consultation link is sent to you. The clinic also sends the link to your WhatsApp." },
    { q: "Can I consult from outside India?", a: "Yes. Book the same way. If you can't pay by UPI, message the clinic on WhatsApp for other payment options." },
    { q: "Can I reschedule?", a: "Yes. Use the reschedule link in your confirmation email, or message the clinic on WhatsApp." }
  ],

  /* ---------- Contact ---------- */
  contact: {
    phoneDisplay: "+91 90000 00000",
    whatsapp: "919000000000",        // digits only, with country code — booking requests are sent here
    hours: "WhatsApp or call, Monday to Saturday.",
    clinicName: "Sample Clinic",
    address: ["Street", "City", "District, Kerala"]
  },

  /* ---------- Page details ---------- */
  meta: {
    title: "Dr. Sample Name",
    description: "Dr. Sample Name. Book an online video consultation.",
    year: "2026"
  }
};
