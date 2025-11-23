/**
 * Google Tag Manager Installation Snippets
 * HTML snippets to be added to the application
 */

/**
 * Get GTM head snippet (to be placed in <head>)
 */
export function getGTMHeadSnippet(gtmId: string): string {
  return `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->
  `.trim();
}

/**
 * Get GTM body snippet (to be placed immediately after opening <body>)
 */
export function getGTMBodySnippet(gtmId: string): string {
  return `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
  `.trim();
}

/**
 * Get React GTM component code
 */
export function getReactGTMComponent(): string {
  return `
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface GTMProps {
  gtmId: string;
}

export function GTMProvider({ gtmId }: GTMProps) {
  const location = useLocation();

  useEffect(() => {
    // Initialize GTM on mount
    const script = document.createElement('script');
    script.innerHTML = \`
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','\${gtmId}');
    \`;
    document.head.appendChild(script);

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = \`https://www.googletagmanager.com/ns.html?id=\${gtmId}\`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [gtmId]);

  useEffect(() => {
    // Track page views on route change
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: location.pathname,
        page_location: window.location.href,
      });
    }
  }, [location]);

  return null;
}
  `.trim();
}

/**
 * Get Next.js GTM setup code
 */
export function getNextJSGTMSetup(): string {
  return `
// _app.tsx or layout.tsx

import Script from 'next/script';

export default function App({ Component, pageProps }) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <>
      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: \`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','\${GTM_ID}');
          \`,
        }}
      />

      <noscript>
        <iframe
          src={\`https://www.googletagmanager.com/ns.html?id=\${GTM_ID}\`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      <Component {...pageProps} />
    </>
  );
}
  `.trim();
}

/**
 * Installation instructions
 */
export const INSTALLATION_INSTRUCTIONS = `
# Google Tag Manager Installation Guide

## 1. Get Your GTM Container ID

1. Go to https://tagmanager.google.com/
2. Create a new container or select existing one
3. Copy your Container ID (format: GTM-XXXXXXX)

## 2. Install GTM Snippet

### Option A: HTML (Static Sites)

Add this code to the <head> of your HTML:

\`\`\`html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
\`\`\`

Add this code immediately after opening <body> tag:

\`\`\`html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
\`\`\`

### Option B: React

1. Install the GTM tracking library
2. Import and use the GTMProvider component
3. Track events using the provided functions

### Option C: Next.js

Use the Script component from next/script for optimal loading.

## 3. Configure GTM Container

### Add Variables:
- Click ID variables (fbclid, gclid, ttclid)
- UTM parameters (utm_source, utm_medium, utm_campaign)
- User ID variable
- Page URL variable

### Add Triggers:
- Page View - All Pages
- Registration Started
- Registration Completed
- Profile Completed
- Subscription Purchased

### Add Tags:
- Meta Pixel
- TikTok Pixel
- Google Ads Conversion
- Google Analytics 4

## 4. Test Installation

1. Use GTM Preview mode
2. Visit your site
3. Verify events are firing
4. Check data layer variables

## 5. Publish Container

Once testing is complete, publish your GTM container to production.
`;

export default {
  getGTMHeadSnippet,
  getGTMBodySnippet,
  getReactGTMComponent,
  getNextJSGTMSetup,
  INSTALLATION_INSTRUCTIONS,
};
