'use client'

import { Store } from "@/store/useStore";
import Image from "next/image";
import React, { useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Location, useGeolocation } from "@/hooks/useGeolocation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, MapPinIcon, PlaneTakeoffIcon, CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";

// Type definitions
interface Destination {
    id: number;
    name: string;
    description: string;
    image: string;
    location: {
        lat: number;
        lng: number;
    };
}

const PlaneLoadingAnimation = () => {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-80 z-10">
            <div className="flex flex-col items-center">
                <motion.div
                    initial={{ x: -100, y: 50 }}
                    animate={{
                        x: 100,
                        y: -50,
                        rotate: 15
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut"
                    }}
                    className="text-blue-600"
                >
                    <Image src="/logo.png"
                        alt="My Image"
                        width={50}
                        height={30} />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        repeat: Infinity,
                        duration: 1,
                        repeatType: "reverse"
                    }}
                    className="mt-4 font-medium text-gray-700"
                >
                </motion.div>
            </div>
        </div>
    );
};

const GoogleMapComponent = () => {
    const store = Store();
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [destinations, setDestinations] = useState<{ lat: number; lng: number, name?: string }[]>([]);
    const [isMapLoading, setIsMapLoading] = useState<boolean>(true);
    const [isTrackingLocation, setIsTrackingLocation] = useState<boolean>(false);

    // API Keys


    // Initial location setup
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Error getting location:", error);
                // Set default location if geolocation fails
                setLocation({ lat: 40.7128, lng: -74.0060 }); // New York as fallback
            },
            { enableHighAccuracy: true }
        );
    }, []);

    // Handle search queries
    useEffect(() => {
        if (!store.query || !mapRef.current) return;

        const fetchCoordinates = async () => {
            try {
                const res = await fetch(
                    `https://api.maptiler.com/geocoding/${encodeURIComponent(store.query)}.json?key=${process.env.MAPTILER_API_KEY}`
                );
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const { center } = data.features[0];
                    const [lng, lat] = center;

                    // Pan to the new location
                    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12 });
                    store.setquery("");
                }
            } catch (error) {
                console.error("Error fetching coordinates:", error);
            }
        };

        fetchCoordinates();
    }, [store.query]);

    // Initialize map and start location tracking
    useEffect(() => {
        if (!location || !mapContainerRef.current) return;

        mapboxgl.accessToken = process.env.MAPBOX_API_KEY;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.MAPTILER_API_KEY}`,
            center: [location.lng, location.lat],
            zoom: 12,
            minZoom: 3 // Restrict Maximum Zoom
        });

        mapRef.current = map;

        // Set loading state to false once the map loads
        map.on('load', () => {
            setIsMapLoading(false);
        });

        // Add User Location Marker (Black)
        userMarkerRef.current = new mapboxgl.Marker({ color: "black" })
            .setLngLat([location.lng, location.lat])
            .setPopup(new mapboxgl.Popup().setText("Current Location"))
            .addTo(map);

        // Click Event to Set Destination
        map.on("click", async (e) => {
            const newPin = { lat: e.lngLat.lat, lng: e.lngLat.lng };

            try {
                // Fetch location name
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${newPin.lng},${newPin.lat}.json?access_token=${process.env.MAPBOX_API_KEY}`);
                const data = await response.json();
                const placeName = data.features.length ? data.features[0].place_name : "Unknown Location";

                setDestinations((prev) => [...prev, { ...newPin, name: placeName }]);
            } catch (error) {
                console.error("Error fetching place name:", error);
                setDestinations((prev) => [...prev, { ...newPin, name: "Unnamed Location" }]);
            }
        });

        // Start tracking location
        setIsTrackingLocation(true);

        return () => {
            // Clean up
            map.remove();
            setIsTrackingLocation(false);
        };
    }, [location]);

    // Live location tracking
    useEffect(() => {
        if (!isTrackingLocation || !mapRef.current) return;

        // Set up the location watcher
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newLocation = { lat: latitude, lng: longitude };

                // Update location state
                setLocation(newLocation);

                // Update the user marker position
                if (userMarkerRef.current) {
                    userMarkerRef.current.setLngLat([longitude, latitude]);
                }

                // Update routes if there are destinations
                if (destinations.length > 0) {
                    updateRoute(newLocation, destinations);
                }
            },
            (error) => {
                console.error("Error tracking location:", error);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
            setIsTrackingLocation(false);
        };
    }, [isTrackingLocation, mapRef.current, destinations]);

    // Update routing when destinations change
    useEffect(() => {
        if (!location || destinations.length === 0 || !mapRef.current) return;
        updateRoute(location, destinations);
    }, [destinations]);

    // Function to update the route
    const updateRoute = async (currentLocation: { lat: number; lng: number }, destinations: { lat: number; lng: number, name?: string }[]) => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        // Remove old markers
        document.querySelectorAll(".destination-marker").forEach((el) => el.remove());

        // Place all markers
        destinations.forEach((dest, index) => {
            const marker = new mapboxgl.Marker({ color: "blue" })
                .setLngLat([dest.lng, dest.lat])
                .setPopup(new mapboxgl.Popup().setText(dest.name || `Destination ${index + 1}`))
                .addTo(map);
            marker.getElement().classList.add("destination-marker");
        });

        try {
            // Construct the route query
            const coords = [currentLocation, ...destinations].map((p) => `${p.lng},${p.lat}`).join(";");
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${process.env.MAPBOX_API_KEY}`
            );
            const data = await response.json();

            if (data.routes && data.routes.length) {
                const bestRoute = data.routes[0].geometry;

                // Remove old route if exists
                if (map.getSource("route")) {
                    map.removeLayer("route");
                    map.removeSource("route");
                }

                // Add new route layer
                map.addSource("route", {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        properties: {},
                        geometry: bestRoute
                    }
                });

                map.addLayer({
                    id: "route",
                    type: "line",
                    source: "route",
                    layout: {
                        "line-join": "round",
                        "line-cap": "round"
                    },
                    paint: {
                        "line-color": "#000000",
                        "line-width": 4
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    };

    // UI Controls for location tracking
    const toggleLocationTracking = () => {
        setIsTrackingLocation(!isTrackingLocation);
    };

    const centerOnCurrentLocation = () => {
        if (mapRef.current && location) {
            mapRef.current.flyTo({
                center: [location.lng, location.lat],
                zoom: 14,
                essential: true
            });
        }
    };

    const clearDestinations = () => {
        setDestinations([]);
        if (mapRef.current) {
            // Remove existing route
            if (mapRef.current.getLayer("route")) {
                mapRef.current.removeLayer("route");
                mapRef.current.removeSource("route");
            }

            // Remove destination markers
            document.querySelectorAll(".destination-marker").forEach((el) => el.remove());
        }
    };

    return (
        <div className="relative w-full h-screen">
            {isMapLoading && <PlaneLoadingAnimation />}
            <div ref={mapContainerRef} style={{ width: "100%", height: "100vh" }} />

            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
                <Button
                    onClick={centerOnCurrentLocation}
                    className="bg-white text-black hover:bg-gray-100"
                    size="sm"
                >
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    Center
                </Button>

                <Button
                    onClick={toggleLocationTracking}
                    className={`${isTrackingLocation ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white text-black hover:bg-gray-100'}`}
                    size="sm"
                >
                    {isTrackingLocation ? 'Tracking On' : 'Track Location'}
                </Button>

                {destinations.length > 0 && (
                    <Button
                        onClick={clearDestinations}
                        className="bg-white text-black hover:bg-gray-100"
                        size="sm"
                    >
                        Clear Pins
                    </Button>
                )}
            </div>
        </div>
    );
};

const DestinationPage: React.FC = () => {
    const { location } = useGeolocation();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

    const handleDestinationSelect = (destination: Destination): void => {
        setSelectedDestination(destination);
    };

    const handleCreatePlan = (): void => {
        if (selectedDestination) {
            // Navigate to plan creation page or open modal
            console.log("Creating plan for", selectedDestination.name);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Main Content */}
            <div className="">
                {location && (
                    <GoogleMapComponent />
                )}
            </div>
        </div>
    );
};

export default DestinationPage;