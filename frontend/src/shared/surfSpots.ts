export interface SurfSpotOption {
  name: string;
  region: "Basque Country" | "Cantabria" | "Asturias" | "France";
  lat: number;
  lng: number;
}

export const SURF_SPOTS: SurfSpotOption[] = [
  { name: "Mundaka", region: "Basque Country", lat: 43.4075, lng: -2.6941 },
  { name: "Zarautz", region: "Basque Country", lat: 43.2924, lng: -2.17 },
  { name: "La Zurriola", region: "Basque Country", lat: 43.3253, lng: -1.9745 },
  { name: "Sopelana", region: "Basque Country", lat: 43.3946, lng: -3.0169 },
  { name: "Barinatxe", region: "Basque Country", lat: 43.3821, lng: -3.0075 },
  { name: "Ereaga", region: "Basque Country", lat: 43.3514, lng: -3.0143 },
  { name: "Meñakoz", region: "Basque Country", lat: 43.3978, lng: -2.9898 },
  { name: "Punta Galea", region: "Basque Country", lat: 43.373, lng: -3.036 },
  { name: "Bakio", region: "Basque Country", lat: 43.4275, lng: -2.8106 },
  { name: "Deba", region: "Basque Country", lat: 43.2943, lng: -2.3533 },
  { name: "Getaria / Orrua", region: "Basque Country", lat: 43.3033, lng: -2.2033 },
  { name: "Erretegia", region: "Basque Country", lat: 43.3045, lng: -2.1478 },
  { name: "Somo", region: "Cantabria", lat: 43.455, lng: -3.7313 },
  { name: "Liencres (Valdearenas)", region: "Cantabria", lat: 43.4624, lng: -3.9464 },
  { name: "Los Locos (Suances)", region: "Cantabria", lat: 43.425, lng: -4.0437 },
  { name: "El Brusco (Noja)", region: "Cantabria", lat: 43.4892, lng: -3.5235 },
  { name: "Santa Marina", region: "Cantabria", lat: 43.4517, lng: -3.7164 },
  { name: "Laredo", region: "Cantabria", lat: 43.4112, lng: -3.418 },
  { name: "Sardinero", region: "Cantabria", lat: 43.4721, lng: -3.7877 },
  { name: "Gerra", region: "Cantabria", lat: 43.3893, lng: -4.3975 },
  { name: "Oyambre", region: "Cantabria", lat: 43.3944, lng: -4.3729 },
  { name: "Rodiles", region: "Asturias", lat: 43.5423, lng: -5.3823 },
  { name: "Salinas", region: "Asturias", lat: 43.5693, lng: -5.9675 },
  { name: "Xagó", region: "Asturias", lat: 43.6027, lng: -5.8844 },
  { name: "San Lorenzo (Gijón)", region: "Asturias", lat: 43.5395, lng: -5.6615 },
  { name: "Vega", region: "Asturias", lat: 43.4604, lng: -5.0508 },
  { name: "San Antolín", region: "Asturias", lat: 43.4313, lng: -4.8636 },
  { name: "Santa Marina (Ribadesella)", region: "Asturias", lat: 43.4635, lng: -5.0563 },
  { name: "Tapia de Casariego / Anguileiro", region: "Asturias", lat: 43.5674, lng: -6.9452 },
  { name: "Côte des Basques", region: "France", lat: 43.4795, lng: -1.5681 },
  { name: "Grande Plage", region: "France", lat: 43.4832, lng: -1.5593 },
  { name: "Parlementia", region: "France", lat: 43.4227, lng: -1.6092 },
  { name: "Hendaye", region: "France", lat: 43.3726, lng: -1.7744 }
];

export const SURF_SPOT_NAMES = SURF_SPOTS.map((spot) => spot.name);

export function findSurfSpotByName(value: string): SurfSpotOption | undefined {
  const normalized = value.trim().toLowerCase();
  return SURF_SPOTS.find((spot) => spot.name.toLowerCase() === normalized);
}
