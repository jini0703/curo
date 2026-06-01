export type CategoryTree = Record<string, string[]>;

export const INTERVIEW_CATEGORIES: CategoryTree = {
  Tech: [
    "Software Development",
    "Web Development",
    "AI/ML",
    "Data Science",
    "Cybersecurity",
    "Cloud Engineering",
    "DevOps",
    "UI/UX",
    "Mobile Development",
  ],
  Finance: [
    "Investment Banking",
    "Accounting",
    "Trading",
    "Financial Analysis",
    "Risk Management",
  ],
  Sales: ["B2B Sales", "Enterprise Sales", "Retail Sales", "SaaS Sales"],
  Marketing: ["Digital Marketing", "Brand Strategy", "Growth Marketing", "SEO"],
  HR: ["Recruitment", "Employee Relations", "Compensation"],
  Consulting: ["Strategy", "Management", "Operations"],
  "Product Management": ["B2B Product", "Consumer Product", "Growth Product"],
  Healthcare: ["Clinical", "Healthcare Management", "Medical Research"],
  Legal: ["Corporate Law", "Litigation", "IP Law"],
  "Business Operations": ["Operations", "Logistics", "Strategy & Ops"],
};

export const COMPANION_CATEGORIES: CategoryTree = {
  "Stress & Anxiety": ["General Stress", "Work Anxiety", "Health Anxiety"],
  Relationships: ["Friendships", "Romantic", "Family"],
  "Career Pressure": ["Job Search", "Workplace", "Burnout"],
  Loneliness: ["Feeling Alone", "New City", "Social"],
  Motivation: ["Stuck", "Procrastination", "Goals"],
  "Self Confidence": ["Imposter Syndrome", "Self Worth"],
  Overthinking: ["Decisions", "Past", "Future"],
  "Family Issues": ["Parents", "Siblings", "Conflicts"],
  "College Stress": ["Exams", "Roommates", "Future"],
  "Life Problems": ["General", "Big Decisions", "Change"],
};

export const COMPANION_TONES = [
  "Friendly",
  "Deep",
  "Motivational",
  "Funny",
  "Supportive",
  "Chill",
] as const;

export const INTERVIEW_TONES = [
  "Friendly",
  "Professional",
  "Tough",
  "Supportive",
] as const;
