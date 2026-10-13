// English text. Every visible label comes from here or from hi.ts, never hard-coded in components.
export const en = {
  app: {
    name: 'ZNirmaan Portal',
    tagline: '3D Land Records',
  },
  nav: {
    label: 'Main menu',
    search: 'Search land records',
    map: '3D Bhu-Naksha',
    register: 'Register a building',
  },
  badge: 'Prototype, demo data',
  lang: {
    label: 'Language',
    en: 'EN',
    hi: 'हिं',
    enFull: 'English',
    hiFull: 'हिन्दी',
  },
  map: {
    title: '3D Bhu-Naksha',
    place: 'Shivajinagar, Pune',
    intro: 'Parcel map of Shivajinagar on real terrain and buildings. Plot outlines and 3D spaces are being added.',
    loading: 'Loading the 3D city…',
    loadError: 'The 3D city could not load. Check the internet connection or the Cesium token.',
    evalToken: "Using Cesium's evaluation token. Add your own token in .env.local.",
  },
  search: {
    title: 'Search land records',
    intro: 'Find a plot or a flat by its plot number, ULPIN or 3D-ULPIN.',
  },
  register: {
    title: 'Register a building',
    intro: 'Issue 3D-ULPINs for every flat, parking bay, common area and underground space of a building.',
  },
  card: {
    title: '3D Property Card',
    intro: 'The record of one 3D space: its 3D-ULPIN, location, area and rights.',
    codeLabel: '3D-ULPIN',
  },
  wip: 'This screen is being built.',
  notFound: {
    title: 'Page not found',
    back: 'Go to 3D Bhu-Naksha',
  },
} as const

type Strings<T> = { readonly [K in keyof T]: T[K] extends string ? string : Strings<T[K]> }
export type Messages = Strings<typeof en>
