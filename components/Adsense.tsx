import React, { useEffect } from 'react';

// FIX: Declare the third-party global variable to avoid TypeScript errors.
declare global {
    interface Window {
        atAsyncOptions?: {
            onAsyncAdLoaded: (element: HTMLElement | null) => void;
        };
    }
}

const SCRIPT_SRC = '//pl27957115.effectivegatecpm.com/3b12c4fb84b37d8f2ae3d75accaf9e0a/invoke.js';
const CONTAINER_ID = 'container-3b12c4fb84b37d8f2ae3d75accaf9e0a';

export const Adsense: React.FC = () => {
    useEffect(() => {
        // Check if a script with this source already exists
        if (document.head.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
            // If it exists, try to force a refresh if the container is empty.
            // This can sometimes help if the ad failed to load on a previous page view.
            if (window.atAsyncOptions) {
                try {
                    window.atAsyncOptions.onAsyncAdLoaded(document.getElementById(CONTAINER_ID));
                } catch (e) {
                    console.error("Ad refresh failed", e);
                }
            }
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = 'false';
        script.src = SCRIPT_SRC;

        document.head.appendChild(script);

    }, []);

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-700">
            <div id={CONTAINER_ID} className="h-12 overflow-hidden flex justify-center items-center">
                {/* The ad script will populate this div */}
            </div>
        </footer>
    );
};
