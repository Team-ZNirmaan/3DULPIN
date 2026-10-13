import { useTranslation } from 'react-i18next'
import { SITE } from '../data/site'

// Text that comes from the records (names, places, authorities, document references) is stored in
// English. In Hindi it is shown in Devanagari: names are written the way they are said, and document
// references keep their numbers. Codes, ULPINs and file references stay in Latin letters.

const HI: Record<string, string> = {
  // Places and the building
  'Nirmaan Residency, Tower 1': 'निर्माण रेजीडेंसी, टावर 1',
  'Nirmaan Residency Co-operative Housing Society': 'निर्माण रेजीडेंसी सहकारी गृहनिर्माण संस्था',
  'Ganeshkhind Road': 'गणेशखिंड रोड',
  'Bhamburda (Shivajinagar)': 'भांबुर्डा (शिवाजीनगर)',
  Haveli: 'हवेली',
  Pune: 'पुणे',
  Maharashtra: 'महाराष्ट्र',
  'Pune Municipal Corporation': 'पुणे नगर निगम',
  // Authorities and groups of holders
  'Metro rail authority, Pune': 'मेट्रो रेल प्राधिकरण, पुणे',
  'Municipal water supply department': 'नगर निगम जल आपूर्ति विभाग',
  'All apartment owners, in undivided shares': 'सभी फ्लैट मालिक, अविभाजित हिस्सों में',
  // Flat owners (fictional)
  'Aditi Kulkarni': 'अदिति कुलकर्णी',
  'Rohan Deshpande': 'रोहन देशपांडे',
  'Sneha and Amit Joshi': 'स्नेहा और अमित जोशी',
  'Prakash Patil': 'प्रकाश पाटिल',
  'Meera Iyer': 'मीरा अय्यर',
  'Sameer Shaikh': 'समीर शेख',
  'Kavita and Rajesh Pawar': 'कविता और राजेश पवार',
  'Nikhil Gokhale': 'निखिल गोखले',
  'Ananya Bhosale': 'अनन्या भोसले',
  'Farhan Qureshi': 'फ़रहान क़ुरैशी',
  'Pooja Naik': 'पूजा नाइक',
  'Vikram and Shalini Rao': 'विक्रम और शालिनी राव',
  'Harshad Joglekar': 'हर्षद जोगलेकर',
  'Neha Chavan': 'नेहा चव्हाण',
  'Arjun Menon': 'अर्जुन मेनन',
  'Swati Apte': 'स्वाति आपटे',
  'Omkar Jadhav': 'ओमकार जाधव',
  'Ritu and Sanjay Mehta': 'ऋतु और संजय मेहता',
  'Gauri Phadke': 'गौरी फडके',
  'Imran Pathan': 'इमरान पठान',
  'Shruti Bapat': 'श्रुति बापट',
  'Kunal Sathe': 'कुणाल साठे',
  'Deepa and Mohan Nair': 'दीपा और मोहन नायर',
  'Tejas Karve': 'तेजस कर्वे',
  'Rashmi Inamdar': 'रश्मि इनामदार',
  'Siddharth More': 'सिद्धार्थ मोरे',
  'Priya Ranade': 'प्रिया रानडे',
  'Aniket Shinde': 'अनिकेत शिंदे',
  'Lata and Suresh Gaikwad': 'लता और सुरेश गायकवाड़',
  'Yash Kale': 'यश काले',
  'Madhavi Ketkar': 'माधवी केतकर',
  'Rahul Lele': 'राहुल लेले',
}

/** Document references: the office and the word "Doc." change, the numbers stay. */
const HI_PATTERNS: [RegExp, string][] = [
  [/^Sub-Registrar Haveli (\d+), Doc\. (\S+)$/, 'उप-पंजीयक हवेली $1, दस्तावेज़ $2'],
  [/^Right of user notification (\S+)$/, 'उपयोग अधिकार अधिसूचना $1'],
]

/** Reference numbers like BP/OC/2026/0412 or NR/PARKING/B2-06 are the same in every language. */
const REFERENCE = /^[A-Z0-9]+(\/[A-Z0-9-]+)+$/

/** A record's text in the given language. Returns null when Hindi has no form for it. */
export function localDataOrNull(lang: string, text: string): string | null {
  if (lang !== 'hi' || REFERENCE.test(text)) return text
  if (HI[text]) return HI[text]
  for (const [re, out] of HI_PATTERNS) if (re.test(text)) return text.replace(re, out)
  return null
}

export const localData = (lang: string, text: string) => localDataOrNull(lang, text) ?? text

/** Record text in the current language: `const ld = useLocalData(); ld(space.holder)`. */
export function useLocalData() {
  const { i18n } = useTranslation()
  return (text: string) => localData(i18n.language, text)
}

/** The plot's village, taluka and district, in the current language. */
export const sitePlace = (ld: (s: string) => string) => `${ld(SITE.village)}, ${ld(SITE.taluka)}, ${ld(SITE.district)}`
