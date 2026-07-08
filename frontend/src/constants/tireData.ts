export const TIRE_BRANDS = [
  'Achilles', 'Aeolus', 'Alliance', 'Altenzo', 'Apollo', 'Arivo', 'Armstrong', 'Atlas', 'Atturo',
  'Barum', 'BFGoodrich', 'Bridgestone', 'Ceat', 'Cheng Shin (CST)', 'Continental', 'Cooper',
  'Dayton', 'Debica', 'Delinte', 'Dunlop', 'Duraturn', 'Evergreen', 'Falken', 'Federal',
  'Firestone', 'Fortuna', 'Fulda', 'General Tire', 'Gislaved', 'Goodyear', 'Goodride',
  'GT Radial', 'Hankook', 'Heidenau', 'Hercules', 'Imperial', 'Jinyu', 'Kenda', 'Kleber',
  'Kumho', 'Landsail', 'Laufenn', 'Leao', 'Linglong', 'Mabor', 'Marangoni', 'Marshal',
  'Mastercraft', 'Matador', 'Maxxis', 'Michelin', 'Minerva', 'Nankang', 'Nexen', 'Nokian',
  'Ovation', 'Petlas', 'Pirelli', 'Premiorri', 'Radar', 'Riken', 'Roadstone', 'Rotalla',
  'Sailun', 'Sava', 'Semperit', 'Sonar', 'Sumitomo', 'Sunny', 'Taurus', 'Tigar', 'Toyo',
  'Uniroyal', 'Vredestein', 'Wanli', 'Westlake', 'Yokohama'
];

export const TIRE_MODELS: Record<string, { S: string[], W: string[], A: string[] }> = {
  Michelin: {
    S: ['Pilot Sport 5','Pilot Sport S 5','Pilot Sport 5 energy','Pilot Sport EV','Pilot Sport 4','Pilot Sport Cup 2 R','Pilot Sport Cup 2 Connect','Primacy 4','Primacy 4+','Primacy 5','Primacy 5 energy','e.Primacy','e.Primacy 2','Pilot Super Sport'],
    W: ['Alpin 7','Pilot Alpin 5','Alpin 5'],
    A: ['CrossClimate 2','CrossClimate 3','CrossClimate 3 Sport'],
  },
  Continental: {
    S: ['PremiumContact 7','EcoContact 7','EcoContact 7 S','EcoContact 6','EcoContact 6 Q','UltraContact NXT'],
    W: ['WinterContact TS 870','WinterContact TS 870 P'],
    A: ['AllSeasonContact','AllSeasonContact 2'],
  },
  Goodyear: {
    S: ['Eagle F1 Asymmetric 6','EfficientGrip Performance 2','EfficientGrip Cargo','EfficientGrip Cargo 2'],
    W: ['UltraGrip Performance 3','UltraGrip Cargo'],
    A: ['Vector 4Seasons Gen-2','Vector 4Seasons Gen-3','Vector 4Seasons Cargo'],
  },
  Bridgestone: {
    S: ['Potenza Sport','Turanza 6','Dueler','Alenza 001'],
    W: ['Blizzak LM005'],
    A: ['Weather Control A005','Weather Control A005 EVO','Turanza All Season 6','Duravis All Season EVO','Duravis All Season'],
  },
  Pirelli: {
    S: ['P Zero','Powergy 2','Scorpion Summer 3'],
    W: ['Winter Sottozero 3','Cinturato Winter 3','Scorpion Winter 2'],
    A: ['Cinturato All Season SF 3','Scorpion All Season SF 3','Scorpion Zero All Season'],
  },
  Hankook: {
    S: ['Ventus S1 evo3','Ventus S1 evo3 ev','Ventus evo','iON evo'],
    W: ['Winter i*cept evo3','Winter i*cept evo3 X','Winter i*cept iZ3','Winter i*cept iZ3 X','Winter i*cept evo 2 SUV'],
    A: ['Kinergy 4S2','Dynapro AT2 RF11','Dynapro AT2 Xtreme'],
  },
  Yokohama: {
    S: ['ADVAN Sport V107','BluEarth-GT AE51'],
    W: ['BluEarth*Winter V906','BluEarth*Winter V906 SUV'],
    A: ['BluEarth-Van All Season RY61','GEOLANDAR CV 4S G061','GEOLANDAR A/T G015'],
  },
  Falken: {
    S: ['Azenis FK520','Azenis RS820','e.ZIEX'],
    W: ['Eurowinter HS02','Eurowinter HS02 Pro'],
    A: ['EuroAll Season AS210','EuroAll Season AS220','EuroAll Season AS220 Pro'],
  },
};
