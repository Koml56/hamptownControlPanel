// prep-default-data.ts - Default prep items data
import type { PrepItem } from './prep-types';

export const getDefaultPrepItems = (): PrepItem[] => [
  // Majoneesit
  {
    id: 1,
    name: 'Valkosipulimajoneesi',
    category: 'majoneesit',
    estimatedTime: '15 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 3,
    recipe: {
      ingredients: '• **1 cup** majoneesi\n• **3-4** valkosipulin kynttä, hienoksi hakattuna\n• **1 rkl** sitruunamehua\n• **Suolaa** ja **mustapippuria** maun mukaan',
      instructions: '1. **Sekoita**: Yhdistä majoneesi ja hienonnettu valkosipuli\n2. **Mausta**: Lisää sitruunamehu, suola ja pippuri\n3. **Anna maustua**: Anna seisoa jääkaapissa vähintään 30 minuuttia\n4. **Tarkista maku**: Säädä mausteita tarpeen mukaan'
    }
  },
  {
    id: 2,
    name: 'Chilimajoneesi',
    category: 'majoneesit',
    estimatedTime: '10 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 4,
    recipe: {
      ingredients: '• **1 cup** majoneesi\n• **2-3 rkl** sriracha-kastiketta\n• **1 tl** hunajaa\n• **1 tl** limemehua',
      instructions: '1. **Yhdistä**: Sekoita majoneesi ja sriracha-kastike\n2. **Makeutus**: Lisää hunaja ja limemehu\n3. **Sekoita hyvin**: Varmista tasainen sekoitus\n4. **Maista ja säädä**: Lisää chilimakua tai hunajaa tarpeen mukaan'
    }
  },
  { 
    id: 3, 
    name: 'Kevätsipulimajoneesi', 
    category: 'majoneesit', 
    estimatedTime: '10 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 3, 
    recipe: null 
  },
  { 
    id: 4, 
    name: 'Bad Santa -majoneesi', 
    category: 'majoneesit', 
    estimatedTime: '15 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 5, 
    recipe: null 
  },
  { 
    id: 5, 
    name: 'Manse-majoneesi', 
    category: 'majoneesit', 
    estimatedTime: '12 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 4, 
    recipe: null 
  },

  // Proteiinit
  {
    id: 6,
    name: 'Marinoitu kana',
    category: 'proteiinit',
    estimatedTime: '30 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 2,
    recipe: {
      ingredients: '• **4** kananfileetä\n• **1/4 cup** oliiviöljyä\n• **2 rkl** sitruunamehua\n• **3** valkosipulin kynttä, murskattuna\n• **1 tl** kuivattuja yrttejä\n• **Suolaa** ja **pippuria**',
      instructions: '1. **Valmista marinade**: Sekoita öljy, sitruunamehu, valkosipuli ja yrtit\n2. **Mausta kana**: Hiero kanaan suolaa ja pippuria\n3. **Marinoi**: Laita kana marinadiin 2-4 tunniksi\n4. **Huoneenlämpö**: Anna tulla huoneenlämpöön ennen kypsennystä'
    }
  },
  {
    id: 7,
    name: 'Lihapullat',
    category: 'proteiinit',
    estimatedTime: '45 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 3,
    recipe: {
      ingredients: '• **500g** jauhelihaa\n• **1** sipuli, hienoksi hakattuna\n• **1** muna\n• **1/2 cup** korppujauhoja\n• **Suolaa**, **pippuria**, **mausteet**',
      instructions: '1. **Sekoita**: Yhdistä kaikki ainekset kulhossa\n2. **Muotoile**: Tee tasakokoisia palloja\n3. **Kypsennä**: Paista pannulla tai uunissa\n4. **Valmista**: Kypsyys 65°C sisälämpötila'
    }
  },

  // Kasvikset
  { 
    id: 8, 
    name: 'Tuoreet tomaatit (leikattu)', 
    category: 'kasvikset', 
    estimatedTime: '15 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 1, 
    recipe: null 
  },
  { 
    id: 9, 
    name: 'Kevätsipuli', 
    category: 'kasvikset', 
    estimatedTime: '10 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 2, 
    recipe: null 
  },

  // Marinointi & pikkelöinti
  {
    id: 10,
    name: 'Marinoitu punasipuli',
    category: 'marinointi',
    estimatedTime: '20 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 4,
    recipe: {
      ingredients: '• **2** punasipulia, ohuksi viipaloiduna\n• **1/2 cup** valkoviinietikkaa\n• **2 rkl** sokeria\n• **1 tl** suolaa\n• **1** laakerinlehti',
      instructions: '1. **Liuota**: Sekoita etikka, sokeri ja suola\n2. **Sipulit**: Laita viipaloidut sipulit kulhoon\n3. **Kaada liuos**: Kaada kuuma liuos sipulien päälle\n4. **Anna marinoitua**: Vähintään 30 minuuttia ennen käyttöä'
    }
  },
  { 
    id: 11, 
    name: 'Pikkelöity punasipuli', 
    category: 'marinointi', 
    estimatedTime: '25 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 5, 
    recipe: null 
  },
  { 
    id: 12, 
    name: 'Pikkelöity tomaatti', 
    category: 'marinointi', 
    estimatedTime: '20 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 4, 
    recipe: null 
  },
  { 
    id: 13, 
    name: 'Pikkelöity kurkku', 
    category: 'marinointi', 
    estimatedTime: '20 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 4, 
    recipe: null 
  },
  { 
    id: 14, 
    name: 'Paholaisen hillo', 
    category: 'marinointi', 
    estimatedTime: '30 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 7, 
    recipe: null 
  },
  { 
    id: 15, 
    name: 'Hapan omena -hillo', 
    category: 'marinointi', 
    estimatedTime: '35 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 7, 
    recipe: null 
  },
  { 
    id: 16, 
    name: 'Marinoitu punakaali', 
    category: 'marinointi', 
    estimatedTime: '25 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 5, 
    recipe: null 
  },

  // Kastikkeet
  {
    id: 17,
    name: 'Konjakki-sinappi',
    category: 'kastikkeet',
    estimatedTime: '15 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 6,
    recipe: {
      ingredients: '• **1/2 cup** dijon-sinappia\n• **3 rkl** konjakkia\n• **1 rkl** hunajaa\n• **1 tl** valkosipulijauhetta',
      instructions: '1. **Sekoita**: Yhdistä sinappi ja konjakki\n2. **Makeutus**: Lisää hunaja ja valkosipulijauhe\n3. **Sekoita hyvin**: Varmista tasainen sekoitus\n4. **Anna vetäytyä**: Säilytä jääkaapissa käyttöön asti'
    }
  },
  { 
    id: 18, 
    name: 'BBQ-hunaja-sinappi', 
    category: 'kastikkeet', 
    estimatedTime: '12 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 5, 
    recipe: null 
  },

  // Muut
  { 
    id: 19, 
    name: 'Täytä kylmävitriini', 
    category: 'muut', 
    estimatedTime: '20 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 1, 
    recipe: null 
  },
  { 
    id: 20, 
    name: 'Vaihda öljy', 
    category: 'muut', 
    estimatedTime: '15 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 7, 
    recipe: null 
  },
  { 
    id: 21, 
    name: 'Asiakasjuomakaappi kuntoon', 
    category: 'muut', 
    estimatedTime: '25 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 2, 
    recipe: null 
  },
  { 
    id: 22, 
    name: 'Alkoholijuomakaappi kuntoon', 
    category: 'muut', 
    estimatedTime: '20 min', 
    isCustom: false, 
    hasRecipe: false, 
    frequency: 3, 
    recipe: null 
  },
  {
    id: 23,
    name: 'Keitä smash-perunat',
    category: 'muut',
    estimatedTime: '45 min',
    isCustom: false,
    hasRecipe: true,
    frequency: 2,
    recipe: {
      ingredients: '• **1kg** pieniä perunoita\n• **Suolaa** keitinveteen\n• **Oliiviöljyä**\n• **Rosmariinia**\n• **Merisuolaa**\n• **Mustapippuria**',
      instructions: '1. **Keitä**: Keitä perunat kuoressa suolavedessä kypsiksi\n2. **Valuta**: Anna valua ja jäähtyä hieman\n3. **Smash**: Litistä perunat haarukalla kevyesti\n4. **Paista**: Paista uunissa 200°C öljyssä ja mausteissa kultaisiksi'
    }
  }
];
