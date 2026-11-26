import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useRef, useState } from "react";

import { formatPrice, formatRent } from "@/lib/format";
import { MAP_MAX_ZOOM, MAP_TILE_ATTRIBUTION, MAP_TILE_SUBDOMAINS, MAP_TILE_URL } from "@/lib/map-config";
import type { PropertySummary } from "@/types/property";

interface PropertyMapProps {
  properties: PropertySummary[];
  activeId: string | null;
  onActivate: (id: string | null) => void;
  onMoveEnd: (bounds: string | null) => void;
  shouldFit: boolean;
  fitKey: string;
  onTileFailure?: () => void;
  emptyView?: { lat: number; lng: number; zoom: number };
}

const VIEWPORT_KEY = "haven:mapViewport";

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

function pillHtml(property: PropertySummary, active: boolean) {
  const label = priceLabel(property).replace(/\.00/, "");
  const background = active ? "#0F1D26" : "#FFFFFF";
  const color = active ? "#FFFFFF" : "#1F2A33";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;padding:5px 9px;border-radius:999px;border:1px solid ${active ? "#0F1D26" : "#DCE0E0"};background:${background};color:${color};font:600 12px/1 Roboto,system-ui,sans-serif;box-shadow:0 2px 8px rgba(15,29,38,.18);transform:scale(${active ? 1.08 : 1});transition:transform .15s ease, background-color .15s ease;">${label}</span>`;
}

function markerIcon(property: PropertySummary, active: boolean) {
  const html = pillHtml(property, active);
  const width = Math.max(58, priceLabel(property).length * 8 + 20);
  return L.divIcon({
    html,
    className: "haven-price-marker",
    iconSize: [width, 30],
    iconAnchor: [width / 2, 30],
  });
}

