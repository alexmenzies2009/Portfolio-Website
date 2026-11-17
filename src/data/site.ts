// Everything on the site that is not a project lives here: your name, intro text,
// navigation, social links, CV rows, tools and the playground pieces.
// Edit the text between the quotes and save; the site updates.
import type { ImageMetadata } from 'astro';
import { palette } from '../lib/palette';
import portrait from '../assets/about/portrait.webp';
import svcGraphics from '../assets/services/graphics.webp';
import svcBranding from '../assets/services/branding.webp';
import svcUiUx from '../assets/services/ui-ux.webp';
import svcWeb from '../assets/services/web-design.webp';

export const site = {
  name: 'Alex Menzies',
  role: 'Designer',
  description: 'Alex Menzies is a graphic designer based in Brussels, specialising in web design, illustration and visuals.',
  location: 'Brussels, Belgium',
  locationShort: 'Brussels, BE',
  timezone: 'Europe/Brussels',
  /** Set to false to hide the "Available for work" badges. */
  available: true,
  intro: "Hi! I'm Alex, I'm a young Graphic designer based in Brussels specialising in web design, illustration and visuals.",
  workIntro: 'Get a glimpse of some of my best and selected work! If you want to see more, don’t hesitate to see.',
  allWorkIntro: 'Take a look at all of the projects I had the opportunity to work on and how they made me the designer I am today.',
  contactIntro: 'I’m always open to collaborate on a project or hear about an opportunity!',
  playgroundIntro: "Welcome to a new world, a place where I play, a place where I showcase and unleash my creativity in AI. Trust me, it's the future.",
  /** Words that rotate in front of "Designer" on the home page. */
  disciplines: ['Graphic', 'Brand', 'UI+UX', 'Web'],
  /** The colour each of those words takes on the home page (from the project palette). */
  disciplineAccents: [palette.yellow, palette.cyan, palette.violet, palette.red],
};

/** Menu links. "tint" is each page's colour: its menu link on hover and the label at the top of the page. */
export const nav = [
  { label: 'Work', href: '/work/', tint: palette.yellow },
  { label: 'About', href: '/about/', tint: palette.cyan },
  { label: 'Playground', href: '/playground/', tint: palette.green },
  { label: 'Stack', href: '/stack/', tint: palette.violet },
  { label: 'Contact', href: '/contact/', tint: palette.red },
];
/** Page colour by path, for the label at the top of each page. */
export const tintFor = (href: string) => nav.find((n) => n.href === href)?.tint;

export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/alex-menzies' },
  { label: 'Instagram', href: 'https://www.instagram.com/mnzsalex/' },
  { label: 'Facebook', href: 'https://www.facebook.com/alex.menzies.965/' },
  { label: 'Behance', href: 'https://www.behance.net/alexmenzies1' },
];

export const services: { name: string; image: ImageMetadata }[] = [
  { name: 'Graphics', image: svcGraphics },
  { name: 'Branding', image: svcBranding },
  { name: 'UI+UX', image: svcUiUx },
  { name: 'Web Design', image: svcWeb },
];

export const about = {
  portrait,
  quotes: ['The best way to predict the future is to create it.', 'Stand high long enough and your lightning will come.'],
  experience: [
    { name: 'Business Out of the Box', role: 'Graphic designer', when: 'Present', href: '' },
    { name: 'Ad Delhaize', role: 'Shop assistant', when: '2016 – 2023', href: 'https://stores.delhaize.be/nl/ad-delhaize-groot-bijgaarden' },
    { name: 'Intern Blue2Purple', role: 'Motion design / Creative', when: '2022', href: 'https://blue2purple.com' },
    { name: 'Lifestyle Consultancy & Gym', role: 'Fitness instructor', when: '2020', href: 'https://unitygym.be' },
  ],
  experienceMore: 'https://www.linkedin.com/in/alex-menzies/details/experience/',
  education: [
    { name: 'Erasmushighschool — Brussels', role: 'Multimedia & Creatieve Technologie', when: '2019 – 2022', href: 'https://www.erasmushogeschool.be/nl/opleidingen/multimedia-creatieve-technologie' },
    { name: 'Don Bosco — Groot-Bijgaarden', role: 'Business support', when: '2013 – 2019', href: 'http://www.donboscogb.be' },
  ],
  skills: [
    { group: 'Program', items: ['Illustrator', 'Photoshop', 'InDesign', 'Adobe XD', 'Animate', 'After Effects'] },
    { group: 'Design', items: ['Graphics', 'UI/UX'] },
    { group: 'Animation', items: ['Motion Graphics'] },
    { group: 'Website', items: ['No-code tools'] },
  ],
  interests: ['Gaming', 'Festivals', 'Sci-fi', 'Technology', 'Traveling'],
};

