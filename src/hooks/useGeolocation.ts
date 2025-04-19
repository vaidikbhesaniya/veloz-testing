"use client";

import { useState, useEffect } from "react";

export interface Location {
    lat: number;
    lng: number;
}
export function useGeolocation() {
    const [city, setCity] = useState<string | undefined>(undefined);
    const [location, setLocation] = useState<Location | null>(null)

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude })
            try {
                const res = await fetch("/api/get-city", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat: latitude, lon: longitude }),
                });

                const data = await res.json();
                if (data.city) setCity(data.city);
            } catch (error) {
                console.error("Failed to fetch city:", error);
            }
        });
    }, []);

    return { city, location };
}