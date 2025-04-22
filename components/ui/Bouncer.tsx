"use client"; // Required for the spinner library

import { Bouncy } from 'ldrs/react';
import 'ldrs/react/Bouncy.css';
import { useTheme } from "next-themes"; // Import useTheme

export default function LoadingSpinner() {
    const { resolvedTheme } = useTheme(); // Get the resolved theme
    const spinnerColor = resolvedTheme === 'dark' ? 'white' : 'black'; // Determine color

    return (
        <div className="flex justify-center items-center h-screen">
            {/* Pass the dynamic color */}
            <Bouncy size="35" speed="1.75" color={spinnerColor} />
        </div>
    );
}