/** The tools on /stack. "symbol" is the two letters shown big on the tile. */
export const stack = [
  { symbol: 'Cc', name: 'Adobe', label: 'Design', href: 'https://www.adobe.com/products/catalog.html#category=creativity-design' },
  { symbol: 'Go', name: 'Google', label: 'Search', href: 'https://google.com' },
  { symbol: 'Ca', name: 'Canva', label: 'Design', href: '' },
  { symbol: 'Ai', name: 'Illustrator', label: 'Design', href: '' },
  { symbol: 'Ps', name: 'Photoshop', label: 'Images', href: '' },
  { symbol: 'Id', name: 'InDesign', label: 'Folders', href: '' },
  { symbol: 'Pr', name: 'Premiere Pro', label: 'Video', href: '' },
  { symbol: 'Ae', name: 'After Effects', label: 'Animation', href: '' },
  { symbol: 'Dr', name: 'Drive', label: 'File storage', href: '' },
  { symbol: 'iC', name: 'iCloud', label: 'File storage', href: '' },
  { symbol: 'Ap', name: 'Apple', label: 'System', href: 'https://www.apple.com' },
  { symbol: 'Sp', name: 'Spotify', label: 'Music', href: 'https://www.spotify.com/' },
  { symbol: 'No', name: 'Notion', label: 'Organization', href: '' },
];

/** AI explorations on /playground. Images live in src/assets/playground. */
const pgImages = import.meta.glob<{ default: ImageMetadata }>('../assets/playground/*.webp', { eager: true });
const pg = (file: string) => pgImages[`../assets/playground/${file}`].default;

export const playground = [
  { image: pg('01-cyber-ai.webp'), label: 'Festival', title: 'Cyber AI', accent: '#c79bff' },
  { image: pg('02-retro-house.webp'), label: 'Gaming', title: 'Retro House', accent: '#ff8f7a' },
  { image: pg('03-dark-ocean.webp'), label: 'Landscape', title: 'Dark Ocean', accent: '#4fd8e0' },
  { image: pg('04-warrior.webp'), label: 'Battle', title: 'Warrior', accent: '' },
  { image: pg('05-lights-out.webp'), label: 'Racing', title: 'Lights Out', accent: '#ffd23f' },
  { image: pg('06-dark-city.webp'), label: 'New York', title: 'Dark City', accent: '#ff9a7a' },
  { image: pg('07-outer-space.webp'), label: 'Universe', title: 'Outer Space', accent: '#ff7a45' },
  { image: pg('08-the-eye.webp'), label: 'Believe', title: 'The Eye', accent: '#ffa24d' },
];

/**
 * Where the contact form sends messages. A static site cannot send email by itself, so pick one:
 *   provider: 'netlify'   if the site is hosted on Netlify (their built-in Forms pick it up automatically)
 *   provider: 'endpoint'  for a form service such as Formspree or Web3Forms; paste its URL in `endpoint`
 *   provider: 'off'       until one of the above is set up; the form then tells visitors to use the social links
 */
export const contactForm: { provider: 'netlify' | 'endpoint' | 'off'; endpoint: string } = {
  provider: 'endpoint',
  // FormSubmit forwards each message to this inbox. The first message triggers a one-time
  // "activate" email from FormSubmit; click its link once and the form is live.
  endpoint: 'https://formsubmit.co/ajax/alex.menzies1@gmail.com',
};
