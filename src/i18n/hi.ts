import type { Messages } from './en'

// Hindi text. Same keys as en.ts; a test checks that none are missing.
export const hi: Messages = {
  app: {
    name: 'ZNirmaan Portal',
    tagline: '3D भू-अभिलेख',
  },
  nav: {
    label: 'मुख्य मेनू',
    search: 'भू-अभिलेख खोजें',
    map: '3D भू-नक्शा',
    register: 'भवन पंजीकरण',
  },
  badge: 'प्रोटोटाइप, डेमो डेटा',
  lang: {
    label: 'भाषा',
    en: 'EN',
    hi: 'हिं',
    enFull: 'English',
    hiFull: 'हिन्दी',
  },
  map: {
    title: '3D भू-नक्शा',
    place: 'शिवाजीनगर, पुणे',
    intro: 'वास्तविक भू-भाग और इमारतों पर शिवाजीनगर का पार्सल नक्शा। प्लॉट की सीमाएँ और 3D स्थान जोड़े जा रहे हैं।',
    loading: '3D शहर लोड हो रहा है…',
    loadError: '3D शहर लोड नहीं हो सका। इंटरनेट कनेक्शन या Cesium टोकन जाँचें।',
    evalToken: 'Cesium का मूल्यांकन टोकन उपयोग हो रहा है। अपना टोकन .env.local में जोड़ें।',
  },
  search: {
    title: 'भू-अभिलेख खोजें',
    intro: 'प्लॉट नंबर, ULPIN या 3D-ULPIN से किसी प्लॉट या फ्लैट को खोजें।',
  },
  register: {
    title: 'भवन पंजीकरण',
    intro: 'किसी भवन के हर फ्लैट, पार्किंग, साझा क्षेत्र और भूमिगत स्थान के लिए 3D-ULPIN जारी करें।',
  },
  card: {
    title: '3D संपत्ति कार्ड',
    intro: 'एक 3D स्थान का अभिलेख: उसका 3D-ULPIN, स्थान, क्षेत्रफल और अधिकार।',
    codeLabel: '3D-ULPIN',
  },
  wip: 'यह स्क्रीन बनाई जा रही है।',
  notFound: {
    title: 'पृष्ठ नहीं मिला',
    back: '3D भू-नक्शा पर जाएँ',
  },
}
