/* =====================================================================
   CLINIC SETTINGS (DotCom Pro) — Homoeocare Multi Speciality Clinic
   DEMO: fees, UPI and some registration details are
   placeholders until the clinic sends the real profiles and photos.
   ===================================================================== */
window.SITE = {

  /* ---------- Main doctor (the hero at the top of the site) ---------- */
  doctor: {
    name: "Dr. Anish Mohan",
    heading: "Dr. Anish Mohan<br><em>&amp; Dr. Sariga Sivan</em>",   // both doctors in the hero
    shortName: "our doctors",
    photo: "dr-anish.jpg",
    duo: [
      { photo: "dr-anish.jpg",   name: "Dr. Anish Mohan",  title: "BHMS · Chief Consultant" },
      { photo: "dr-sarigha.jpg", name: "Dr. Sariga Sivan", title: "BHMS · Consultant" }
    ],
    eyebrow: "Homoeopathic Physicians · Since 2015",
    role: "Homoeocare Multi Speciality Clinic, Cherpulassery",
    lead: "Over a decade of homoeopathic practice in Cherpulassery, Palakkad, now open for private video consultations with patients across India and abroad.",
    badgeNumber: "11",
    badgeText: "years of<br>trusted care"
  },

  /* ---------- Top bar ---------- */
  brand: {
    title: "HOMOEOCARE",
    subtitle: "Online Clinic"
  },

  /* ---------- Colours ---------- */
  theme: {
    brand: "#0e8a8a",
    brandDeep: "#074a50",
    accent: "#d94a3d",
    light: "#9fe3dc"
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
    heading: "A clinic that takes the time to understand the whole person, not just the complaint.",
    paragraphs: [
      "Dr. Anish Mohan trained at Government Homoeopathic Medical College, Calicut, and founded Homoeocare Multi Speciality Clinic in Manjakkal, Cherpulassery, in 2015. Eleven years on, the clinic has grown into a full team serving families across Palakkad.",
      "Dr. Sariga Sivan completed her BHMS at the University of Calicut in 2013 and brings 12 years of homoeopathic practice. Registered with the Travancore-Cochin Council of Homoeopathic Medicine (Reg. No. 10674), she consults alongside Dr. Anish at Homoeocare.",
      "Consultations are unhurried and detailed. Each one begins with a full case history so that treatment is individual to the patient. The online clinic brings that same approach to patients who cannot travel to Cherpulassery."
    ]
  },

  /* ---------- Experience ---------- */
  experience: {
    credentials: [
      { icon: "degree",       title: "BHMS",                         text: "Govt. Homoeopathic Medical College, Calicut" },
      { icon: "clinic",       title: "Founder & Chief Consultant",   text: "Homoeocare Multi Speciality Clinic, Cherpulassery" },
      { icon: "language",     title: "Languages",                    text: "Malayalam, English" },
      { icon: "registration", title: "Registration",                 text: "Registration number to be added" }
    ],
    timeline: [
      { year: "2010–2015", title: "Bachelor of Homoeopathic Medicine and Surgery", text: "Government Homoeopathic Medical College, Calicut." },
      { year: "2015",      title: "Founded Homoeocare Multi Speciality Clinic",    text: "Opened in Manjakkal, Cherpulassery, Palakkad, as a family homoeopathy clinic." },
      { year: "2015–now",  title: "Chief Consultant",                              text: "Leads consultations and the clinical team at the clinic." },
      { year: "2026",      title: "11 years of the clinic",                        text: "Marked the clinic's 11th anniversary and opened online video consultations." }
    ]
  },

  /* ---------- Clinic (Pro) ---------- */
  clinic: {
    name: "Homoeocare Multi Speciality Clinic",
    whatsapp: "917559882838",
    googleReviewUrl: "",
    upiId: "homoeocare@upi",          // DEMO — replace with the clinic's real UPI ID
    payeeName: "Homoeocare Multi Speciality Clinic"
  },

  /* ---------- Doctors (Pro) ---------- */
  doctors: [
    {
      id: "anish",
      name: "Dr. Anish Mohan",
      photo: "dr-anish-face.jpg",
      title: "BHMS · Chief Consultant",
      bio: "Founder of Homoeocare Multi Speciality Clinic. Over a decade of homoeopathic practice, with detailed, unhurried consultations built on a full case history.",
      languages: "Malayalam, English",
      calUser: "homoeocare-dr-anish",   // cal.com/homoeocare-dr-anish
      roomUrl: "https://dranishmohan.daily.co/consult",
      upiId: "", payeeName: "",
      consultations: [
        { calSlug: "online-video-consultation", kind: "new", name: "New consultation", duration: "30 minutes", fee: 500, featured: true,
          text: "A detailed first consultation with a complete case history, followed by your prescription and medicine dispatch." },
        { calSlug: "review-consultation", kind: "review", name: "Review consultation", duration: "20 minutes", fee: 300,
          text: "For patients already under the doctor's care. Progress review and an updated prescription." },
        { calSlug: "clinic-visit", kind: "new", name: "Clinic visit", duration: "At the clinic", fee: 0, inClinic: true,
          text: "Book a time to see the doctor in person at the clinic in Manjakkal. Pay at the clinic." }
      ]
    },
    {
      id: "sarigha",
      name: "Dr. Sariga Sivan",
      photo: "dr-sarigha-face.jpg",
      title: "BHMS · Consultant Homoeopathic Physician",
      bio: "BHMS from the University of Calicut (2013), with 12 years of homoeopathic practice at Homoeocare Multi Speciality Clinic, Cherpulassery. Reg. No. 10674, Travancore-Cochin Council of Homoeopathic Medicine.",
      languages: "Malayalam, English",
      calUser: "homoeocare-dr-sariga",  // cal.com/homoeocare-dr-sariga
      roomUrl: "https://drsarigasivan.daily.co/consult",
      upiId: "", payeeName: "",
      consultations: [
        { calSlug: "online-video-consultation", kind: "new", name: "New consultation", duration: "30 minutes", fee: 500, featured: true,
          text: "A detailed first consultation with a complete case history, followed by your prescription and medicine dispatch." },
        { calSlug: "review-consultation", kind: "review", name: "Review consultation", duration: "20 minutes", fee: 300,
          text: "For patients already under the doctor's care. Progress review and an updated prescription." },
        { calSlug: "clinic-visit", kind: "new", name: "Clinic visit", duration: "At the clinic", fee: 0, inClinic: true,
          text: "Book a time to see the doctor in person at the clinic in Manjakkal. Pay at the clinic." }
      ]
    }
  ],
  consultations: { intro: "Choose your doctor and consultation, pay securely by UPI, then pick your time." },

  /* ---------- Clinic helper (Cloudflare) ---------- */
  helper: {
    url: "https://homoeocare-helper.drmirshadck.workers.dev"
  },

  /* ---------- "Consult from anywhere" panel ---------- */
  panel: {
    eyebrow: "Consult from anywhere",
    heading: "The same careful consultation, wherever you are.",
    text: "Patients from Kerala, across India and the Gulf can consult our doctors without travelling. Medicines are dispatched to your address after the call.",
    ticks: ["Private video room for each doctor", "Full 30 minutes", "Prescription after the call"]
  },

  /* ---------- Instagram ---------- */
  instagram: {
    handle: "homoeocare_multispeciality",
    displayName: "Homoeocare Multi Speciality Clinic",
    posts: "150+", followers: "1.1K+", since: "2015",
    bio: "<b>Trusted homoeopathic care since 2015</b><br>Manjakkal, Cherpulassery, Palakkad",
    text: "Health tips, clinic updates and patient awareness videos from the Homoeocare team. Follow along to stay up to date."
  },

  /* ---------- FAQ ---------- */
  faq: [
    { q: "Can I choose which doctor I consult?", a: "Yes. When you tap Book, choose your doctor first. Your appointment goes to that doctor, and you meet them in their own private video room." },
    { q: "Do I need to install an app?", a: "No. The consultation opens in your browser on this website. Chrome or Safari on a phone or laptop works best." },
    { q: "How do I receive the consultation link?", a: "After you pay and pick your time, the clinic confirms your booking and a confirmation email with your consultation link is sent to you." },
    { q: "Can I consult from outside India?", a: "Yes. Book the same way. If you can't pay by UPI, message the clinic on WhatsApp for other payment options." },
    { q: "How will I get my medicines?", a: "After the consultation, the clinic arranges dispatch to your address. Delivery time depends on your location." },
    { q: "Can I reschedule?", a: "Yes. Use the reschedule link in your confirmation email, or message the clinic on WhatsApp." }
  ],

  /* ---------- Contact ---------- */
  contact: {
    phoneDisplay: "+91 75598 82838",
    whatsapp: "917559882838",
    hours: "Front desk on WhatsApp or call, Monday to Saturday.",
    clinicName: "Homoeocare Multi Speciality Clinic",
    address: ["Manjakkal, Cherpulassery", "Palakkad, Kerala"]
  },

  /* ---------- Page details ---------- */
  meta: {
    title: "Homoeocare Multi Speciality Clinic | Online Consultations",
    description: "Homoeocare Multi Speciality Clinic, Cherpulassery. Book a private online video consultation with Dr. Anish Mohan or Dr. Sariga Sivan.",
    year: "2026"
  }
};
