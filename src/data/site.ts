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

/** "brand" is each network's own colour, shown when its link is hovered. */
export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/alex-menzies', brand: '#0A66C2' },
  { label: 'Instagram', href: 'https://www.instagram.com/mnzsalex/', brand: '#FF0069' },
  { label: 'Facebook', href: 'https://www.facebook.com/alex.menzies.965/', brand: '#0866FF' },
  { label: 'Behance', href: 'https://www.behance.net/alexmenzies1', brand: '#1769FF' },
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
/** Tools on /stack. "icon" is a file name in src/assets/stack (monochrome versions of the open logo
 * sets gilbarbara/logos, Devicon and Simple Icons; the coloured versions shown on hover are in
 * src/assets/stack/color); "brand" is the tool's own colour, used for its arrow (leave it empty for
 * logos that are black or white). */
export const stack = [
  { icon: 'adobe', name: 'Adobe', label: 'Design', brand: '#FA0F00', href: 'https://www.adobe.com/products/catalog.html#category=creativity-design' },
  { icon: 'google', name: 'Google', label: 'Search', brand: '#4285F4', href: 'https://google.com' },
  { icon: 'illustrator', name: 'Illustrator', label: 'Design', brand: '#FF9A00', href: '' },
  { icon: 'photoshop', name: 'Photoshop', label: 'Images', brand: '#31A8FF', href: '' },
  { icon: 'indesign', name: 'InDesign', label: 'Folders', brand: '#FF3366', href: '' },
  { icon: 'premiere', name: 'Premiere Pro', label: 'Video', brand: '#EA77FF', href: '' },
  { icon: 'after-effects', name: 'After Effects', label: 'Animation', brand: '#9999FF', href: '' },
  { icon: 'canva', name: 'Canva', label: 'Design', brand: '#00C4CC', href: '' },
  { icon: 'claude', name: 'Claude', label: 'AI', brand: '#D97757', href: 'https://claude.ai' },
  { icon: 'gemini', name: 'Gemini', label: 'AI', brand: '#8E75B2', href: 'https://gemini.google.com' },
  { icon: 'chatgpt', name: 'ChatGPT', label: 'AI', brand: '#10A37F', href: 'https://chatgpt.com' },
  { icon: 'drive', name: 'Drive', label: 'File storage', brand: '#34A853', href: '' },
  { icon: 'icloud', name: 'iCloud', label: 'File storage', brand: '#3693F3', href: '' },
  { icon: 'apple', name: 'Apple', label: 'System', brand: '', href: 'https://www.apple.com' },
  { icon: 'spotify', name: 'Spotify', label: 'Music', brand: '#1ED760', href: 'https://www.spotify.com/' },
  { icon: 'notion', name: 'Notion', label: 'Organization', brand: '', href: '' },
  { icon: 'teams', name: 'Teams', label: 'Meetings', brand: '#7B83EB', href: '' },
  { icon: 'playstation', name: 'PlayStation', label: 'Gaming', brand: '#2E86F0', href: '' },
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
