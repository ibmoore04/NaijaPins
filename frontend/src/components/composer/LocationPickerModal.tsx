import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { LocationData } from '@/components/memory/LocationPickerStep';
import { MapPin, Navigation, X, Loader2 } from 'lucide-react';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData | null;
  onSelectLocation: (loc: LocationData) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [state, setState] = useState(currentLocation?.state || 'Lagos');
  const [city, setCity] = useState(currentLocation?.city || 'Lagos');
  const [landmark, setLandmark] = useState(currentLocation?.formatted_address || '');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation) {
      setState(currentLocation.state || 'Lagos');
      setCity(currentLocation.city || 'Lagos');
      setLandmark(currentLocation.formatted_address || '');
    }
  }, [currentLocation, isOpen]);

  if (!isOpen) return null;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`
          );
          const data = await res.json();
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.county ||
            'Lagos';
          const detectedState =
            data.address?.state?.replace(' State', '') || 'Lagos';
          const formatted =
            data.display_name || `${detectedCity}, ${detectedState}`;

          onSelectLocation({
            state: detectedState,
            lga: data.address?.county || detectedCity,
            city: detectedCity,
            neighborhood: data.address?.suburb || '',
            formatted_address: formatted,
            latitude,
            longitude,
          });
          onClose();
        } catch {
          // Fallback coordinate assignment
          onSelectLocation({
            state: state || 'Lagos',
            lga: city || 'Lagos',
            city: city || 'Lagos',
            neighborhood: '',
            formatted_address: landmark || `${city}, ${state}`,
            latitude,
            longitude,
          });
          onClose();
        } finally {
          setIsDetectingGps(false);
        }
      },
      () => {
        setIsDetectingGps(false);
        setGpsError('Location permission denied or unavailable. Please select your state and city below.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !city) return;

    // Approximate coordinates for selected state / city
    const formatted = landmark.trim()
      ? `${landmark.trim()}, ${city}, ${state}`
      : `${city}, ${state}`;

    onSelectLocation({
      state,
      lga: city,
      city,
      neighborhood: '',
      formatted_address: formatted,
      latitude: currentLocation?.latitude || 6.5244,
      longitude: currentLocation?.longitude || 3.3792,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8F5EE] text-[#0B6B3A] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-black">Tag Location</h3>
              <p className="text-[11px] text-charcoal-muted">Where in Nigeria did this memory take place?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick GPS Auto-Detect */}
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isDetectingGps}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#E8F5EE] hover:bg-[#d0ebd9] text-[#0B6B3A] font-bold text-xs transition-colors border border-[#A3D9BC]/60"
          >
            {isDetectingGps ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 fill-[#0B6B3A]" />
            )}
            <span>{isDetectingGps ? 'Detecting Location...' : 'Use My Current Location (GPS)'}</span>
          </button>

          {gpsError && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {gpsError}
            </p>
          )}

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-bold text-charcoal-muted absolute">
              Or Choose Manually
            </span>
          </div>

          <form onSubmit={handleManualSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">
                State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-semibold focus:outline-none focus:border-[#0B6B3A]"
                required
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st} State
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">
                City / Town / Area *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Yaba, Ikeja, Abeokuta, Kano"
                className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-semibold focus:outline-none focus:border-[#0B6B3A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">
                Landmark or Address <span className="text-charcoal-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. National Theatre, Commercial Avenue"
                className="w-full h-10 px-3 rounded-xl border border-border bg-white text-xs font-medium focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold"
              >
                Confirm Location
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
