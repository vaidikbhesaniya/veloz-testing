'use client';

import { useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";
import GooglePlacesAutocomplete from "@/components/AutoComplete";
import { Locate, Route, LocateFixed, X, MapPin, ChevronRight } from "lucide-react";

interface Destination {
    lat: number;
    lng: number;
    name?: string;
}

interface PlaceData {
    formatted_address: string;
    geometry: {
        location: {
            lat: () => number;
            lng: () => number;
        }
    };
    place_id: string;
    name: string;
    types?: string[];
    [key: string]: any;
}

const MAPBOX_API_KEY = "sk.eyJ1IjoidmFpZGlrYmhlc2FuaXlhIiwiYSI6ImNtOW9rNnMyNjB6ZzQyanIwMWN2cnR4OG0ifQ.i2cK1Nbhw_ivyYhjEQWUmA";
mapboxgl.accessToken = "pk.eyJ1IjoidmFpZGlrYmhlc2FuaXlhIiwiYSI6ImNsdnhpd25hNDBiNG4yanM0dmx4bHYxMXkifQ.71G886WvGMHHa5N96dBNWg";

const PlaneLoadingAnimation = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-80 z-10">
        <motion.div
            initial={{ x: -100, y: 50 }}
            animate={{ x: 100, y: -50, rotate: 15 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-blue-600"
        >
            <Image src="/logo.png" alt="Loading Plane" width={50} height={30} />
        </motion.div>
    </div>
);

const DestinationPage: React.FC = () => {
    const { location } = useGeolocation();
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const lastDestinationRef = useRef<Destination | null>(null);
    const [searchType, setSearchType] = useState<'geocode' | 'address' | 'establishment' | '(regions)' | '(cities)' | undefined>(undefined);
    const [country, setCountry] = useState<string | undefined>(undefined);
    const [isCurrentLocationVisible, setIsCurrentLocationVisible] = useState<boolean>(true);
    // Add state for route panel visibility
    const [showRoutePanel, setShowRoutePanel] = useState<boolean>(false);

    // Initialize map
    useEffect(() => {
        if (!location || !mapContainerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [location.lng, location.lat],
            zoom: 12,
        });

        mapRef.current = map;

        map.on("load", () => setIsMapLoading(false));

        const currentLocationMarker = new mapboxgl.Marker({ color: "black" })
            .setLngLat([location.lng, location.lat])
            .setPopup(new mapboxgl.Popup().setText("Current Location"))
            .addTo(map);

        markersRef.current.push(currentLocationMarker);

        // Check if user location is visible after map moves
        map.on("moveend", () => {
            if (!map || !location) return;

            // Get the current map bounds
            const bounds = map.getBounds();

            // Check if the user's current location is within these bounds
            const isVisible = bounds.contains([location.lng, location.lat]);

            // Update state based on visibility
            setIsCurrentLocationVisible(isVisible);
        });

        map.on("click", async (e) => {
            const { lng, lat } = e.lngLat;
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_API_KEY}`
            );
            const data = await res.json();
            const placeName = data.features?.[0]?.place_name || "Unknown Location";
            const newDestination = { lat, lng, name: placeName };
            setDestinations(prev => [...prev, newDestination]);
            lastDestinationRef.current = newDestination;

            // Fly to the clicked location
            map.flyTo({
                center: [lng, lat],
                zoom: 14,
                essential: true,
                duration: 2000
            });
        });

        return () => {
            map.remove();
            mapRef.current = null;
            markersRef.current = [];
        };
    }, [location]);

    // Effect for handling new destinations and flying to them
    useEffect(() => {
        if (!mapRef.current || !destinations.length) return;

        const map = mapRef.current;
        const latestDestination = destinations[destinations.length - 1];

        // Check if this is actually a new destination compared to last processed
        if (latestDestination &&
            (!lastDestinationRef.current ||
                lastDestinationRef.current.lat !== latestDestination.lat ||
                lastDestinationRef.current.lng !== latestDestination.lng)) {

            // Update our last processed destination reference
            lastDestinationRef.current = latestDestination;

            // Fly to the new destination
            map.flyTo({
                center: [latestDestination.lng, latestDestination.lat],
                zoom: 14,
                essential: true,
                duration: 2000
            });
        }
    }, [destinations]);

    // Effect for updating routes and markers
    useEffect(() => {
        if (!mapRef.current || !location) return;

        const map = mapRef.current;

        // Remove previous destination markers (except current location marker which is at index 0)
        if (markersRef.current.length > 1) {
            for (let i = 1; i < markersRef.current.length; i++) {
                markersRef.current[i].remove();
            }
            markersRef.current = [markersRef.current[0]]; // Keep only the current location marker
        }

        // Clear previous routes
        if (map.getLayer('route')) {
            map.removeLayer('route');
        }
        if (map.getSource('route')) {
            map.removeSource('route');
        }

        // Add new destination markers
        destinations.forEach((dest, index) => {
            const marker = new mapboxgl.Marker({ color: "red" })
                .setLngLat([dest.lng, dest.lat])
                .setPopup(new mapboxgl.Popup().setText(dest.name || `Destination ${index + 1}`))
                .addTo(map);
            markersRef.current.push(marker);
        });

        // If there are destinations, draw route
        if (destinations.length > 0) {
            const coords = [location, ...destinations].map((p) => `${p.lng},${p.lat}`).join(";");

            fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${MAPBOX_API_KEY}`
            )
                .then((res) => res.json())
                .then((data) => {
                    if (!data.routes?.length) return;

                    const route = data.routes[0].geometry;

                    // Check if map still exists (might have been removed during async operation)
                    if (!mapRef.current) return;

                    // Only add the source if it doesn't exist (first check again in case it was added during async)
                    if (!mapRef.current.getSource('route')) {
                        mapRef.current.addSource("route", {
                            type: "geojson",
                            data: {
                                type: "Feature",
                                properties: {},
                                geometry: route,
                            },
                        });

                        mapRef.current.addLayer({
                            id: "route",
                            type: "line",
                            source: "route",
                            layout: {
                                "line-join": "round",
                                "line-cap": "round",
                            },
                            paint: {
                                "line-color": "#000",
                                "line-width": 4,
                            },
                        });
                    } else {
                        // Update existing route
                        const source = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource;
                        source.setData({
                            type: "Feature",
                            properties: {},
                            geometry: route,
                        });
                    }
                })
                .catch(console.error);
        }
    }, [destinations, location]);

    const handleSelect = (place: any) => {
        // Extract coordinates from Google Places format
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const placeName = place.name || place.formatted_address;

        const newDestination = { lat, lng, name: placeName };
        setDestinations(prev => [...prev, newDestination]);
        lastDestinationRef.current = newDestination;

        // Fly to the selected destination if map is available
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [lng, lat],
                zoom: 14,
                essential: true,
                duration: 2000
            });
        }
    };

    // Function to fly to user's current location
    const flyToCurrentLocation = () => {
        if (!mapRef.current || !location) return;

        mapRef.current.flyTo({
            center: [location.lng, location.lat],
            zoom: 14,
            essential: true,
            duration: 1500
        });

        // Update visibility state after flying to location
        setIsCurrentLocationVisible(true);
    };

    // Toggle route panel visibility
    const toggleRoutePanel = () => {
        setShowRoutePanel(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Animated Route Panel */}
            <AnimatePresence>
                {showRoutePanel && (
                    <motion.div
                        className="absolute top-[10%] left-1/2 transform -translate-x-1/2 z-30 bg-white p-6 rounded-lg shadow-xl w-[350px]"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ type: "spring", damping: 15 }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">Plan Your Route</h3>
                            <button
                                onClick={toggleRoutePanel}
                                className="text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-blue-500">
                                    <MapPin size={20} />
                                </div>
                                <div className="ml-10 bg-gray-100 p-2 rounded-lg">
                                    {location ? "Your Location" : "Loading location..."}
                                </div>
                            </div>

                            {/* Connecting line */}
                            <div className="ml-[22px] h-8 w-px bg-gray-300"></div>

                            <div className="relative">
                                <div className="absolute left-3 top-3 text-red-500">
                                    <MapPin size={20} />
                                </div>
                                <GooglePlacesAutocomplete
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                                    onPlaceSelected={handleSelect}
                                    placeholder="Enter destination"
                                    searchType={searchType}
                                    country={country}

                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full bg-blue-500 text-white p-3 rounded-lg font-medium flex items-center justify-center space-x-2 mt-2"
                                onClick={() => {/* Handle route calculation */ }}
                            >
                                <span>Get Directions</span>
                                <ChevronRight size={18} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standard location search inputs (only show when route panel is hidden) */}
            {/* {!showRoutePanel && (
                <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 z-20 bg-white p-4 rounded-lg shadow-xl w-[340px]">
                    <div className="flex flex-col">
                        <GooglePlacesAutocomplete
                            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                            onPlaceSelected={handleSelect}
                            placeholder="Enter a location"
                            searchType={searchType}
                            country={country}
                        />
                        <GooglePlacesAutocomplete
                            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                            onPlaceSelected={handleSelect}
                            placeholder="Enter a location"
                            searchType={searchType}
                            country={country}
                        />
                    </div>
                </div>
            )} */}

            {/* Locate Me Button - Conditionally render based on visibility */}
            <button
                onClick={flyToCurrentLocation}
                className="fixed bottom-[15%] right-11 bg-white p-3 rounded-full shadow-lg z-20 hover:bg-gray-100 transition-colors duration-200"
                aria-label="Locate me"
            >
                {isCurrentLocationVisible ? (
                    <LocateFixed className="text-black h-9 w-9" />
                ) : (
                    <Locate className="text-black h-9 w-9" />
                )}
            </button>

            {/* Route Button with animation effect */}
            <motion.button
                onClick={toggleRoutePanel}
                className={`fixed bottom-[25%] right-11 p-3 rounded-full shadow-lg z-20 transition-colors duration-200 ${showRoutePanel ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
                aria-label="route"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <Route className="h-9 w-9" />
            </motion.button>

            {location && (
                <div className="relative w-full h-screen">
                    {isMapLoading && <PlaneLoadingAnimation />}
                    <div ref={mapContainerRef} className="w-full h-full" />
                </div>
            )}
        </div>
    );
};

export default DestinationPage;