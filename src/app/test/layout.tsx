"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkPermission() {
            const permissionStatus = await navigator.permissions.query({ name: "geolocation" });

            if (permissionStatus.state === "granted") {
                setLocationGranted(true);
            } else if (permissionStatus.state === "denied") {
                setLocationGranted(false);
            } else {
                navigator.geolocation.getCurrentPosition(
                    () => setLocationGranted(true),
                    () => setLocationGranted(false)
                );
            }
        }

        checkPermission();
    }, []);

    if (locationGranted === null) {
        return <p className="text-center mt-10">Requesting location access...</p>;
    }

    if (!locationGranted) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="mb-4 text-lg font-semibold text-red-600">
                    Location Permission Denied
                </p>
                <p className="text-sm text-gray-600">
                    Please allow location access in your browser settings.
                </p>
            </div>
        );
    }

    return (
        <main>
            {children}
        </main>
    );
}
