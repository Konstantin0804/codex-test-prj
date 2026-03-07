import { useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { SURF_SPOTS } from "../shared/surfSpots";

interface Props {
  selectedSpotName: string | null;
  onSelectSpot: (spotName: string) => void;
}

export function SurfSpotsMap({ selectedSpotName, onSelectSpot }: Props) {
  const center = useMemo<[number, number]>(() => [43.45, -3.6], []);

  return (
    <div className="spot-map-panel">
      <MapContainer center={center} zoom={8} scrollWheelZoom className="spot-map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {SURF_SPOTS.map((spot) => {
          const active = spot.name === selectedSpotName;
          return (
            <CircleMarker
              key={spot.name}
              center={[spot.lat, spot.lng]}
              radius={active ? 8 : 5}
              pathOptions={{
                color: active ? "#ea580c" : "#334155",
                fillColor: active ? "#fb923c" : "#94a3b8",
                fillOpacity: 0.9,
                weight: active ? 2 : 1
              }}
              eventHandlers={{ click: () => onSelectSpot(spot.name) }}
            >
              <Popup>
                <strong>{spot.name}</strong>
                <br />
                <small>{spot.region}</small>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
