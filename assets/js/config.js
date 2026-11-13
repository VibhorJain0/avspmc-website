/* =====================================================================
   AVSPMC — CONNECTION SETTINGS
   The website and the admin page read and write content through this
   Supabase project. The key below is a *publishable* key: it is meant
   to be public, and the database's access rules decide what it can do
   (visitors can read published content and send enquiries, nothing more).
   ===================================================================== */
window.AVS_CONFIG = {
  supabaseUrl: "https://ukymhlwtbbcyohilwtrm.supabase.co",
  supabaseKey: "sb_publishable_tNc6CCpW5te-UXInffKeSA_H4l_FlCJ",

  // Sector names: used by the project filter, the contact form and the admin page.
  sectors: [
    "Residential",
    "Private residences",
    "Offices & IT parks",
    "Retail & mixed use",
    "Hospitality",
    "Healthcare",
  ],
};
