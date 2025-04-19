"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapPage() {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [destinations, setDestinations] = useState<{ lat: number; lng: number, name?: string }[]>([]);

    // API Keys
    const MAPTILER_API_KEY = "b3vOuRkyIWtQvXPM4ped";
    const MAPBOX_API_KEY = "sk.eyJ1IjoidmFpZGlrYmhlc2FuaXlhIiwiYSI6ImNsdnhqeXZvNjIyeDAyaXF6cnBza3psNWgifQ.v-66X7gjDpg_dg59_9dgog";

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Error getting location:", error);
            },
            { enableHighAccuracy: true }
        );
    }, []);

    useEffect(() => {
        if (!location || !mapContainerRef.current) return;

        mapboxgl.accessToken = MAPBOX_API_KEY;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`,
            center: [location.lng, location.lat],
            zoom: 12,
            minZoom: 3 // Restrict Maximum Zoom
        });

        mapRef.current = map;

        // Add User Location Marker (Black)
        new mapboxgl.Marker({ color: "black" })
            .setLngLat([location.lng, location.lat])
            .setPopup(new mapboxgl.Popup().setText("Current Location"))
            .addTo(map);

        // Click Event to Set Destination
        map.on("click", async (e) => {
            const newPin = { lat: e.lngLat.lat, lng: e.lngLat.lng };

            // Fetch location name
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${newPin.lng},${newPin.lat}.json?access_token=${MAPBOX_API_KEY}`);
            console.log(response);
            const data = await response.json();
            const placeName = data.features.length ? data.features[0].place_name : "Unknown Location";

            setDestinations((prev) => [...prev, { ...newPin, name: placeName }]);
        });

        return () => map.remove();
    }, [location]);

    useEffect(() => {
        if (!location || destinations.length === 0 || !mapRef.current) return;

        const map = mapRef.current;

        // Remove old markers
        document.querySelectorAll(".destination-marker").forEach((el) => el.remove());

        // Place all markers
        destinations.forEach((dest, index) => {
            const marker = new mapboxgl.Marker({ color: "black" })
                .setLngLat([dest.lng, dest.lat])
                .setPopup(new mapboxgl.Popup().setText(dest.name || `Destination ${index + 1}`))
                .addTo(map);
            marker.getElement().classList.add("destination-marker");
        });

        // Construct the route query
        const coords = [location, ...destinations].map((p) => `${p.lng},${p.lat}`).join(";");
        fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${MAPBOX_API_KEY}`
        )
            .then((response) => response.json())
            .then((data) => {
                if (data.routes.length) {
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
            })
            .catch((error) => console.error("Error fetching route:", error));
    }, [destinations]);

    return <div ref={mapContainerRef} style={{ width: "100%", height: "100vh" }} />;
}
