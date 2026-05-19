// Role-first onboarding for Dispatch · Tech career intelligence.

export const ROLES = [
  { id: "cs_student", label: "CS Student", blurb: "Currently studying computer science." },
  { id: "ml_learner", label: "AI/ML Learner", blurb: "Self-teaching machine learning or AI." },
  { id: "software_engineer", label: "Software Engineer", blurb: "Working full-time in software." },
  { id: "ml_engineer", label: "ML / AI Engineer", blurb: "Building ML systems in production." },
  { id: "data_engineer", label: "Data Engineer", blurb: "Pipelines, warehouses, analytics infra." },
  { id: "security_pro", label: "Cybersecurity Pro", blurb: "Offensive, defensive, or AppSec." },
  { id: "devops_sre", label: "DevOps / SRE", blurb: "Infra, reliability, deployment." },
  { id: "upskilling", label: "Upskilling Professional", blurb: "Levelling up while working." },
  { id: "transitioning", label: "Transitioning Roles", blurb: "Pivoting into tech or between specialties." },
  { id: "engineering_manager", label: "Engineering Manager", blurb: "Leading a team, staying technical." },
];

export const SKILL_LEVELS = [
  { id: "beginner", label: "Beginner", blurb: "First year or just starting." },
  { id: "intermediate", label: "Intermediate", blurb: "1–3 years of focused work." },
  { id: "advanced", label: "Advanced", blurb: "4+ years, mid-to-senior." },
  { id: "expert", label: "Expert", blurb: "Staff, principal, or specialist depth." },
];

// Career domains — what you want intelligence ABOUT.
// These map onto the brief's section headings.
export const DOMAINS = [
  "AI Research",
  "ML Engineering",
  "LLM Applications",
  "Backend Development",
  "Frontend Development",
  "Mobile Development",
  "DevOps & Infra",
  "Data Engineering",
  "Cybersecurity",
  "Cloud Architecture",
  "Developer Tools",
  "Open Source",
  "Hardware & Systems",
  "Startup & Career Signal",
];

export const DEPTHS = [
  { id: "skim", label: "Skim", blurb: "One line per story. For mornings in a hurry." },
  { id: "standard", label: "Standard", blurb: "TL;DR and why it matters for your career." },
  { id: "deep", label: "Deep", blurb: "A short paragraph with technical and career context." },
];

export function roleLabel(id) {
  return ROLES.find((r) => r.id === id)?.label || id;
}
export function skillLabel(id) {
  return SKILL_LEVELS.find((s) => s.id === id)?.label || id;
}
