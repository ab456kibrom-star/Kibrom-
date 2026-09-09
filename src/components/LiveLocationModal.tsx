import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Gauge,
  Clock,
  ShieldCheck,
  Share2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  X,
  Crosshair,
  Layers,
  AlertCircle,
  Tag,
  Search,
  Radio,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { LiveLocationData, ScheduleItem, UserRole } from '../types';
import {
  formatCoordinates,
  reverseGeocodeCoordinates,
  getGoogleMapsUrl,
  getGoogleMapsDirectionsUrl,
  calculateDistanceMeters,
} from '../services/geolocation';

interface LiveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleItem[];
  currentUserRole: UserRole;
  onTagLocationToTask: (taskId: string, location: { latitude: number; longitude: number; address?: string }) => void;
}

export const LiveLocationModal: React.FC<LiveLocationModalProps> = ({
  isOpen,
  onClose,
  tasks,
  currentUserRole,
  onTagLocationToTask,
}) => {
  const [location, setLocation] = useState<LiveLocationData | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('Detecting location address...');
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTaskIdForTag, setSelectedTaskIdForTag] = useState<string>('');
  const [tagSuccessMsg, setTagSuccessMsg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [userCustomApiKey, setUserCustomApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);

  // Available API key from env or user input
  const apiKey =
    userCustomApiKey.trim() ||
    ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) ||
    '';

  // Start watching position when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setErrorMsg(null);

    const handleSuccess = async (pos: GeolocationPosition) => {
      const liveData: LiveLocationData = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
        altitudeAccuracy: pos.coords.altitudeAccuracy ? Math.round(pos.coords.altitudeAccuracy) : null,
        heading: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
        speed: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : null, // convert m/s to km/h
        timestamp: pos.timestamp,
      };

      setLocation(liveData);

      // Throttled reverse geocode (at most once every 15 seconds)
      const now = Date.now();
      if (now - lastGeocodeTimeRef.current > 15000) {
        lastGeocodeTimeRef.current = now;
        setIsLoadingAddress(true);
        try {
          const res = await reverseGeocodeCoordinates(
            pos.coords.latitude,
            pos.coords.longitude,
            apiKey
          );
          setAddress(res.formattedAddress);
        } catch (e) {
          console.warn('Geocoding error:', e);
        } finally {
          setIsLoadingAddress(false);
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      let msg = 'Unable to retrieve location.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Location access was denied. Please allow location permissions in your browser settings.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'Location information is currently unavailable.';
      } else if (err.code === err.TIMEOUT) {
        msg = 'Location request timed out. Retrying...';
      }
      setErrorMsg(msg);
    };

    // Immediate one-off position fetch
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Continuous watch
    if (isWatching) {
      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      });
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, isWatching, apiKey]);

  if (!isOpen) return null;

  const handleCopyCoords = () => {
    if (!location) return;
    const text = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!location) return;
    const url = getGoogleMapsUrl(location.latitude, location.longitude);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Live Field Location',
          text: `Weekly Activity Schedule: Field location at ${address}`,
          url,
        });
      } catch (err) {
        // Fallback to copy
        navigator.clipboard.writeText(url);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTagTask = () => {
    if (!location || !selectedTaskIdForTag) return;
    onTagLocationToTask(selectedTaskIdForTag, {
      latitude: location.latitude,
      longitude: location.longitude,
      address,
    });

    const taskObj = tasks.find((t) => t.id === selectedTaskIdForTag);
    setTagSuccessMsg(`Location pinned to "${taskObj?.category} - ${taskObj?.day}"!`);
    setTimeout(() => setTagSuccessMsg(null), 4000);
  };

  const tasksWithLocations = tasks.filter((t) => t.location);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] max-h-[820px] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative">
              <Crosshair className="w-5 h-5 animate-spin-slow" />
              {isWatching && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Live Location Tracking</h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    isWatching
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <Radio className="w-3 h-3 mr-1" />
                  {isWatching ? 'GPS Streaming Live' : 'Tracking Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {isLoadingAddress ? 'Resolving street address...' : address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWatching(!isWatching)}
              title={isWatching ? 'Pause GPS tracking' : 'Resume live GPS tracking'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                isWatching
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWatching ? 'animate-spin' : ''}`} />
              <span>{isWatching ? 'Pause GPS' : 'Resume GPS'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {tagSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{tagSuccessMsg}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2 flex items-center justify-between text-xs text-rose-800 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsWatching(true);
              }}
              className="font-bold underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content: Split layout (Telemetry & Controls Sidebar | Interactive Map) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left / Bottom Sidebar: Telemetry & Controls */}
          <div className="w-full md:w-84 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
            {/* Live GPS Telemetry Cards */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Real-time GPS Fix</span>
                </span>
                {location && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(location.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {location ? (
                <div className="space-y-2.5">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Coordinates</div>
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {formatCoordinates(location.latitude, location.longitude)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      title="Copy coordinates to clipboard"
                      className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-slate-500" />
                        <span>Accuracy</span>
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        ±{location.accuracy}m
                        <span className="text-[10px] text-emerald-600 ml-1 font-normal">
                          {location.accuracy < 15 ? '(High)' : '(Approx)'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-500" />
                        <span>Speed</span>
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {location.speed !== null ? `${location.speed} km/h` : 'Stationary'}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Compass className="w-3 h-3 text-slate-500" />
                        <span>Heading</span>
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {location.heading !== null ? `${location.heading}°` : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>Altitude</span>
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {location.altitude !== null ? `${location.altitude}m` : 'Ground'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Acquiring high-accuracy satellite signal...</p>
                </div>
              )}
            </div>

            {/* Field Action: Pin Live Location to Schedule Task */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Stamp Location to Task</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Pin your live GPS coordinates to a scheduled maintenance milestone for field audit verification.
              </p>

              <select
                value={selectedTaskIdForTag}
                onChange={(e) => setSelectedTaskIdForTag(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">-- Choose Task / Milestone --</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.day}: {task.category} ({task.responsible})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!selectedTaskIdForTag || !location}
                onClick={handleTagTask}
                className="w-full py-2 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pin GPS to Task</span>
              </button>
            </div>

            {/* External Navigation and Sharing */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                External Tools & Sharing
              </div>
              <div className="grid grid-cols-2 gap-2">
                {location && (
                  <a
                    href={getGoogleMapsUrl(location.latitude, location.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-center shadow-2xs"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!location}
                  className="py-2 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>

            {/* Google Maps API Key Setup helper */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Google Maps API Configuration
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showKeyInput ? 'rotate-180' : ''}`} />
              </button>

              {showKeyInput && (
                <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-2">
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Enter your Google Cloud Maps API Key or free Maps Demo Key to enable direct Google Maps rendering:
                  </p>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={userCustomApiKey}
                    onChange={(e) => setUserCustomApiKey(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:bg-white"
                  />
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Or set VITE_GOOGLE_MAPS_API_KEY in .env</span>
                    {apiKey && <span className="text-emerald-600 font-bold">Key active</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right / Top: Interactive Map Viewport */}
          <div className="flex-1 relative bg-slate-100 flex flex-col overflow-hidden">
            {/* Map view controls overlay */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMapType('streets')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  mapType === 'streets' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Streets
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  mapType === 'satellite' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Map rendering: Google Maps API or Interactive Real-Time OpenStreetMap/Canvas Tile View */}
            {apiKey && location ? (
              <div className="w-full h-full">
                <APIProvider apiKey={apiKey}>
                  <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={{ lat: location.latitude, lng: location.longitude }}
                    center={{ lat: location.latitude, lng: location.longitude }}
                    defaultZoom={zoomLevel}
                    zoom={zoomLevel}
                    onZoomChanged={(ev) => setZoomLevel(ev.detail.zoom)}
                    mapTypeId={mapType === 'satellite' ? 'hybrid' : 'roadmap'}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    {/* Live User Location Marker */}
                    <AdvancedMarker position={{ lat: location.latitude, lng: location.longitude }} title="Your Live Location">
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-60"></span>
                        <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      </div>
                    </AdvancedMarker>

                    {/* Task Location Pins */}
                    {tasksWithLocations.map((task) => (
                      <AdvancedMarker
                        key={task.id}
                        position={{
                          lat: task.location!.latitude,
                          lng: task.location!.longitude,
                        }}
                        title={`${task.day}: ${task.category}`}
                      >
                        <Pin background="#10B981" glyphColor="#FFFFFF" borderColor="#047857" />
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              </div>
            ) : location ? (
              /* High-fidelity interactive GPS map tile canvas */
              <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center bg-slate-900">
                {/* Simulated interactive map grid & tiles */}
                <iframe
                  title="Interactive Field Map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005}%2C${
                    location.latitude - 0.003
                  }%2C${location.longitude + 0.005}%2C${
                    location.latitude + 0.003
                  }&layer=${mapType === 'satellite' ? 'hot' : 'mapnik'}&marker=${location.latitude}%2C${
                    location.longitude
                  }`}
                  className="w-full h-full border-0 filter"
                />

                {/* Overlaid Live Coordinates & Navigation Banner */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Crosshair className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {formatCoordinates(location.latitude, location.longitude)}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-sm">{address}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getGoogleMapsDirectionsUrl(location.latitude, location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Loading view */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-50">
                <div className="w-12 h-12 rounded-2xl bg-slate-200/80 flex items-center justify-center mb-3">
                  <Crosshair className="w-6 h-6 text-slate-600 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Acquiring GPS Fix</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Connecting to device location services and computing coordinates...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
