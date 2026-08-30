import type { Partner } from "./types";

export const SAMPLE_PARTNERS: Partner[] = [
  {
    id: 1,
    name: "Oromia Regional Health Bureau",
    slug: "oromia-regional-health-bureau",
    category: "Government & Public Sector",
    description:
      "Strategic policy guidance, technical support, and health system strengthening across regional hospitals and rural health centers in Oromia.",
    short_description:
      "Policy guidance, support, and health system strengthening.",
    website: "https://oromiahealth.gov.et",
    order: 1,
    is_active: true,
    partnership_type: "Government Authority & Regulator",
    contact_email: "info@oromiahealth.gov.et",
    contact_phone: "+251 11 551 7000",
    collaboration_highlights: [
      "Regional health infrastructure & facility accreditation",
      "Maternal and child survival community campaigns",
      "Essential medicine supply chain integration",
      "Public health surveillance and epidemic outbreak response",
    ],
  },
  {
    id: 2,
    name: "West Arsi Zone Health Department",
    slug: "west-arsi-zone-health-department",
    category: "Government & Public Sector",
    description:
      "Technical assistance, direct supervision, disease monitoring, and zonal healthcare resource allocation for the hospital.",
    short_description:
      "Technical assistance, supervision, and performance monitoring.",
    website: "https://westarsi.gov.et",
    order: 2,
    is_active: true,
    partnership_type: "Zonal Health Directorate",
    contact_email: "health@westarsi.gov.et",
    contact_phone: "+251 46 110 0234",
    collaboration_highlights: [
      "Joint clinical audit and quality assurance monitoring",
      "Zonal referral network harmonization",
      "Community health worker (HEW) training seminars",
      "Vaccine distribution and cold-chain maintenance",
    ],
  },
  {
    id: 3,
    name: "Siraro District Administration",
    slug: "siraro-district-administration",
    category: "Government & Public Sector",
    description:
      "Local administration support for hospital land, security infrastructure, community health insurance outreach, and district transport pathways.",
    short_description:
      "Support for infrastructure and community health initiatives.",
    website: "https://siraro.gov.et",
    order: 3,
    is_active: true,
    partnership_type: "Local District Authority",
    contact_email: "contact@siraro.gov.et",
    contact_phone: "+251 46 110 5678",
    collaboration_highlights: [
      "Community-Based Health Insurance (CBHI) enrollment support",
      "Hospital campus expansion & land governance",
      "Emergency ambulance road access maintenance",
      "Water & power utility grid resilience",
    ],
  },
  {
    id: 4,
    name: "Anesvad Foundation",
    slug: "anesvad-foundation",
    category: "International NGOs & Foundations",
    description:
      "International philanthropic partner supporting neglected tropical disease (NTD) treatment, leprosy rehabilitation, surgical ward construction, and clean water access at Gambo.",
    short_description:
      "Funding & expertise for neglected tropical diseases, leprosy care, and surgical capacity.",
    website: "https://www.anesvad.org",
    order: 4,
    is_active: true,
    partnership_type: "International Philanthropic Funder",
    contact_email: "info@anesvad.org",
    contact_phone: "+34 94 441 8000",
    collaboration_highlights: [
      "Leprosy & skin disease specialized unit funding",
      "Operating theatre equipment modernization",
      "Clean water & sanitation (WASH) infrastructure",
      "Rehabilitative surgery and physical therapy sponsorship",
    ],
  },
  {
    id: 5,
    name: "Ethiopian Red Cross Society",
    slug: "ethiopian-red-cross-society",
    category: "Community & Local Organizations",
    description:
      "Partnering for emergency blood donor mobilization, disaster response prep, community first aid education, and humanitarian relief distribution.",
    short_description:
      "Emergency blood bank supply, disaster relief, and humanitarian aid.",
    website: "https://www.redcrosseth.org",
    order: 5,
    is_active: true,
    partnership_type: "Humanitarian Partner",
    contact_email: "ercs@redcrosseth.org",
    contact_phone: "+251 11 551 9364",
    collaboration_highlights: [
      "Mobile blood donation drives across West Arsi",
      "Ambulance emergency referral coordination",
      "First aid and disaster readiness training for hospital staff",
      "Essential humanitarian supplies for vulnerable families",
    ],
  },
  {
    id: 6,
    name: "Hawassa University Comprehensive Specialized Hospital",
    slug: "hawassa-university-hospital",
    category: "Academic & Medical Institutions",
    description:
      "Academic medical center partnership for complex tertiary patient referrals, clinical research, medical resident rotations, and specialized tele-consultations.",
    short_description:
      "Academic research, medical student training, and complex tertiary referrals.",
    website: "https://www.hu.edu.et",
    order: 6,
    is_active: true,
    partnership_type: "Academic & Clinical Affiliate",
    contact_email: "hospital@hu.edu.et",
    contact_phone: "+251 46 220 5311",
    collaboration_highlights: [
      "Sub-specialty pediatric & surgical patient referral protocol",
      "Medical intern and nursing student clinical preceptorships",
      "Joint epidemiological research on endemic regional health",
      "Tele-medicine case reviews for rare clinical cases",
    ],
  },
];

export function getStoredPartners(): Partner[] {
  if (typeof window === "undefined") return SAMPLE_PARTNERS;
  try {
    const saved = localStorage.getItem("gambo_partnerships");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SAMPLE_PARTNERS;
}

export function saveStoredPartners(partners: Partner[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("gambo_partnerships", JSON.stringify(partners));
  } catch {
    /* ignore */
  }
}
