export interface SurfSpotOption {
  name: string;
  region: "Basque Country" | "Cantabria" | "Asturias" | "France";
}

export const SURF_SPOTS: SurfSpotOption[] = [
  { name: "Mundaka", region: "Basque Country" },
  { name: "Zarautz", region: "Basque Country" },
  { name: "La Zurriola", region: "Basque Country" },
  { name: "Sopelana", region: "Basque Country" },
  { name: "Barinatxe", region: "Basque Country" },
  { name: "Ereaga", region: "Basque Country" },
  { name: "Meñakoz", region: "Basque Country" },
  { name: "Punta Galea", region: "Basque Country" },
  { name: "Bakio", region: "Basque Country" },
  { name: "Deba", region: "Basque Country" },
  { name: "Getaria / Orrua", region: "Basque Country" },
  { name: "Erretegia", region: "Basque Country" },
  { name: "Somo", region: "Cantabria" },
  { name: "Liencres (Valdearenas)", region: "Cantabria" },
  { name: "Los Locos (Suances)", region: "Cantabria" },
  { name: "El Brusco (Noja)", region: "Cantabria" },
  { name: "Santa Marina", region: "Cantabria" },
  { name: "Laredo", region: "Cantabria" },
  { name: "Sardinero", region: "Cantabria" },
  { name: "Gerra", region: "Cantabria" },
  { name: "Oyambre", region: "Cantabria" },
  { name: "Rodiles", region: "Asturias" },
  { name: "Salinas", region: "Asturias" },
  { name: "Xagó", region: "Asturias" },
  { name: "San Lorenzo (Gijón)", region: "Asturias" },
  { name: "Vega", region: "Asturias" },
  { name: "San Antolín", region: "Asturias" },
  { name: "Santa Marina (Ribadesella)", region: "Asturias" },
  { name: "Tapia de Casariego / Anguileiro", region: "Asturias" },
  { name: "Côte des Basques", region: "France" },
  { name: "Grande Plage", region: "France" },
  { name: "Parlementia", region: "France" },
  { name: "Hendaye", region: "France" }
];

export const SURF_SPOT_NAMES = SURF_SPOTS.map((spot) => spot.name);

export function findSurfSpotByName(value: string): SurfSpotOption | undefined {
  const normalized = value.trim().toLowerCase();
  return SURF_SPOTS.find((spot) => spot.name.toLowerCase() === normalized);
}
