// Beat definitions for public SEO landings. Each beat maps to:
// - id: stable URL slug
// - name: display name
// - tagline: meta description
// - domains: which Dispatch domains feed the curated daily sample

export const BEATS = {
  "ml-engineering": {
    id: "ml-engineering",
    name: "ML Engineering",
    tagline:
      "A daily career-intelligence brief for machine learning engineers — AI-curated from arXiv, HackerNews, GitHub, and Show HN.",
    role: "ml_engineer",
    skill_level: "intermediate",
    domains: ["ML Engineering", "AI Research", "LLM Applications"],
  },
  "ai-research": {
    id: "ai-research",
    name: "AI Research",
    tagline:
      "A daily brief on what's moving in AI research — arXiv papers, top HN AI threads, key open-source repos, with career framing.",
    role: "ml_engineer",
    skill_level: "advanced",
    domains: ["AI Research", "ML Engineering"],
  },
  "backend-development": {
    id: "backend-development",
    name: "Backend Development",
    tagline:
      "A daily morning brief for backend engineers — frameworks, infra, databases, open source. Career-grounded, five minutes.",
    role: "software_engineer",
    skill_level: "intermediate",
    domains: ["Backend Development", "DevOps & Infra", "Open Source", "Developer Tools"],
  },
  cybersecurity: {
    id: "cybersecurity",
    name: "Cybersecurity",
    tagline:
      "A daily security brief — CVEs, AppSec, offensive research, infra security. Curated for working security professionals.",
    role: "security_pro",
    skill_level: "intermediate",
    domains: ["Cybersecurity", "DevOps & Infra"],
  },
  "devops-infra": {
    id: "devops-infra",
    name: "DevOps & Infrastructure",
    tagline:
      "A daily brief for the people who keep production up — observability, Kubernetes, deployment, reliability, cloud architecture.",
    role: "devops_sre",
    skill_level: "intermediate",
    domains: ["DevOps & Infra", "Cloud Architecture", "Developer Tools"],
  },
  "data-engineering": {
    id: "data-engineering",
    name: "Data Engineering",
    tagline:
      "A daily brief for data engineers — pipelines, warehouses, streaming, lakes, the open-source analytics stack.",
    role: "data_engineer",
    skill_level: "intermediate",
    domains: ["Data Engineering", "Backend Development", "Open Source"],
  },
};

export function listBeats() {
  return Object.values(BEATS);
}

export function getBeat(id) {
  return BEATS[id] || null;
}
