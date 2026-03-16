export const COUNTRIES = [
    "Ghana",
    "Nigeria",
    "Kenya",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Netherlands",
    "Switzerland",
    "Sweden",
    "Norway",
    "Portugal",
    "Brazil",
    "Argentina",
    "Mexico",
    "India",
    "China",
    "Japan",
    "South Korea",
];

export const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

export interface Generator {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  price: number;
  duration: number; // In days
  dailyIncome: number;
  published: boolean;
  roi: string;
  period: string;
  minInvest: string;
  maxInvest: string;
  investors: string;
  isFree: boolean;
}

export const generators: Generator[] = [
  {
    id: 'pg1',
    name: 'PG1 Generator',
    subtitle: 'Starter Power Plan',
    icon: '⚡',
    color: 'amber',
    price: 0,
    duration: 3,
    dailyIncome: 0.20,
    published: true,
    roi: '$0.20/day',
    period: 'Daily',
    minInvest: '$0',
    maxInvest: '$9',
    investors: '12,450',
    isFree: true,
  },
  {
    id: 'pg2',
    name: 'PG2 Generator',
    subtitle: 'Growth Power Plan',
    icon: '🚀',
    color: 'green',
    price: 10,
    duration: 10,
    dailyIncome: 1.00,
    published: true,
    roi: '$1.00/day',
    period: 'Daily',
    minInvest: '$10',
    maxInvest: '$14',
    investors: '8,320',
    isFree: false,
  },
  {
    id: 'pg3',
    name: 'PG3 Generator',
    subtitle: 'Pro Power Plan',
    icon: '💎',
    color: 'blue',
    price: 15,
    duration: 15,
    dailyIncome: 1.20,
    published: true,
    roi: '$1.20/day',
    period: 'Daily',
    minInvest: '$15',
    maxInvest: '$19',
    investors: '4,100',
    isFree: false,
  },
  {
    id: 'pg4',
    name: 'PG4 Generator',
    subtitle: 'Elite Power Plan',
    icon: '👑',
    color: 'purple',
    price: 20,
    duration: 20,
    dailyIncome: 1.50,
    published: true,
    roi: '$1.50/day',
    period: 'Daily',
    minInvest: '$20',
    maxInvest: 'Unlimited',
    investors: '1,290',
    isFree: false,
  }
];

export const countries = COUNTRIES;

export const winners = [
  { name: 'Kwame A.', earnings: 5.20 },
  { name: 'Fatoumata B.', earnings: 12.50 },
  { name: 'Kofi O.', earnings: 7.80 },
  { name: 'Zahra M.', earnings: 15.10 },
  { name: 'Adebola T.', earnings: 3.45 },
  { name: 'Chinedu E.', earnings: 9.90 },
  { name: 'Amina S.', earnings: 11.25 },
  { name: 'Moussa D.', earnings: 6.70 },
  { name: 'Nia K.', earnings: 18.00 },
  { name: 'Bayo A.', earnings: 2.50 },
  { name: 'Esi F.', earnings: 14.30 },
  { name: 'Jelani R.', earnings: 8.10 },
  { name: 'Sade W.', earnings: 19.99 },
  { name: 'Omar G.', earnings: 4.60 },
  { name: 'Thandiwe N.', earnings: 13.00 },
];
