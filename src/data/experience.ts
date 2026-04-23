export type Experience = {
  company: string;
  role: string;
  dates: string;
  logo: string;
};

export const experience: Experience[] = [
  {
    company: 'AMD',
    role: 'Software Engineering Intern',
    dates: 'Summer 2026',
    logo: './logos/amd.png',
  },
  {
    company: 'Shopify',
    role: 'Platform SRE Intern',
    dates: 'Winter 2026',
    logo: './logos/shopify.png',
  },
  {
    company: 'BlackBerry',
    role: 'Systems Software Engineering Intern, QNX',
    dates: 'Fall 2025',
    logo: './logos/blackberry.png',
  },
  {
    company: 'Enverus',
    role: 'Site Reliability Engineer Intern',
    dates: 'Summer 2025',
    logo: './logos/enverus.png',
  },
];
