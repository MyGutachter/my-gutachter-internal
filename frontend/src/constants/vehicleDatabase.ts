export interface VehicleEntry {
    manufacturer: string;
    model: string;
    period: string;
    audatexNr: string;
    herstellerKat: number;
    aztKat: number;
}

export const VEHICLE_DATABASE: VehicleEntry[] = [
    // ALFA ROMEO
    { manufacturer: 'ALFA ROMEO', model: '156', period: '10/97–', audatexNr: '714', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'ALFA ROMEO', model: 'Spider GTV', period: '05/95–12/04', audatexNr: '715', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'ALFA ROMEO', model: '166', period: '10/98–', audatexNr: '716', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'ALFA ROMEO', model: '147', period: '01/01–', audatexNr: '717', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'ALFA ROMEO', model: 'GT Coupe', period: '01/04–', audatexNr: '718', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'ALFA ROMEO', model: '159', period: '11/05–', audatexNr: '720', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'ALFA ROMEO', model: 'Mito (955/145)', period: '08/08–', audatexNr: '721', herstellerKat: 1, aztKat: 3 },
    { manufacturer: 'ALFA ROMEO', model: 'Brera/Spider', period: '12/05–', audatexNr: '725', herstellerKat: 1, aztKat: 3 },
    { manufacturer: 'ALFA ROMEO', model: 'Giulietta (940)', period: '03/10–', audatexNr: '749', herstellerKat: 2, aztKat: 3 },
    // AUDI
    { manufacturer: 'AUDI', model: 'A1 (8X)', period: '05/10–', audatexNr: '830', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'AUDI', model: 'A2 (8Z)', period: '02/00–08/05', audatexNr: '831', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A3 (8L)', period: '09/96–05/03', audatexNr: '832', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'AUDI', model: 'A3 (8P)', period: '05/03–08/12', audatexNr: '833', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'AUDI', model: 'A3/S3 (8V)', period: '08/12–', audatexNr: '834', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A4 (B5)', period: '11/94–10/00', audatexNr: '835', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'AUDI', model: 'A4 (B6/B7)', period: '11/00–10/07', audatexNr: '836', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A4/S4 (B8)', period: '11/07–', audatexNr: '837', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A5/S5/RS5 (8T)', period: '06/07–', audatexNr: '838', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A6 (C5)', period: '02/97–04/04', audatexNr: '839', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A6/S6/RS6 (C6)', period: '05/04–02/11', audatexNr: '840', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'A6/S6/RS6 (C7)', period: '03/11–', audatexNr: '841', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'AUDI', model: 'A7 (4G)', period: '07/10–', audatexNr: '842', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'AUDI', model: 'A8/S8 (D3)', period: '10/02–01/10', audatexNr: '843', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'AUDI', model: 'A8/S8 (D4)', period: '02/10–', audatexNr: '844', herstellerKat: 4, aztKat: 6 },
    { manufacturer: 'AUDI', model: 'Q3 (8U)', period: '06/11–', audatexNr: '845', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'Q5 (8R)', period: '08/08–', audatexNr: '846', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'Q7 (4L)', period: '03/06–', audatexNr: '847', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'AUDI', model: 'TT (8N)', period: '10/98–06/06', audatexNr: '848', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'AUDI', model: 'TT (8J)', period: '07/06–', audatexNr: '849', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'AUDI', model: 'R8 (42)', period: '04/07–', audatexNr: '850', herstellerKat: 5, aztKat: 6 },
    // BMW
    { manufacturer: 'BMW', model: '1er (E87/E81)', period: '09/04–09/11', audatexNr: '110', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'BMW', model: '1er (F20/F21)', period: '09/11–', audatexNr: '111', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'BMW', model: '2er (F22)', period: '11/13–', audatexNr: '112', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'BMW', model: '3er (E46)', period: '02/98–02/05', audatexNr: '113', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'BMW', model: '3er (E90/E91)', period: '03/05–01/12', audatexNr: '114', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'BMW', model: '3er (F30/F31)', period: '02/12–', audatexNr: '115', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'BMW', model: '4er (F32/F33)', period: '07/13–', audatexNr: '116', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'BMW', model: '5er (E60/E61)', period: '06/03–02/10', audatexNr: '117', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'BMW', model: '5er (F10/F11)', period: '03/10–', audatexNr: '118', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'BMW', model: '6er (F12/F13)', period: '03/11–', audatexNr: '119', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'BMW', model: '7er (F01/F02)', period: '10/08–', audatexNr: '120', herstellerKat: 4, aztKat: 6 },
    { manufacturer: 'BMW', model: 'X1 (E84)', period: '10/09–', audatexNr: '121', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'BMW', model: 'X3 (F25)', period: '11/10–', audatexNr: '122', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'BMW', model: 'X4 (F26)', period: '04/14–', audatexNr: '123', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'BMW', model: 'X5 (E70)', period: '02/07–10/13', audatexNr: '124', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'BMW', model: 'X5 (F15)', period: '11/13–', audatexNr: '125', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'BMW', model: 'X6 (E71)', period: '05/08–', audatexNr: '126', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'BMW', model: 'Z4 (E89)', period: '05/09–', audatexNr: '127', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'BMW', model: 'i3', period: '11/13–', audatexNr: '128', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'BMW', model: 'i8', period: '06/14–', audatexNr: '129', herstellerKat: 5, aztKat: 6 },
    // CITROEN
    { manufacturer: 'CITROEN', model: 'C1', period: '06/05–', audatexNr: '210', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'CITROEN', model: 'C2', period: '09/03–', audatexNr: '211', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'CITROEN', model: 'C3', period: '02/02–', audatexNr: '212', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'CITROEN', model: 'C4', period: '11/04–', audatexNr: '213', herstellerKat: 1, aztKat: 3 },
    { manufacturer: 'CITROEN', model: 'C5', period: '03/01–', audatexNr: '214', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'CITROEN', model: 'DS3', period: '02/10–', audatexNr: '215', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'CITROEN', model: 'DS4', period: '05/11–', audatexNr: '216', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'CITROEN', model: 'DS5', period: '12/11–', audatexNr: '217', herstellerKat: 2, aztKat: 4 },
    // DACIA
    { manufacturer: 'DACIA', model: 'Sandero', period: '06/08–', audatexNr: '220', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'DACIA', model: 'Logan', period: '06/05–', audatexNr: '221', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'DACIA', model: 'Duster', period: '04/10–', audatexNr: '222', herstellerKat: 1, aztKat: 2 },
    // FIAT
    { manufacturer: 'FIAT', model: '500', period: '07/07–', audatexNr: '310', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'FIAT', model: 'Punto', period: '09/99–', audatexNr: '311', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'FIAT', model: 'Panda', period: '09/03–', audatexNr: '312', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'FIAT', model: 'Tipo', period: '05/16–', audatexNr: '313', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'FIAT', model: '500X', period: '09/14–', audatexNr: '314', herstellerKat: 2, aztKat: 3 },
    // FORD
    { manufacturer: 'FORD', model: 'Fiesta', period: '10/08–', audatexNr: '320', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'FORD', model: 'Focus (II)', period: '01/04–', audatexNr: '321', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'FORD', model: 'Focus (III)', period: '01/11–', audatexNr: '322', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'FORD', model: 'Mondeo', period: '06/07–', audatexNr: '323', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'FORD', model: 'Kuga', period: '03/08–', audatexNr: '324', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'FORD', model: 'Galaxy', period: '05/06–', audatexNr: '325', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'FORD', model: 'S-MAX', period: '05/06–', audatexNr: '326', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'FORD', model: 'EcoSport', period: '02/14–', audatexNr: '327', herstellerKat: 1, aztKat: 2 },
    // HONDA
    { manufacturer: 'HONDA', model: 'Jazz', period: '10/08–', audatexNr: '340', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'HONDA', model: 'Civic', period: '01/06–', audatexNr: '341', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HONDA', model: 'CR-V', period: '01/07–', audatexNr: '342', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HONDA', model: 'HR-V', period: '09/15–', audatexNr: '343', herstellerKat: 2, aztKat: 3 },
    // HYUNDAI
    { manufacturer: 'HYUNDAI', model: 'i10', period: '01/08–', audatexNr: '350', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'HYUNDAI', model: 'i20', period: '09/08–', audatexNr: '351', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'HYUNDAI', model: 'i30', period: '03/07–', audatexNr: '352', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'HYUNDAI', model: 'i40', period: '07/11–', audatexNr: '353', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HYUNDAI', model: 'Tucson', period: '08/04–', audatexNr: '354', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HYUNDAI', model: 'Santa Fe', period: '03/06–', audatexNr: '355', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HYUNDAI', model: 'IONIQ', period: '10/16–', audatexNr: '356', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'HYUNDAI', model: 'Kona', period: '11/17–', audatexNr: '357', herstellerKat: 2, aztKat: 3 },
    // JAGUAR
    { manufacturer: 'JAGUAR', model: 'XE', period: '06/15–', audatexNr: '370', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'JAGUAR', model: 'XF', period: '03/08–', audatexNr: '371', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'JAGUAR', model: 'F-Pace', period: '04/16–', audatexNr: '372', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'JAGUAR', model: 'E-Pace', period: '01/18–', audatexNr: '373', herstellerKat: 3, aztKat: 5 },
    // KIA
    { manufacturer: 'KIA', model: 'Picanto', period: '04/04–', audatexNr: '410', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'KIA', model: 'Rio', period: '03/05–', audatexNr: '411', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'KIA', model: 'Ceed', period: '12/06–', audatexNr: '412', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'KIA', model: 'Sportage', period: '09/04–', audatexNr: '413', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'KIA', model: 'Sorento', period: '08/02–', audatexNr: '414', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'KIA', model: 'Stinger', period: '10/17–', audatexNr: '415', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'KIA', model: 'Niro', period: '09/16–', audatexNr: '416', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'KIA', model: 'EV6', period: '08/21–', audatexNr: '417', herstellerKat: 3, aztKat: 4 },
    // MAZDA
    { manufacturer: 'MAZDA', model: '2 (DE)', period: '10/07–', audatexNr: '430', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'MAZDA', model: '3 (BL)', period: '04/09–', audatexNr: '431', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'MAZDA', model: '6 (GJ)', period: '01/13–', audatexNr: '432', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'MAZDA', model: 'CX-3', period: '06/15–', audatexNr: '433', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'MAZDA', model: 'CX-5', period: '04/12–', audatexNr: '434', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'MAZDA', model: 'MX-5 (ND)', period: '09/15–', audatexNr: '435', herstellerKat: 2, aztKat: 3 },
    // MERCEDES-BENZ
    { manufacturer: 'MERCEDES-BENZ', model: 'A-Klasse (W176)', period: '09/12–', audatexNr: '510', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'MERCEDES-BENZ', model: 'B-Klasse (W246)', period: '11/11–', audatexNr: '511', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'MERCEDES-BENZ', model: 'C-Klasse (W204)', period: '03/07–12/13', audatexNr: '512', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'MERCEDES-BENZ', model: 'C-Klasse (W205)', period: '03/14–', audatexNr: '513', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'MERCEDES-BENZ', model: 'E-Klasse (W212)', period: '03/09–02/16', audatexNr: '514', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'MERCEDES-BENZ', model: 'E-Klasse (W213)', period: '03/16–', audatexNr: '515', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'MERCEDES-BENZ', model: 'S-Klasse (W222)', period: '06/13–', audatexNr: '516', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'MERCEDES-BENZ', model: 'CLA (C117)', period: '04/13–', audatexNr: '517', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'MERCEDES-BENZ', model: 'GLA (X156)', period: '12/13–', audatexNr: '518', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'MERCEDES-BENZ', model: 'GLC (X253)', period: '09/15–', audatexNr: '519', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'MERCEDES-BENZ', model: 'GLE (W166)', period: '10/15–', audatexNr: '520', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'MERCEDES-BENZ', model: 'GLS (X166)', period: '11/15–', audatexNr: '521', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'MERCEDES-BENZ', model: 'SLK/SLC (R172)', period: '01/11–', audatexNr: '522', herstellerKat: 3, aztKat: 5 },
    // MINI
    { manufacturer: 'MINI', model: 'One/Cooper (R56)', period: '11/06–11/13', audatexNr: '530', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'MINI', model: 'One/Cooper (F56)', period: '03/14–', audatexNr: '531', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'MINI', model: 'Countryman (R60)', period: '09/10–', audatexNr: '532', herstellerKat: 2, aztKat: 4 },
    { manufacturer: 'MINI', model: 'Clubman (F54)', period: '10/15–', audatexNr: '533', herstellerKat: 2, aztKat: 4 },
    // NISSAN
    { manufacturer: 'NISSAN', model: 'Micra', period: '01/03–', audatexNr: '540', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'NISSAN', model: 'Note', period: '03/06–', audatexNr: '541', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'NISSAN', model: 'Qashqai', period: '02/07–', audatexNr: '542', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'NISSAN', model: 'X-Trail', period: '07/07–', audatexNr: '543', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'NISSAN', model: 'Juke', period: '06/10–', audatexNr: '544', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'NISSAN', model: 'Leaf', period: '12/10–', audatexNr: '545', herstellerKat: 2, aztKat: 3 },
    // OPEL
    { manufacturer: 'OPEL', model: 'Corsa (D)', period: '07/06–', audatexNr: '610', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'OPEL', model: 'Corsa (E)', period: '11/14–', audatexNr: '611', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'OPEL', model: 'Astra (H)', period: '03/04–', audatexNr: '612', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'OPEL', model: 'Astra (J)', period: '10/09–', audatexNr: '613', herstellerKat: 1, aztKat: 3 },
    { manufacturer: 'OPEL', model: 'Astra (K)', period: '10/15–', audatexNr: '614', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'OPEL', model: 'Insignia', period: '11/08–', audatexNr: '615', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'OPEL', model: 'Mokka/Mokka X', period: '06/12–', audatexNr: '616', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'OPEL', model: 'Zafira', period: '07/05–', audatexNr: '617', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'OPEL', model: 'Crossland X', period: '06/17–', audatexNr: '618', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'OPEL', model: 'Grandland X', period: '01/18–', audatexNr: '619', herstellerKat: 2, aztKat: 3 },
    // PEUGEOT
    { manufacturer: 'PEUGEOT', model: '108', period: '05/14–', audatexNr: '620', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'PEUGEOT', model: '208', period: '03/12–', audatexNr: '621', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'PEUGEOT', model: '308', period: '09/07–', audatexNr: '622', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'PEUGEOT', model: '508', period: '11/10–', audatexNr: '623', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'PEUGEOT', model: '2008', period: '03/13–', audatexNr: '624', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'PEUGEOT', model: '3008', period: '06/09–', audatexNr: '625', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'PEUGEOT', model: '5008', period: '10/09–', audatexNr: '626', herstellerKat: 2, aztKat: 3 },
    // PORSCHE
    { manufacturer: 'PORSCHE', model: '911 (991)', period: '12/11–', audatexNr: '630', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'PORSCHE', model: 'Boxster/Cayman (981)', period: '04/12–', audatexNr: '631', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'PORSCHE', model: 'Cayenne (92A)', period: '05/10–', audatexNr: '632', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'PORSCHE', model: 'Macan (95B)', period: '04/14–', audatexNr: '633', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'PORSCHE', model: 'Panamera (970)', period: '04/09–', audatexNr: '634', herstellerKat: 5, aztKat: 6 },
    // RENAULT
    { manufacturer: 'RENAULT', model: 'Twingo', period: '06/07–', audatexNr: '640', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'RENAULT', model: 'Clio (III)', period: '06/05–', audatexNr: '641', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'RENAULT', model: 'Clio (IV)', period: '09/12–', audatexNr: '642', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'RENAULT', model: 'Megane (III)', period: '11/08–', audatexNr: '643', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'RENAULT', model: 'Megane (IV)', period: '01/16–', audatexNr: '644', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'RENAULT', model: 'Scenic (III)', period: '05/09–', audatexNr: '645', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'RENAULT', model: 'Captur', period: '06/13–', audatexNr: '646', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'RENAULT', model: 'Kadjar', period: '06/15–', audatexNr: '647', herstellerKat: 2, aztKat: 3 },
    // SEAT
    { manufacturer: 'SEAT', model: 'Ibiza', period: '04/02–', audatexNr: '660', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SEAT', model: 'Leon', period: '11/05–', audatexNr: '661', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SEAT', model: 'Ateca', period: '06/16–', audatexNr: '662', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SEAT', model: 'Arona', period: '11/17–', audatexNr: '663', herstellerKat: 1, aztKat: 2 },
    // SKODA
    { manufacturer: 'SKODA', model: 'Fabia', period: '01/00–', audatexNr: '670', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SKODA', model: 'Octavia (II)', period: '06/04–', audatexNr: '671', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SKODA', model: 'Octavia (III)', period: '02/13–', audatexNr: '672', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SKODA', model: 'Superb (II)', period: '06/08–', audatexNr: '673', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SKODA', model: 'Superb (III)', period: '06/15–', audatexNr: '674', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SKODA', model: 'Kodiaq', period: '02/17–', audatexNr: '675', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SKODA', model: 'Karoq', period: '11/17–', audatexNr: '676', herstellerKat: 2, aztKat: 3 },
    // SMART
    { manufacturer: 'SMART', model: 'ForTwo (C451)', period: '01/07–', audatexNr: '680', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SMART', model: 'ForFour (W453)', period: '11/14–', audatexNr: '681', herstellerKat: 2, aztKat: 3 },
    // TESLA
    { manufacturer: 'TESLA', model: 'Model S', period: '09/12–', audatexNr: '690', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'TESLA', model: 'Model 3', period: '02/19–', audatexNr: '691', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'TESLA', model: 'Model X', period: '09/16–', audatexNr: '692', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'TESLA', model: 'Model Y', period: '03/21–', audatexNr: '693', herstellerKat: 4, aztKat: 5 },
    // TOYOTA
    { manufacturer: 'TOYOTA', model: 'Aygo', period: '07/05–', audatexNr: '700', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'TOYOTA', model: 'Yaris', period: '01/06–', audatexNr: '701', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'TOYOTA', model: 'Corolla', period: '02/07–', audatexNr: '702', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'TOYOTA', model: 'C-HR', period: '12/16–', audatexNr: '703', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'TOYOTA', model: 'RAV4', period: '03/06–', audatexNr: '704', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'TOYOTA', model: 'Land Cruiser', period: '01/03–', audatexNr: '705', herstellerKat: 3, aztKat: 4 },
    // VOLVO
    { manufacturer: 'VOLVO', model: 'V40', period: '03/12–', audatexNr: '740', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VOLVO', model: 'V60', period: '09/10–', audatexNr: '741', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VOLVO', model: 'V90', period: '09/16–', audatexNr: '742', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'VOLVO', model: 'S60', period: '06/10–', audatexNr: '743', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VOLVO', model: 'S90', period: '09/16–', audatexNr: '744', herstellerKat: 3, aztKat: 5 },
    { manufacturer: 'VOLVO', model: 'XC40', period: '02/18–', audatexNr: '745', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VOLVO', model: 'XC60', period: '10/08–', audatexNr: '746', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VOLVO', model: 'XC90', period: '01/15–', audatexNr: '747', herstellerKat: 4, aztKat: 5 },
    // VW (VOLKSWAGEN)
    { manufacturer: 'VW', model: 'Up!', period: '12/11–', audatexNr: '900', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'VW', model: 'Polo (6R/6C)', period: '06/09–', audatexNr: '901', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'VW', model: 'Golf (VI)', period: '10/08–10/12', audatexNr: '902', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'VW', model: 'Golf (VII)', period: '11/12–', audatexNr: '903', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Golf (VIII)', period: '12/19–', audatexNr: '904', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Passat (B7)', period: '11/10–10/14', audatexNr: '905', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Passat (B8)', period: '11/14–', audatexNr: '906', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Tiguan (I)', period: '10/07–03/16', audatexNr: '907', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Tiguan (II)', period: '04/16–', audatexNr: '908', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'Touareg (II)', period: '04/10–', audatexNr: '909', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'VW', model: 'Touran (II)', period: '09/15–', audatexNr: '910', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'T-Roc', period: '11/17–', audatexNr: '911', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'T-Cross', period: '04/19–', audatexNr: '912', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'VW', model: 'Arteon', period: '06/17–', audatexNr: '913', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'VW', model: 'ID.3', period: '09/20–', audatexNr: '914', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'VW', model: 'ID.4', period: '03/21–', audatexNr: '915', herstellerKat: 3, aztKat: 4 },
    // LAND ROVER
    { manufacturer: 'LAND ROVER', model: 'Range Rover Evoque', period: '09/11–', audatexNr: '420', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'LAND ROVER', model: 'Range Rover Sport', period: '06/05–', audatexNr: '421', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'LAND ROVER', model: 'Range Rover', period: '09/12–', audatexNr: '422', herstellerKat: 5, aztKat: 6 },
    { manufacturer: 'LAND ROVER', model: 'Discovery Sport', period: '02/15–', audatexNr: '423', herstellerKat: 3, aztKat: 5 },
    // JEEP
    { manufacturer: 'JEEP', model: 'Renegade', period: '09/14–', audatexNr: '390', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'JEEP', model: 'Compass', period: '08/17–', audatexNr: '391', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'JEEP', model: 'Grand Cherokee', period: '06/05–', audatexNr: '392', herstellerKat: 3, aztKat: 4 },
    { manufacturer: 'JEEP', model: 'Wrangler', period: '03/07–', audatexNr: '393', herstellerKat: 3, aztKat: 4 },
    // LEXUS
    { manufacturer: 'LEXUS', model: 'IS', period: '10/05–', audatexNr: '425', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'LEXUS', model: 'NX', period: '10/14–', audatexNr: '426', herstellerKat: 4, aztKat: 5 },
    { manufacturer: 'LEXUS', model: 'RX', period: '04/09–', audatexNr: '427', herstellerKat: 4, aztKat: 5 },
    // MITSUBISHI
    { manufacturer: 'MITSUBISHI', model: 'Space Star', period: '05/12–', audatexNr: '535', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'MITSUBISHI', model: 'ASX', period: '02/10–', audatexNr: '536', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'MITSUBISHI', model: 'Outlander', period: '02/07–', audatexNr: '537', herstellerKat: 2, aztKat: 3 },
    // SUBARU
    { manufacturer: 'SUBARU', model: 'Impreza', period: '09/07–', audatexNr: '686', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SUBARU', model: 'Forester', period: '03/08–', audatexNr: '687', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SUBARU', model: 'Outback', period: '09/09–', audatexNr: '688', herstellerKat: 2, aztKat: 3 },
    { manufacturer: 'SUBARU', model: 'XV', period: '03/12–', audatexNr: '689', herstellerKat: 2, aztKat: 3 },
    // SUZUKI
    { manufacturer: 'SUZUKI', model: 'Swift', period: '05/05–', audatexNr: '695', herstellerKat: 1, aztKat: 1 },
    { manufacturer: 'SUZUKI', model: 'Vitara', period: '03/15–', audatexNr: '696', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SUZUKI', model: 'SX4 S-Cross', period: '10/13–', audatexNr: '697', herstellerKat: 1, aztKat: 2 },
    { manufacturer: 'SUZUKI', model: 'Jimny', period: '10/18–', audatexNr: '698', herstellerKat: 1, aztKat: 2 },
];

export function getManufacturers(): string[] {
    return [...new Set(VEHICLE_DATABASE.map(v => v.manufacturer))].sort();
}

export function getModelsByManufacturer(manufacturer: string): VehicleEntry[] {
    return VEHICLE_DATABASE.filter(v => v.manufacturer === manufacturer);
}

export function findVehicle(manufacturer: string, model: string): VehicleEntry | undefined {
    return VEHICLE_DATABASE.find(v => v.manufacturer === manufacturer && v.model === model);
}

export function getPreiskategorie(manufacturer: string, model: string, art: 'AZT' | 'Hersteller'): number | null {
    const v = findVehicle(manufacturer, model);
    if (!v) return null;
    return art === 'AZT' ? v.aztKat : v.herstellerKat;
}
