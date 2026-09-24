import { ringCentroid } from '@/domain/geo'
import type { Bilingual } from '@/domain/types'
import { useData } from '@/store/data'
import { useExplorer } from '@/store/explorer'

export interface DemoStep {
  title: Bilingual
  talk: Bilingual
  path: string
  run?: () => void
}

const unit = (label: string) => useData.getState().units.find((u) => u.label === label)

function focusExplorer(label?: string, opts: { underground?: boolean; level?: string; color?: 'class' | 'tier' | 'status' | 'issues' } = {}) {
  const ex = useExplorer.getState()
  ex.resetExplorer()
  if (opts.color) ex.setColorMode(opts.color)
  if (opts.level) ex.setLevel('only', opts.level)
  if (opts.underground) ex.setUndergroundView(true)
  const data = useData.getState()
  const u = label ? unit(label) : undefined
  data.select(u?.code)
  const target = u ?? data.units.find((x) => x.id === 'U-B-7')!
  const [lon, lat] = ringCentroid(target.ring)
  data.flyTo({ lon, lat, height: label ? (target.zMin + target.zMax) / 2 : 9 })
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: { en: 'The problem', hi: 'समस्या' },
    talk: {
      en: 'One 2D parcel, one ULPIN. The tower on it holds 20 flats and 30 parking bays, and a metro tunnel runs underneath — none of them has an identity today.',
      hi: 'एक 2D पार्सल, एक ULPIN। उस पर बने टावर में 20 फ़्लैट, 30 पार्किंग हैं और नीचे मेट्रो सुरंग है — आज इनमें से किसी की पहचान नहीं है।',
    },
    path: '/app/explorer',
    run: () => focusExplorer(undefined, { color: 'class' }),
  },
  {
    title: { en: 'Parent parcel & ULPIN', hi: 'मूल पार्सल एवं ULPIN' },
    talk: {
      en: 'We keep the existing 14-character ULPIN exactly as it is. Plot 7 becomes a surface-rights envelope — the parent of every volume inside it.',
      hi: 'मौजूदा 14-अक्षरीय ULPIN को जैसा है वैसा रखते हैं। प्लॉट 7 एक सतही अधिकार आवरण बनता है — भीतर के हर आयतन का मूल।',
    },
    path: '/app/explorer',
    run: () => {
      focusExplorer()
      const s = useData.getState().units.find((u) => u.type === 'S' && u.parcelId === 'PCL-7')
      useData.getState().select(s?.code)
    },
  },
  {
    title: { en: 'Drone survey → pipeline', hi: 'ड्रोन सर्वेक्षण → पाइपलाइन' },
    talk: {
      en: 'NAKSHA-style drone imagery, CORS control points, the AutoDCR plan and NGDRS deeds go through automated QC, photogrammetry and the AI modules. No LiDAR needed.',
      hi: 'NAKSHA-शैली ड्रोन छवियाँ, CORS नियंत्रण बिंदु, AutoDCR नक्शा एवं NGDRS विलेख स्वचालित QC, फ़ोटोग्रामेट्री एवं AI मॉड्यूल से गुज़रते हैं। LiDAR आवश्यक नहीं।',
    },
    path: '/app/pipeline',
    run: () => void useData.getState().runPipeline(),
  },
  {
    title: { en: 'M1 · Building extraction', hi: 'M1 · भवन निष्कर्षण' },
    talk: {
      en: 'Roof outlines overstate the building because of chajjas. Slicing the 3D mesh just above ground gives the true wall line — 0.60 m tighter.',
      hi: 'छज्जों के कारण छत रूपरेखा भवन से बड़ी होती है। भूमि के ठीक ऊपर 3D मेश काटने से वास्तविक दीवार रेखा मिलती है — 0.60 मी कम।',
    },
    path: '/app/analysis?tab=m1',
  },
  {
    title: { en: 'M2 · Floor segmentation', hi: 'M2 · मंज़िल विभाजन' },
    talk: {
      en: 'Facade detections and DSM height agree on five floors; the sanctioned plan has four. Floor 5 becomes provisional and is referred to the ULB.',
      hi: 'फ़साड पहचान एवं DSM ऊँचाई पाँच मंज़िलों पर सहमत हैं; स्वीकृत नक्शे में चार हैं। मंज़िल 5 अनंतिम होकर नगरीय निकाय को भेजी जाती है।',
    },
    path: '/app/analysis?tab=m2',
  },
  {
    title: { en: 'M3 · Plan → legal volumes', hi: 'M3 · नक्शा → विधिक आयतन' },
    talk: {
      en: 'The AutoDCR drawing is read with rules. A room–door graph groups rooms into flats — 16 found, 16 in the RERA filing — then each is extruded between slabs.',
      hi: 'AutoDCR नक्शा नियमों से पढ़ा जाता है। कक्ष–द्वार ग्राफ़ कक्षों को फ़्लैटों में समूहित करता है — 16 मिले, RERA में 16 — फिर प्रत्येक को स्लैबों के बीच ठोस बनाया जाता है।',
    },
    path: '/app/analysis?tab=m3',
  },
  {
    title: { en: 'M4 · Conflicts caught before construction', hi: 'M4 · निर्माण से पहले टकराव' },
    talk: {
      en: 'Basement 2 sits 0.60 m inside the metro tunnel’s protection zone. The system blocks minting until an official records a restriction.',
      hi: 'बेसमेंट 2 मेट्रो सुरंग सुरक्षा क्षेत्र में 0.60 मी भीतर है। अधिकारी द्वारा प्रतिबंध दर्ज होने तक जारीकरण रोका जाता है।',
    },
    path: '/app/explorer',
    run: () => focusExplorer('Parking bay B2-01', { underground: true, level: 'B2', color: 'issues' }),
  },
  {
    title: { en: 'Standard 3D-ULPIN', hi: 'मानक 3D-ULPIN' },
    talk: {
      en: 'Parent ULPIN, then type, tower, level, unit and a check character. A single mistyped digit is caught at the registration counter.',
      hi: 'मूल ULPIN, फिर प्रकार, टावर, स्तर, इकाई एवं जाँच अक्षर। एक भी गलत अंक पंजीकरण काउंटर पर पकड़ा जाता है।',
    },
    path: `/app/registry`,
    run: () => {
      const u = unit('Flat 402')
      if (u) window.location.hash = `#/app/registry?q=${encodeURIComponent(u.code)}`
    },
  },
  {
    title: { en: 'M6 · Deed linking & double sale', hi: 'M6 · विलेख जोड़ एवं दोहरी बिक्री' },
    talk: {
      en: 'A scanned deed is read, matched to Flat 402 — and the system notices the flat was already sold in 2019. The mutation is held.',
      hi: 'स्कैन विलेख पढ़ा जाकर फ़्लैट 402 से मिलाया जाता है — और प्रणाली पकड़ती है कि फ़्लैट 2019 में पहले ही बिक चुका है। नामांतरण रोका जाता है।',
    },
    path: '/app/deeds',
  },
  {
    title: { en: 'Citizen: 3D Property Card', hi: 'नागरिक: 3D संपत्ति कार्ड' },
    talk: {
      en: 'The owner sees exactly which volume they own, the parking allotted, any mortgage — and anyone can verify the card by QR, even offline.',
      hi: 'स्वामी देखता है कि उसका आयतन कौन-सा है, आवंटित पार्किंग, कोई बंधक — और कोई भी QR से कार्ड सत्यापित कर सकता है, ऑफ़लाइन भी।',
    },
    path: '/app/citizen',
    run: () => {
      const u = unit('Flat 204')
      if (u) window.location.hash = `#/app/citizen?code=${encodeURIComponent(u.code)}`
    },
  },
  {
    title: { en: 'Governance at a glance', hi: 'शासन एक नज़र में' },
    talk: {
      en: 'Coverage, accuracy tiers, flags and revenue impact for the ward. Built on data DoLR already collects, federated by state, fully open source.',
      hi: 'वार्ड हेतु कवरेज, सटीकता टियर, चिह्नित मामले एवं राजस्व प्रभाव। DoLR द्वारा पहले से एकत्र डेटा पर आधारित, राज्यवार संघीय, पूर्णतः ओपन सोर्स।',
    },
    path: '/app/dashboard',
  },
]
