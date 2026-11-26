import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

import { MAP_MAX_ZOOM, MAP_TILE_ATTRIBUTION, MAP_TILE_SUBDOMAINS, MAP_TILE_URL } from "@/lib/map-config";

export interface LocationMapProps {
  lat: number;
  lng: number;
  title: string;
  address: string;
  approximate?: boolean;
  className?: string;
}

const PIN_HTML = `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:#0077B6;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(15,29,38,.35)"></span>`;

export function LocationMap({
  lat,
  lng,
  title,
  address,
  approximate = false,
  className,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tileFailed, setTileFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });

    // Avoid hijacking page scroll until the user interacts with the map.
    map.scrollWheelZoom.disable();
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    let tileErrors = 0;
    const tiles = L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      subdomains: MAP_TILE_SUBDOMAINS,
      maxZoom: MAP_MAX_ZOOM,
    });
    tiles.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors > 3) setTileFailed(true);
    });
    tiles.addTo(map);

    // Div icon avoids Leaflet's default marker image paths, which break under Vite.
    const icon = L.divIcon({
      html: PIN_HTML,
      className: "haven-location-pin",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([lat, lng], { icon, title, alt: title }).addTo(map);

    const popup = document.createElement("div");
    popup.style.width = "220px";

    const heading = document.createElement("p");
    heading.textContent = title;
    heading.style.margin = "0 0 4px";
    heading.style.fontWeight = "600";
    heading.style.fontSize = "13px";
    heading.style.color = "#1F2A33";
    popup.appendChild(heading);

    const addressLine = document.createElement("p");
    addressLine.textContent = address;
    addressLine.style.margin = "0";
    addressLine.style.fontSize = "12px";
    addressLine.style.color = "#5F6B73";
    popup.appendChild(addressLine);

    if (approximate) {
      const note = document.createElement("p");
      note.textContent = "Approximate location";
      note.style.margin = "4px 0 0";
      note.style.fontSize = "11px";
      note.style.color = "#8A97A1";
      popup.appendChild(note);
    }

    marker.bindPopup(popup, { minWidth: 220 });

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [lat, lng, title, address, approximate]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="h-64 w-full"
        aria-label={`Map of ${title}`}
        role="application"
      />
      {tileFailed ? (
        <p className="border-t border-line bg-surface px-4 py-2 text-xs text-body">
          Map tiles are unavailable right now. Use “Open in maps” below.
        </p>
      ) : null}
      <span className="sr-only">
        Interactive map centered on {address}. A marker is placed at the property location.
      </span>
    </div>
  );
}