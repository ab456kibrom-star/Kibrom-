import { LiveLocationData, TaskLocation } from '../types';

export interface GeocodeResult {
  formattedAddress: string;
  city?: string;
  neighborhood?: string;
  country?: string;
}

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Formats coordinates for display (e.g. 37.7749° N, 122.4194° W)
 */
export const formatCoordinates = (lat: number, lng: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
};

/**
 * Attempts reverse geocoding using OpenStreetMap Nominatim or Google Geocoding
 */
export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number,
  apiKey?: string
): Promise<GeocodeResult> => {
  if (apiKey) {
    try {
      // Direct call to Geocoding API if key is available
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          formattedAddress: data.results[0].formatted_address,
        };
      }
    } catch (err) {
      console.warn('Google reverse geocode error:', err);
    }
  }

  // Fallback to public open geocoding service
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        formattedAddress: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: data.address?.city || data.address?.town || data.address?.village,
        neighborhood: data.address?.suburb || data.address?.neighbourhood,
        country: data.address?.country,
      };
    }
  } catch (e) {
    console.warn('Fallback reverse geocoding error:', e);
  }

  return {
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)} (Approximate GPS Pin)`,
  };
};

/**
 * Generates Google Maps navigation URL
 */
export const getGoogleMapsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

export const getGoogleMapsDirectionsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};
