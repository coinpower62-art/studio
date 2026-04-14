import { PlaceHolderImages } from './placeholder-images';

export const LANGUAGES = [
  { code: "en", name: "English (US)", flag: "🇺🇸" },
  { code: "fr", name: "Français",   flag: "🇫🇷" },
  { code: "es", name: "Español",    flag: "🇪🇸" },
  { code: "pt", name: "Português",  flag: "🇧🇷" },
  { code: "ar", name: "العربية",    flag: "🇸🇦" },
  { code: "zh", name: "中文",       flag: "🇨🇳" },
  { code: "ru", name: "Русский",    flag: "🇷🇺" },
  { code: "de", name: "Deutsch",    flag: "🇩🇪" },
  { code: "hi", name: "हिन्दी",     flag: "🇮🇳" },
  { code: "ha", name: "Hausa",      flag: "🇳🇬" },
  { code: "sw", name: "Kiswahili",  flag: "🇰🇪" },
  { code: "yo", name: "Yorùbá",     flag: "🇳🇬" },
  { code: "tr", name: "Türkçe",     flag: "🇹🇷" },
  { code: "it", name: "Italiano",   flag: "🇮🇹" },
  { code: "id", name: "Indonesia",  flag: "🇮🇩" },
] as const;

export const PHONE_CODES = [
  { code: "+233", flag: "🇬🇭", label: "GH" },
  { code: "+234", flag: "🇳🇬", label: "NG" },
  { code: "+254", flag: "🇰🇪", label: "KE" },
  { code: "+1",   flag: "🇺🇸", label: "US" },
  { code: "+1",   flag: "🇨🇦", label: "CA" },
  { code: "+7",   flag: "🇷🇺", label: "RU" },
  { code: "+31",  flag: "🇳🇱", label: "NL" },
  { code: "+33",  flag: "🇫🇷", label: "FR" },
  { code: "+34",  flag: "🇪🇸", label: "ES" },
  { code: "+39",  flag: "🇮🇹", label: "IT" },
  { code: "+41",  flag: "🇨🇭", label: "CH" },
  { code: "+44",  flag: "🇬🇧", label: "GB" },
  { code: "+46",  flag: "🇸🇪", label: "SE" },
  { code: "+47",  flag: "🇳🇴", label: "NO" },
  { code: "+49",  flag: "🇩🇪", label: "DE" },
  { code: "+52",  flag: "🇲🇽", label: "MX" },
  { code: "+54",  flag: "🇦🇷", label: "AR" },
  { code: "+55",  flag: "🇧🇷", label: "BR" },
  { code: "+61",  flag: "🇦🇺", label: "AU" },
  { code: "+81",  flag: "🇯🇵", label: "JP" },
  { code: "+82",  flag: "🇰🇷", label: "KR" },
  { code: "+86",  flag: "🇨🇳", label: "CN" },
  { code: "+91",  flag: "🇮🇳", label: "IN" },
  { code: "+212", flag: "🇲🇦", label: "MA" },
  { code: "+351", flag: "🇵🇹", label: "PT" },
  { code: "+966", flag: "🇸🇦", label: "SA" },
];

export const countries = [
    'Italy',
    'Ghana',
    'Nigeria',
    'Kenya',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Netherlands',
    'Switzerland',
    'Sweden',
    'Norway',
    'Portugal',
    'Brazil',
    'Argentina',
    'Mexico',
    'India',
    'China',
    'Japan',
    'South Korea',
];

export interface Generator {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  price: number;
  expire_days: number;
  daily_income: number;
  published: boolean;
  roi: string;
  period: string;
  min_invest: string;
  max_invest: string;
  investors: string;
  isFree?: boolean;
  image_url?: string;
  max_rentals: number;
}

export const generators: Generator[] = [];

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
  { name: 'Omar G.', earnings: 4.20 },
];
