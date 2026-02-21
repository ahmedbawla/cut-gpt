export interface HaircutStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  prompt: string;
}

export const HAIRCUT_CATEGORIES = [
  'All',
  'Classic',
  'Modern',
  'Fade',
  'Long',
  'Textured',
] as const;

export type HaircutCategory = (typeof HAIRCUT_CATEGORIES)[number];

export const HAIRCUTS: HaircutStyle[] = [
  {
    id: 'buzz-cut',
    name: 'Buzz Cut',
    description: 'Clean and minimal all-over short cut',
    category: 'Classic',
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop',
    prompt: 'Apply a clean buzz cut hairstyle, very short uniform length all over, about 1/8 inch, neat and clean military-style buzz cut',
  },
  {
    id: 'crew-cut',
    name: 'Crew Cut',
    description: 'Short sides with slightly longer top',
    category: 'Classic',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
    prompt: 'Apply a classic crew cut hairstyle, short tapered sides with slightly longer hair on top brushed forward, clean and professional look',
  },
  {
    id: 'high-fade',
    name: 'High Fade',
    description: 'Sharp high fade with textured top',
    category: 'Fade',
    image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=500&fit=crop',
    prompt: 'Apply a high fade haircut, skin fade starting high on the sides blending into longer textured hair on top, sharp and modern barbershop high fade',
  },
  {
    id: 'mid-fade',
    name: 'Mid Fade',
    description: 'Balanced mid-level fade transition',
    category: 'Fade',
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=500&fit=crop',
    prompt: 'Apply a mid fade haircut, gradual fade starting at mid-level of the sides, smooth transition from short to longer hair on top, clean mid fade barbershop cut',
  },
  {
    id: 'low-fade',
    name: 'Low Fade',
    description: 'Subtle fade near the neckline',
    category: 'Fade',
    image: 'https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?w=400&h=500&fit=crop',
    prompt: 'Apply a low fade haircut, subtle gradual fade near the neckline and ears, keeping more length on the sides with a clean low taper fade',
  },
  {
    id: 'pompadour',
    name: 'Pompadour',
    description: 'Voluminous swept-back style',
    category: 'Modern',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop',
    prompt: 'Apply a modern pompadour hairstyle, voluminous hair swept back and up on top with shorter faded sides, sleek and polished pompadour style',
  },
  {
    id: 'quiff',
    name: 'Quiff',
    description: 'Textured volume at the front',
    category: 'Modern',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
    prompt: 'Apply a modern quiff hairstyle, longer textured hair at the front swept upward and back with shorter sides, stylish textured quiff with volume',
  },
  {
    id: 'slick-back',
    name: 'Slick Back',
    description: 'Smooth combed-back look',
    category: 'Classic',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
    prompt: 'Apply a slick back hairstyle, hair combed smoothly backwards with a wet look finish, classic gentleman slicked back style with product shine',
  },
  {
    id: 'textured-crop',
    name: 'Textured Crop',
    description: 'Messy textured fringe forward',
    category: 'Textured',
    image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=500&fit=crop',
    prompt: 'Apply a textured crop hairstyle, short choppy textured hair on top with a messy fringe falling forward, modern French crop with textured finish',
  },
  {
    id: 'messy-fringe',
    name: 'Messy Fringe',
    description: 'Casual tousled front fringe',
    category: 'Textured',
    image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop',
    prompt: 'Apply a messy fringe hairstyle, tousled casual hair with a textured fringe falling across the forehead, effortless messy bedhead style',
  },
  {
    id: 'curtains',
    name: 'Curtain Hair',
    description: 'Center-parted flowing style',
    category: 'Long',
    image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=400&h=500&fit=crop',
    prompt: 'Apply curtain hairstyle, medium length hair parted in the center flowing to both sides like curtains, 90s inspired center-part curtain bangs style',
  },
  {
    id: 'man-bun',
    name: 'Man Bun',
    description: 'Long hair tied up on top',
    category: 'Long',
    image: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400&h=500&fit=crop',
    prompt: 'Apply a man bun hairstyle, long hair pulled back and tied into a neat bun at the back/top of the head, clean man bun with some face-framing strands',
  },
];
