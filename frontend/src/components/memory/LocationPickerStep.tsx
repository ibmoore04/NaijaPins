import React, { useState } from 'react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { AppTileLayer } from '@/components/map/AppTileLayer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MapPin, Navigation, Compass, ArrowRight } from 'lucide-react';

export interface LocationData {
  state: string;
  lga: string;
  city: string;
  neighborhood: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerStepProps {
  initialData: LocationData;
  onNext: (data: LocationData) => void;
}

// Leaflet Location Pin Icon
const locationPinIcon = L.divIcon({
  className: 'custom-location-picker-marker',
  html: `
    <div style="
      background-color: #0F5132;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">
        📍
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const MapClickHandler: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({
  onLocationSelect,
}) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export const LocationPickerStep: React.FC<LocationPickerStepProps> = ({ initialData, onNext }) => {
  const [location, setLocation] = useState<LocationData>(initialData);
  const [geoLoading, setGeoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    setLocation((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGeoLoading(false);
      },
      (_err) => {
        setErrorMsg('Unable to retrieve current location. Please tap on the map.');
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.state || !location.city || !location.formatted_address) {
      setErrorMsg('Please select a State, City, and Address.');
      return;
    }
    onNext(location);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-bold text-black flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <span>Step 1: Choose Location</span>
        </h2>
        <p className="text-sm text-charcoal-dark">
          Click or drag on the map to pin the physical place in Nigeria where this memory happened.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Map Picker Canvas */}
      <div className="relative w-full h-72 rounded-xl overflow-hidden border-2 border-border shadow-inner">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={geoLoading}
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-border text-xs font-semibold text-charcoal-dark hover:text-black hover:bg-white flex items-center gap-1.5 transition-colors"
        >
          <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : 'text-primary'}`} />
          <span>{geoLoading ? 'Detecting...' : 'Use My GPS'}</span>
        </button>

        <MapContainer
          center={[location.latitude || 6.5244, location.longitude || 3.3792]}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <AppTileLayer />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <Marker
            position={[location.latitude, location.longitude]}
            icon={locationPinIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                handleMapClick(pos.lat, pos.lng);
              },
            }}
          />
        </MapContainer>
      </div>

      {/* Location Details Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-charcoal-dark mb-1">State *</label>
          <select
            value={location.state}
            onChange={(e) => setLocation({ ...location, state: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            required
          >
            <option value="">Select State</option>
            {NIGERIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="LGA (Local Government Area)"
          type="text"
          placeholder="e.g. Ikeja, Eti-Osa"
          value={location.lga}
          onChange={(e) => setLocation({ ...location, lga: e.target.value })}
        />

        <Input
          label="City / Town *"
          type="text"
          placeholder="e.g. Yaba, Surulere, Ikeja"
          value={location.city}
          onChange={(e) => setLocation({ ...location, city: e.target.value })}
          required
        />

        <Input
          label="Neighborhood / Area"
          type="text"
          placeholder="e.g. Sabo, Akoka"
          value={location.neighborhood}
          onChange={(e) => setLocation({ ...location, neighborhood: e.target.value })}
        />
      </div>

      <Input
        label="Formatted Address or Famous Landmark *"
        type="text"
        placeholder="e.g. Commercial Avenue, opposite Yaba College of Technology"
        value={location.formatted_address}
        onChange={(e) => setLocation({ ...location, formatted_address: e.target.value })}
        leftIcon={<Compass className="w-4 h-4 text-charcoal-muted" />}
        required
      />

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          Continue to Story
        </Button>
      </div>
    </form>
  );
};
