export interface SurfSpotOption {
  name: string;
  region: "Страна Басков" | "Кантабрия" | "Астурия" | "Франция";
}

export const SURF_SPOTS: SurfSpotOption[] = [
  { name: "Mundaka", region: "Страна Басков" },
  { name: "Zarautz", region: "Страна Басков" },
  { name: "La Zurriola", region: "Страна Басков" },
  { name: "Sopelana", region: "Страна Басков" },
  { name: "Barinatxe", region: "Страна Басков" },
  { name: "Ereaga", region: "Страна Басков" },
  { name: "Meñakoz", region: "Страна Басков" },
  { name: "Punta Galea", region: "Страна Басков" },
  { name: "Bakio", region: "Страна Басков" },
  { name: "Deba", region: "Страна Басков" },
  { name: "Getaria / Orrua", region: "Страна Басков" },
  { name: "Erretegia", region: "Страна Басков" },
  { name: "Somo", region: "Кантабрия" },
  { name: "Liencres (Valdearenas)", region: "Кантабрия" },
  { name: "Los Locos (Suances)", region: "Кантабрия" },
  { name: "El Brusco (Noja)", region: "Кантабрия" },
  { name: "Santa Marina", region: "Кантабрия" },
  { name: "Laredo", region: "Кантабрия" },
  { name: "Sardinero", region: "Кантабрия" },
  { name: "Gerra", region: "Кантабрия" },
  { name: "Oyambre", region: "Кантабрия" },
  { name: "Rodiles", region: "Астурия" },
  { name: "Salinas", region: "Астурия" },
  { name: "Xagó", region: "Астурия" },
  { name: "San Lorenzo (Gijón)", region: "Астурия" },
  { name: "Vega", region: "Астурия" },
  { name: "San Antolín", region: "Астурия" },
  { name: "Santa Marina (Ribadesella)", region: "Астурия" },
  { name: "Tapia de Casariego / Anguileiro", region: "Астурия" },
  { name: "Côte des Basques", region: "Франция" },
  { name: "Grande Plage", region: "Франция" },
  { name: "Parlementia", region: "Франция" },
  { name: "Hendaye", region: "Франция" }
];

export const SURF_SPOT_NAMES = SURF_SPOTS.map((spot) => spot.name);

export function findSurfSpotByName(value: string): SurfSpotOption | undefined {
  const normalized = value.trim().toLowerCase();
  return SURF_SPOTS.find((spot) => spot.name.toLowerCase() === normalized);
}
