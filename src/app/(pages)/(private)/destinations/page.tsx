'use client';

import { useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import { motion } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";

interface Destination {
    lat: number;
    lng: number;
    name?: string;
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
    const [searchInput, setSearchInput] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const lastDestinationRef = useRef<Destination | null>(null);

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
                    }
                })
                .catch(console.error);
        }
    }, [destinations, location]);

    const handleSearch = async (query: string) => {
        setSearchInput(query);
        if (!query) return setSuggestions([]);

        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&access_token=${MAPBOX_API_KEY}`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
    };

    const handleSelect = (feature: any) => {
        const [lng, lat] = feature.center;
        const placeName = feature.place_name;
        const newDestination = { lat, lng, name: placeName };
        setDestinations(prev => [...prev, newDestination]);
        lastDestinationRef.current = newDestination;
        setSearchInput("");
        setSuggestions([]);

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 z-20 bg-white p-4 rounded-lg shadow-xl w-[340px]">
                <div className="flex flex-col">
                    <input
                        type="text"
                        placeholder="Choose a starting place"
                        value={searchInput}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="border border-gray-300 px-3 py-2 rounded focus:outline-none"
                    />
                    {suggestions.length > 0 && (
                        <ul className="bg-white border border-gray-200 mt-1 max-h-60 overflow-auto rounded shadow-md">
                            {suggestions.map((s, i) => (
                                <li
                                    key={i}
                                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                                    onClick={() => handleSelect(s)}
                                >
                                    {s.place_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

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