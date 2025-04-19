'use client'

import { Store } from "@/store/useStore";
import Image from "next/image";
import React, { useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { MapPinIcon } from "lucide-react";
import { motion } from "framer-motion";

// interface Destination {
//     id: number;
//     name: string;
//     description: string;
//     image: string;
//     location: {
//         lat: number;
//         lng: number;
//     };
// }

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
                    <Image src="/logo.png" alt="My Image" width={50} height={30} />
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
                />
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
    const [destinations, setDestinations] = useState<{ lat: number; lng: number; name?: string }[]>([]);
    const [isMapLoading, setIsMapLoading] = useState<boolean>(true);
    const [isTrackingLocation, setIsTrackingLocation] = useState<boolean>(false);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Error getting location:", error);
                setLocation({ lat: 40.7128, lng: -74.0060 }); // New York fallback
            },
            { enableHighAccuracy: true }
        );
    }, []);

    useEffect(() => {
        if (!store.query || !mapRef.current) return;

        const fetchCoordinates = async () => {
            try {
                const res = await fetch(
                    `https://api.maptiler.com/geocoding/${encodeURIComponent(store.query)}.json?key=${process.env.MAPTILER_API_KEY}`
                );
                const data = await res.json();
                if (data.features?.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12 });
                    store.setquery("");
                }
            } catch (error) {
                console.error("Error fetching coordinates:", error);
            }
        };

        fetchCoordinates();
    }, [store, store.query]);

    useEffect(() => {
        if (!location || !mapContainerRef.current) return;

        mapboxgl.accessToken = process.env.MAPBOX_API_KEY || "";

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.MAPTILER_API_KEY}`,
            center: [location.lng, location.lat],
            zoom: 12,
            minZoom: 3
        });

        mapRef.current = map;

        map.on('load', () => {
            setIsMapLoading(false);
        });

        userMarkerRef.current = new mapboxgl.Marker({ color: "black" })
            .setLngLat([location.lng, location.lat])
            .setPopup(new mapboxgl.Popup().setText("Current Location"))
            .addTo(map);

        map.on("click", async (e) => {
            const newPin = { lat: e.lngLat.lat, lng: e.lngLat.lng };

            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${newPin.lng},${newPin.lat}.json?access_token=${process.env.MAPBOX_API_KEY}`
                );
                const data = await response.json();
                const placeName = data.features?.[0]?.place_name || "Unknown Location";
                setDestinations((prev) => [...prev, { ...newPin, name: placeName }]);
            } catch (error) {
                console.error("Error fetching place name:", error);
                setDestinations((prev) => [...prev, { ...newPin, name: "Unnamed Location" }]);
            }
        });

        setIsTrackingLocation(true);

        return () => {
            map.remove();
            setIsTrackingLocation(false);
        };
    }, [location]);

    useEffect(() => {
        if (!isTrackingLocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newLocation = { lat: latitude, lng: longitude };
                setLocation(newLocation);
                userMarkerRef.current?.setLngLat([longitude, latitude]);
                if (destinations.length > 0) {
                    updateRoute(newLocation, destinations);
                }
            },
            (error) => console.error("Error tracking location:", error),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
            setIsTrackingLocation(false);
        };
    }, [isTrackingLocation, destinations]);

    useEffect(() => {
        if (!location || destinations.length === 0 || !mapRef.current) return;
        updateRoute(location, destinations);
    }, [location, destinations]);

    const updateRoute = async (currentLocation: { lat: number; lng: number }, destinations: { lat: number; lng: number; name?: string }[]) => {
        const map = mapRef.current;
        if (!map) return;

        document.querySelectorAll(".destination-marker").forEach((el) => el.remove());

        destinations.forEach((dest, index) => {
            const marker = new mapboxgl.Marker({ color: "blue" })
                .setLngLat([dest.lng, dest.lat])
                .setPopup(new mapboxgl.Popup().setText(dest.name || `Destination ${index + 1}`))
                .addTo(map);
            marker.getElement().classList.add("destination-marker");
        });

        try {
            const coords = [currentLocation, ...destinations]
                .map((p) => `${p.lng},${p.lat}`)
                .join(";");

            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${process.env.MAPBOX_API_KEY}`
            );
            const data = await response.json();

            if (data.routes?.length) {
                const bestRoute = data.routes[0].geometry;

                if (map.getSource("route")) {
                    map.removeLayer("route");
                    map.removeSource("route");
                }

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
        const map = mapRef.current;
        if (map) {
            if (map.getLayer("route")) {
                map.removeLayer("route");
                map.removeSource("route");
            }
            document.querySelectorAll(".destination-marker").forEach((el) => el.remove());
        }
    };

    return (
        <div className="relative w-full h-screen">
            {isMapLoading && <PlaneLoadingAnimation />}
            <div ref={mapContainerRef} style={{ width: "100%", height: "100vh" }} />

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="">
                {location && <GoogleMapComponent />}
            </div>
        </div>
    );
};

export default DestinationPage;
