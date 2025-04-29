// components/GooglePlacesAutocomplete.tsx
"use client"
import React, { useEffect, useState } from 'react';
import Script from 'next/script';

interface Place {
    formatted_address: string;
    geometry: {
        location: {
            lat: () => number;
            lng: () => number;
        }
    };
    place_id: string;
    name: string;
    types?: string[]; // Make types optional
    [key: string]: any;
}

interface GooglePlacesAutocompleteProps {
    apiKey: string;
    onPlaceSelected: (place: Place) => void;
    placeholder?: string;
    searchType?: 'geocode' | 'address' | 'establishment' | '(regions)' | '(cities)';
    country?: string | string[];
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
    apiKey,
    onPlaceSelected,
    placeholder = "Search for a location",
    searchType,
    country
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [input, setInput] = useState('');
    const autocompleteRef = React.useRef<HTMLInputElement>(null);
    const autocompleteInstance = React.useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (isLoaded && autocompleteRef.current) {
            try {
                // Initialize the autocomplete instance
                autocompleteInstance.current = new window.google.maps.places.Autocomplete(
                    autocompleteRef.current,
                    {
                        types: searchType ? [searchType] : [],
                        componentRestrictions: country ? { country } : undefined,
                        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id', 'types']
                    }
                );

                // Add place_changed event listener
                autocompleteInstance.current.addListener('place_changed', () => {
                    if (autocompleteInstance.current) {
                        const place = autocompleteInstance.current.getPlace();

                        // Ensure place has the required properties before passing it to the callback
                        if (place && place.geometry && place.geometry.location) {
                            onPlaceSelected(place as Place);
                        } else {
                            console.warn('Selected place doesn\'t have complete information');
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing Google Places Autocomplete:', error);
            }
        }
    }, [isLoaded, searchType, country, onPlaceSelected]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (autocompleteInstance.current && google.maps.event) {
                google.maps.event.clearInstanceListeners(autocompleteInstance.current);
            }
        };
    }, []);

    return (
        <div className="relative w-full">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
                onLoad={() => setIsLoaded(true)}
                strategy="lazyOnload"
            />

            <input
                ref={autocompleteRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={!isLoaded}
            />
        </div>
    );
};

export default GooglePlacesAutocomplete;