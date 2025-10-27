import React, { useEffect } from 'react';
import type { AdsenseConfig } from '../types';

declare global {
    interface Window {
        adsbygoogle: any;
    }
}

interface AdsenseProps {
    config: AdsenseConfig | null;
}

const ADSENSE_SCRIPT_ID = 'adsense-script';

export const Adsense: React.FC<AdsenseProps> = ({ config }) => {
    const publisherId = config?.publisherId;
    const adSlotId = config?.adSlotId;
    
    const isValidConfig = publisherId && publisherId.startsWith('ca-pub-') && adSlotId;

    useEffect(() => {
        if (!isValidConfig) return;
        
        // Check if script already exists
        if (document.getElementById(ADSENSE_SCRIPT_ID)) {
            return;
        }

        const script = document.createElement('script');
        script.id = ADSENSE_SCRIPT_ID;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);

    }, [publisherId, isValidConfig]);

    useEffect(() => {
        if (!isValidConfig) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('Could not push AdSense ad:', e);
        }
    }, [isValidConfig, adSlotId, publisherId]); // Rerun when config changes to push a new ad

    if (!isValidConfig) {
        return (
             <div style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '20px',
                textAlign: 'center',
                border: '1px dashed #475569',
                borderRadius: '8px',
                margin: '20px 0',
                minHeight: '90px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif',
            }}>
                <p className="font-bold">Advertisement Placeholder</p>
                <p className="text-sm mt-2">To display ads, please configure your AdSense ID in the Settings menu.</p>
            </div>
        );
    }

    return (
        <div className="adsense-container" style={{ margin: '20px auto', maxWidth: '970px', minHeight: '90px' }}>
            <ins className="adsbygoogle"
                 style={{ display: 'block', textAlign: 'center' }}
                 data-ad-client={publisherId}
                 data-ad-slot={adSlotId}
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    );
};
