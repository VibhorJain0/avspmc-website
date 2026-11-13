/* =====================================================================
   AVSPMC — SITE CONTENT
   ---------------------------------------------------------------------
   NOTE: projects, contact details, figures and the testimonial are now
   edited on the admin page (/admin/) and stored in Supabase. The copies
   below are only a backup, used if Supabase cannot be reached.
   The company name (logo text) below is still used directly.

   Edit the text between the quotes. Keep the quotes, commas and
   brackets as they are. Save the file and refresh the browser.

   Everything marked SAMPLE is invented placeholder content. Replace it
   with your real details before the site goes live, then set
   showSampleNotice to false.
   ===================================================================== */

window.SITE = {

  /* Shows a thin bar at the top of every page saying the content is
     sample content. Set to false once your real content is in.       */
  showSampleNotice: true,

  /* ---- Company --------------------------------------------------- */
  company: {
    // The logo is drawn from these two parts: bold part + light part.
    logoBold:  "AVS",
    logoLight: "PMC",
    legalName: "AVSPMC Project Management Consultants Pvt. Ltd.", // SAMPLE
    tagline:   "Independent project management consultants for real estate and building projects across India.",
  },

  /* ---- Contact (header, footer, home page and contact page) -------- */
  contact: {
    email:     "hello@avspmc.example",          // SAMPLE — your inbox
    phone:     "+91 98000 00000",               // SAMPLE — shown on site
    phoneLink: "+919800000000",                 // SAMPLE — digits only
    whatsapp:  "919800000000",                  // SAMPLE — country code + number, no +
    hours:     "Monday to Saturday, 9:30 am to 6:30 pm",
    hq: {
      label:   "Head office",
      address: "Address to be added", // SAMPLE — e.g. "4th Floor, ABC Tower, Baner, Pune 411045"
    },
    regions:  "Projects across India",
    linkedin: "", // optional, e.g. "https://www.linkedin.com/company/avspmc"
  },

  /* ---- Headline numbers (about page) ------------------------------ */
  stats: [ // SAMPLE
    { value: "120+",      label: "projects managed since 2012" },
    { value: "3.8 cr",    label: "sq ft of built-up area delivered" },
    { value: "₹6,800 Cr", label: "of construction cost managed" },
    { value: "22",        label: "cities in 11 states" },
  ],

  /* ---- Testimonial (home page; the first one is shown) ------------- */
  testimonials: [ // SAMPLE
    {
      quote: "They told us in month two that the façade package would slip, and what it would cost us if it did. We fixed it in month three.",
      name:  "Director, Projects",
      org:   "Residential developer, Pune",
    },
  ],

  /* ---- Projects (home + projects pages) -----------------------------
     sector:   must match one of the names in `sectors` below
     status:   "Completed" or "Ongoing"
     progress: percent complete (only shown when Ongoing)
     photo:    path to the project image. The current photos are
               stock images (see CREDITS.md); replace them with
               photos of your own projects.
     featured: "lead" = the big project on the home page,
               true    = also shown on the home page,
               false   = projects page only                         */
  projects: [ // SAMPLE — all eight projects are invented
    {
      name: "Riverside Residences", sector: "Residential", city: "Pune",
      client: "Residential developer", area: "11.2 lakh sq ft", value: "₹420 Cr",
      scope: "Two 32-storey towers with a clubhouse and three acres of landscape.",
      status: "Ongoing", progress: 64,
      photo: "assets/img/photos/proj-riverside.jpg", featured: "lead",
    },
    {
      name: "Sea-facing residence", sector: "Private residences", city: "Alibaug",
      client: "Private owner", area: "14,000 sq ft", value: "₹28 Cr",
      scope: "A three-level villa with pool and staff quarters on a 1.2-acre plot.",
      status: "Completed", progress: 100,
      photo: "assets/img/photos/proj-villa.jpg", featured: true,
    },
    {
      name: "Technology campus, phase 1", sector: "Offices & IT parks", city: "Hyderabad",
      client: "Technology company", area: "6.5 lakh sq ft", value: "₹310 Cr",
      scope: "Office towers, a multi-level car park and a food court for 3,000 seats.",
      status: "Completed", progress: 100,
      photo: "assets/img/photos/proj-campus.jpg", featured: true,
    },
    {
      name: "Business hotel, 180 keys", sector: "Hospitality", city: "Ahmedabad",
      client: "Hospitality group", area: "2.4 lakh sq ft", value: "₹190 Cr",
      scope: "Banquet and dining podium with a 14-floor guest-room tower.",
      status: "Ongoing", progress: 38,
      photo: "assets/img/photos/proj-hotel.jpg", featured: false,
    },
    {
      name: "Retail and office development", sector: "Retail & mixed use", city: "Gurugram",
      client: "Commercial developer", area: "3.8 lakh sq ft", value: "₹260 Cr",
      scope: "Two retail levels under a central atrium, with six office floors above.",
      status: "Completed", progress: 100,
      photo: "assets/img/photos/proj-retail.jpg", featured: false,
    },
    {
      name: "Multi-speciality hospital, 250 beds", sector: "Healthcare", city: "Indore",
      client: "Healthcare trust", area: "3.1 lakh sq ft", value: "₹230 Cr",
      scope: "Operating theatres, ICUs and medical gas systems, planned for NABH accreditation.",
      status: "Ongoing", progress: 22,
      photo: "assets/img/photos/proj-hospital.jpg", featured: false,
    },
    {
      name: "Corporate office fit-out", sector: "Offices & IT parks", city: "Bengaluru",
      client: "Financial services company", area: "1.6 lakh sq ft", value: "₹85 Cr",
      scope: "Four floors of workspace, labs and a training centre, delivered in 26 weeks.",
      status: "Completed", progress: 100,
      photo: "assets/img/photos/proj-fitout.jpg", featured: false,
    },
    {
      name: "Villa community", sector: "Residential", city: "Chennai",
      client: "Residential developer", area: "42 acres", value: "₹150 Cr",
      scope: "312 plots with roads and utilities, a clubhouse and 60 developer-built homes.",
      status: "Ongoing", progress: 81,
      photo: "assets/img/photos/proj-plotted.jpg", featured: false,
    },
  ],

  /* ---- Sector names (project filter and contact form) --------------- */
  sectors: [
    "Residential",
    "Private residences",
    "Offices & IT parks",
    "Retail & mixed use",
    "Hospitality",
    "Healthcare",
  ],
};
