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

  // Free downloads on the Resources page. Files live in /resources/.
  // `slug` is stored with each download lead in the CRM (lowercase, digits, hyphens).
  resources: [
    {
      slug: "home-builder-checklist",
      title: "Home-builder checklist",
      format: "PDF", size: "150 KB",
      file: "resources/avspmc-home-builder-checklist.pdf",
      audience: "For private owners",
      description: "What to check at each stage of building a villa or house, from buying the plot to moving in.",
      points: ["Land, budget and design checks", "Approvals to get before work starts", "What to inspect before it gets covered", "Snagging and handover"],
    },
    {
      slug: "construction-budget-template",
      title: "Construction budget template",
      format: "Excel", size: "16 KB",
      file: "resources/avspmc-construction-budget-template.xlsx",
      audience: "For developers and owners",
      description: "Plan and track cost by trade, with contingency, monthly cash flow and a variation register.",
      points: ["Budget, committed, certified and forecast by trade", "Cost per sq ft worked out for you", "24-month cash flow plan vs actual", "Variation log that feeds the budget"],
    },
    {
      slug: "contractor-selection-guide",
      title: "Contractor selection guide",
      format: "PDF", size: "180 KB",
      file: "resources/avspmc-contractor-selection-guide.pdf",
      audience: "For anyone appointing a contractor",
      description: "How to tender, compare bids on equal terms and sign a contract that protects you.",
      points: ["Pre-qualification checks", "Comparing bids like for like", "Eleven things the contract must cover", "Red flags to walk away from"],
    },
    {
      slug: "project-health-check",
      title: "Project health check",
      format: "PDF", size: "170 KB",
      file: "resources/avspmc-project-health-check.pdf",
      audience: "For projects already under way",
      description: "Twenty-five questions to tell in fifteen minutes whether your project is on track.",
      points: ["Time, cost, quality, contracts, safety", "Simple 0 to 50 scoring", "What your score means", "Warning signs that override the score"],
    },
  ],

  // Cost and fee estimator (estimator.html).
  // SAMPLE RATES: placeholders for illustration only. Replace them with
  // AVSPMC's own current figures before promoting the estimator.
  // rates = construction cost in ₹ per sq ft of built-up area, [low, high],
  // for a tier-1 city; the city factor scales them.
  estimator: {
    types: [
      { id: "residential", label: "Residential tower or township", rates: { standard: [2200, 2800], premium: [2800, 3800], luxury: [3800, 5500] } },
      { id: "private", label: "Private villa or house", rates: { standard: [2400, 3000], premium: [3000, 4200], luxury: [4200, 7000] } },
      { id: "office", label: "Office building or IT park", rates: { standard: [2600, 3200], premium: [3200, 4200], luxury: [4200, 6000] } },
      { id: "retail", label: "Retail or mixed use", rates: { standard: [2700, 3400], premium: [3400, 4500], luxury: [4500, 6500] } },
      { id: "hotel", label: "Hotel or resort", rates: { standard: [3500, 4500], premium: [4500, 6500], luxury: [6500, 10000] } },
      { id: "hospital", label: "Hospital or clinic", rates: { standard: [4000, 5000], premium: [5000, 7000], luxury: [7000, 10000] } },
    ],
    cities: [
      { id: "metro", label: "Metro (Mumbai, Delhi NCR, Bengaluru, Chennai, Hyderabad, Pune, Kolkata)", factor: 1.15 },
      { id: "tier1", label: "Other large city (state capitals, Ahmedabad, Indore, Jaipur, etc.)", factor: 1.0 },
      { id: "tier2", label: "Smaller city or town", factor: 0.9 },
    ],
    specs: [
      { id: "standard", label: "Standard" },
      { id: "premium", label: "Premium" },
      { id: "luxury", label: "Luxury" },
    ],
    // Full project management fee as a share of construction cost, [low, high].
    pmcFee: [0.02, 0.04],
  },

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
