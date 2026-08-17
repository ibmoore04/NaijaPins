import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapBounds, MapPin as MapPinType } from '@/types/database';
import { createSocialPinIcon } from './SocialMapMarker';

// Fix Leaflet default icon issues in bundled React app
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface MapBoundsListenerProps {
  onBoundsChange: (bounds: MapBounds) => void;
}

const MapBoundsListener: React.FC<MapBoundsListenerProps> = ({ onBoundsChange }) => {
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChangeRef.current({
        min_lat: b.getSouth(),
        max_lat: b.getNorth(),
        min_lng: b.getWest(),
        max_lng: b.getEast(),
      });
    },
    zoomend: () => {
      const b = map.getBounds();
      onBoundsChangeRef.current({
        min_lat: b.getSouth(),
        max_lat: b.getNorth(),
        min_lng: b.getWest(),
        max_lng: b.getEast(),
      });
    },
  });

  // Initial bounds check on mount only
  useEffect(() => {
    if (!map) return;
    const b = map.getBounds();
    onBoundsChangeRef.current({
      min_lat: b.getSouth(),
      max_lat: b.getNorth(),
      min_lng: b.getWest(),
      max_lng: b.getEast(),
    });
  }, [map]);

  return null;
};

/**
 * Controller to programmatically pan/zoom map when center/zoom changes or when fitting pins
 */
const MapCenterController: React.FC<{
  center?: [number, number];
  zoom?: number;
  autoFitPins?: MapPinType[];
}> = ({ center, zoom, autoFitPins }) => {
  const map = useMap();
  const prevCenterRef = useRef<string>('');

  useEffect(() => {
    if (autoFitPins && autoFitPins.length > 0) {
      const latLngs = autoFitPins.map((p) => [p.latitude, p.longitude] as [number, number]);
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      }
      return;
    }

    if (center) {
      const key = `${center[0].toFixed(4)}-${center[1].toFixed(4)}-${zoom || 12}`;
      if (prevCenterRef.current !== key) {
        prevCenterRef.current = key;
        map.setView(center, zoom || map.getZoom(), { animate: true });
      }
    }
  }, [map, center, zoom, autoFitPins]);

  return null;
};

/**
 * High-performance MarkerCluster Group for Social & Standard Pins
 */
const MarkerClusters: React.FC<{
  pins: MapPinType[];
  selectedPinId?: string | null;
  onSelectPin: (pin: MapPinType) => void;
}> = ({ pins, selectedPinId, onSelectPin }) => {
  const map = useMap();
  const onSelectRef = useRef(onSelectPin);
  useEffect(() => {
    onSelectRef.current = onSelectPin;
  }, [onSelectPin]);

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div style="
              background: #0B6B3A;
              color: white;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: inherit;
            ">
              <span style="font-weight: 800; font-size: 12px; line-height: 1;">${count}</span>
              <span style="font-size: 9px; line-height: 1; margin-top: 1px;">📍</span>
            </div>
          `,
          className: 'naijapins-cluster-icon',
          iconSize: L.point(38, 38),
          iconAnchor: L.point(19, 19),
        });
      },
    });

    pins.forEach((pin) => {
      const isSelected = selectedPinId === pin.id;
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: createSocialPinIcon(pin, isSelected),
        title: pin.title,
      });

      marker.on('click', () => {
        onSelectRef.current(pin);
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, pins, selectedPinId]);

  return null;
};

interface MapViewProps {
  pins: MapPinType[];
  onBoundsChange: (bounds: MapBounds) => void;
  onSelectPin: (pin: MapPinType) => void;
  selectedPinId?: string | null;
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  autoFitPins?: MapPinType[];
}

export const MapView: React.FC<MapViewProps> = ({
  pins,
  onBoundsChange,
  onSelectPin,
  selectedPinId,
  center = [6.5244, 3.3792], // Lagos default center
  zoom = 12,
  autoFitPins,
}) => {
  return (
    <div className="relative w-full h-full min-h-[500px] isolate z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsListener onBoundsChange={onBoundsChange} />

        <MapCenterController
          center={center}
          zoom={zoom}
          autoFitPins={autoFitPins}
        />

        <MarkerClusters
          pins={pins}
          selectedPinId={selectedPinId}
          onSelectPin={onSelectPin}
        />
      </MapContainer>
    </div>
  );
};
