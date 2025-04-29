'use client';

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface RadarProps {
    currentLocation: { lat: number; lng: number };
    favLocations: Array<{ lat: number; lng: number; name?: string }>;
    rangeInKm: number; // Radar range in kilometers
    mapRef: React.MutableRefObject<mapboxgl.Map | null>;
}

// Function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const RadarAnimation: React.FC<RadarProps> = ({
    currentLocation,
    favLocations,
    rangeInKm,
    mapRef
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Convert geographical coordinates to radar screen coordinates
    const coordsToRadarPosition = (lat: number, lng: number) => {
        const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            lat,
            lng
        );

        // Calculate bearing/angle
        const dLon = (lng - currentLocation.lng) * Math.PI / 180;
        const lat1 = currentLocation.lat * Math.PI / 180;
        const lat2 = lat * Math.PI / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;

        const angle = (bearing + 360) % 360;

        // Calculate position on radar
        const radarRadius = 100; // SVG radar radius
        const scale = distance / rangeInKm;

        if (scale > 1) { // Location is outside radar range
            return { x: null, y: null, inRange: false };
        }

        const posX = radarRadius + radarRadius * scale * Math.sin(angle * Math.PI / 180);
        const posY = radarRadius - radarRadius * scale * Math.cos(angle * Math.PI / 180);

        return { x: posX, y: posY, inRange: true };
    };

    // Handle clicking on a radar point
    const handlePointClick = (location: { lat: number; lng: number }) => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [location.lng, location.lat],
                zoom: 14,
                essential: true,
                duration: 2000
            });
        }
    };

    return (
        <div className="absolute bottom-8 right-8 z-20 bg-black bg-opacity-50 rounded-full p-2">
            <svg
                ref={svgRef}
                width="200"
                height="200"
                viewBox="0 0 200 200"
                className="overflow-visible"
            >
                {/* Background circle */}
                <circle cx="100" cy="100" r="100" fill="#001220" fillOpacity="0.7" />

                {/* Range circles */}
                <circle cx="100" cy="100" r="30" fill="none" stroke="#00FF00" strokeWidth="1" strokeOpacity="0.5" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#00FF00" strokeWidth="1" strokeOpacity="0.4" />
                <circle cx="100" cy="100" r="90" fill="none" stroke="#00FF00" strokeWidth="1" strokeOpacity="0.3" />

                {/* Cross lines */}
                <line x1="0" y1="100" x2="200" y2="100" stroke="#00FF00" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="100" y1="0" x2="100" y2="200" stroke="#00FF00" strokeWidth="1" strokeOpacity="0.3" />

                {/* Current location dot */}
                <circle cx="100" cy="100" r="4" fill="#00FF00" />

                {/* Scanning line animation */}
                <motion.line
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="0"
                    stroke="#00FF00"
                    strokeWidth="2"
                    strokeOpacity="0.7"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{ transformOrigin: "100px 100px" }}
                />

                {/* Favorite locations */}
                {favLocations.map((loc, index) => {
                    const pos = coordsToRadarPosition(loc.lat, loc.lng);
                    if (!pos.inRange || pos.x === null || pos.y === null) return null;

                    return (
                        <g key={index} onClick={() => handlePointClick(loc)} style={{ cursor: 'pointer' }}>
                            <motion.circle
                                cx={pos.x}
                                cy={pos.y}
                                r="6"
                                fill="#FF3A3A"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.2 }}
                            />
                            {loc.name && (
                                <text
                                    x={pos.x + 10}
                                    y={pos.y}
                                    fill="#FFFFFF"
                                    fontSize="10"
                                    textAnchor="start"
                                    alignmentBaseline="middle"
                                >
                                    {loc.name}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Radar sweep effect */}
                <motion.circle
                    cx="100"
                    cy="100"
                    r="100"
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth="2"
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeOut"
                    }}
                    style={{ transformOrigin: "100px 100px" }}
                />
            </svg>
        </div>
    );
};

export default RadarAnimation;