function popupElement(property: PropertySummary) {
  const wrapper = document.createElement("div");
  wrapper.style.width = "248px";

  const image = property.images.find((item) => item.isCover) ?? property.images[0];
  if (image) {
    const img = document.createElement("img");
    img.src = image.url;
    img.alt = image.alt || property.title;
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.height = "118px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    wrapper.appendChild(img);
  }

  const price = document.createElement("p");
  price.textContent = priceLabel(property);
  price.style.margin = "8px 0 2px";
  price.style.fontWeight = "700";
  price.style.color = "#1F2A33";
  wrapper.appendChild(price);

  const title = document.createElement("p");
  title.textContent = property.title;
  title.style.margin = "0 0 4px";
  title.style.font = "500 13px/1.4 Roboto,system-ui,sans-serif";
  title.style.color = "#5B6770";
  wrapper.appendChild(title);

  const meta = document.createElement("p");
  meta.textContent = [
    property.beds ? `${property.beds} bd` : "",
    property.baths ? `${property.baths} ba` : "",
    property.sizeSqft ? `${property.sizeSqft.toLocaleString()} sq ft` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  meta.style.margin = "0 0 6px";
  meta.style.fontSize = "12px";
  meta.style.color = "#8A97A1";
  wrapper.appendChild(meta);

  const link = document.createElement("a");
  link.href = `/properties/${property.slug}`;
  link.textContent = "View details";
  link.style.fontSize = "13px";
  link.style.fontWeight = "600";
  link.style.color = "#0077B6";
  wrapper.appendChild(link);

  return wrapper;
}

export default function PropertyMap({
  properties,
  activeId,
  onActivate,
  onMoveEnd,
  shouldFit,
  fitKey,
  onTileFailure,
  emptyView,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, { marker: L.Marker; property: PropertySummary }>());
  const callbacksRef = useRef({ onActivate, onMoveEnd });
  const lastFitKeyRef = useRef<string | null>(null);
  const ignoreMovesUntilRef = useRef(0);
  const [tileFailed, setTileFailed] = useState(false);

  callbacksRef.current = { onActivate, onMoveEnd };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    const LocateControl = L.Control.extend({
      onAdd() {
        const button = L.DomUtil.create("button", "leaflet-bar haven-locate-control");
        button.type = "button";
        button.title = "Show my location";
        button.setAttribute("aria-label", "Show my location");
        button.innerHTML =
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>';
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.on(button, "click", () => {
          map.locate({ setView: true, maxZoom: 14 });
        });
        return button;
      },
    });
    new LocateControl({ position: "topright" }).addTo(map);

    let tileErrors = 0;
    const tiles = L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_TILE_ATTRIBUTION,
      subdomains: MAP_TILE_SUBDOMAINS,
      maxZoom: MAP_MAX_ZOOM,
    });
    tiles.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors > 3) {
        setTileFailed(true);
        onTileFailure?.();
      }
    });
    tiles.addTo(map);

    const stored = window.sessionStorage.getItem(VIEWPORT_KEY);
    let restored = false;
    ignoreMovesUntilRef.current = Date.now() + 600;
    if (stored) {
      try {
        const viewport = JSON.parse(stored) as {
          lat: number;
          lng: number;
          zoom: number;
          fitKey?: string;
        };
        if (!viewport.fitKey || viewport.fitKey === fitKey) {
          map.setView([viewport.lat, viewport.lng], viewport.zoom);
          lastFitKeyRef.current = fitKey;
          restored = true;
        }
      } catch {
        /* fall through to the default viewport */
      }
    }
    if (!restored) {
      map.setView([39.8283, -98.5795], 4);
    }

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      chunkedLoading: true,
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    map.on("moveend", () => {
      const center = map.getCenter();
      window.sessionStorage.setItem(
        VIEWPORT_KEY,
        JSON.stringify({ lat: center.lat, lng: center.lng, zoom: map.getZoom(), fitKey }),
      );

      if (Date.now() < ignoreMovesUntilRef.current) return;

      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      callbacksRef.current.onMoveEnd(
        `${sw.lng.toFixed(6)},${sw.lat.toFixed(6)},${ne.lng.toFixed(6)},${ne.lat.toFixed(6)}`,
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();

    properties.forEach((property) => {
      if (!property.location) return;

      const marker = L.marker([property.location.lat, property.location.lng], {
        icon: markerIcon(property, property.id === activeId),
        title: property.title,
        alt: property.title,
        zIndexOffset: property.id === activeId ? 1000 : 0,
      });

      marker.bindPopup(popupElement(property), { closeButton: true, minWidth: 248 });
      marker.on("click", () => callbacksRef.current.onActivate(property.id));
      cluster.addLayer(marker);
      markersRef.current.set(property.id, { marker, property });
    });

    if (shouldFit && properties.length && lastFitKeyRef.current !== fitKey) {
      ignoreMovesUntilRef.current = Date.now() + 900;
      const points = properties
        .filter((property) => property.location)
        .map((property) => [property.location!.lat, property.location!.lng] as [number, number]);

      if (points.length === 1) {
        map.setView(points[0]!, 13);
      } else if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 13 });
      }

      lastFitKeyRef.current = fitKey;
    } else if (
      shouldFit &&
      properties.length === 0 &&
      emptyView &&
      lastFitKeyRef.current !== fitKey
    ) {
      ignoreMovesUntilRef.current = Date.now() + 900;
      map.setView([emptyView.lat, emptyView.lng], emptyView.zoom);
      lastFitKeyRef.current = fitKey;
    }
    // activeId intentionally excluded: icon swaps are handled without rebuilding layers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, shouldFit, fitKey]);

  useEffect(() => {
    markersRef.current.forEach(({ marker, property }) => {
      const active = property.id === activeId;
      marker.setIcon(markerIcon(property, active));
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [activeId, properties]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Map of search results" />
      {tileFailed ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-md border border-line bg-surface/95 px-3 py-2 text-center text-xs text-body shadow-sm">
          Map tiles are unavailable. Results remain available in the list.
        </div>
      ) : null}
      <p className="sr-only">
        Map showing {properties.length} properties. Use the results list for full details.
      </p>
    </div>
  );
}