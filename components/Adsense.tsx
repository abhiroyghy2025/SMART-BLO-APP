import React, { useEffect } from 'react';

const SCRIPT_SRC = '//pl27957115.effectivegatecpm.com/3b12c4fb84b37d8f2ae3d75accaf9e0a/invoke.js';
const CONTAINER_ID = 'container-3b12c4fb84b37d8f2ae3d75accaf9e0a';

export const Adsense: React.FC = () => {
    useEffect(() => {
        // Check if a script with this source already exists to avoid duplicates
        if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
            // If the script already exists, some ad networks require a function call
            // to refresh the ad. Without documentation, we assume the script handles this.
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.dataset.cfasync = 'false';
        script.src = SCRIPT_SRC;

        document.head.appendChild(script);

        // Cleanup: It's often best not to remove ad scripts, as they manage their own state.
        // The check at the start of the effect prevents re-adding.
        return () => {
            // Optional cleanup logic if needed
        };
    }, []);

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/50 border-t border-slate-700/50 backdrop-blur-sm flex flex-col overflow-y-auto max-h-64 md:max-h-80">
            <div className="w-full flex-1 flex justify-center items-center text-xs text-slate-500 p-2 border-b border-slate-700/50">
                Advertisement
            </div>
            <div id={CONTAINER_ID} className="w-full flex-1 flex justify-center items-center text-xs text-slate-500 p-2">
                {/* Advertisement injected here by script */}
            </div>
        </footer>
    );
};