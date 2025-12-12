/**
 * BackstopJS onBefore script
 * Runs before each scenario
 */

module.exports = async (page, scenario, vp) => {
  console.log(`SCENARIO > ${scenario.label}`);

  // Set cookies for authenticated scenarios
  if (scenario.cookiePath) {
    const cookies = require(scenario.cookiePath);
    await page.setCookie(...cookies);
  }

  // Disable animations for consistent screenshots
  await page.evaluateOnNewDocument(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Set viewport
  await page.setViewport({
    width: vp.width,
    height: vp.height,
  });

  // Block external resources for faster tests
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    const url = request.url();

    // Block analytics and ads
    if (
      url.includes('google-analytics.com') ||
      url.includes('googletagmanager.com') ||
      url.includes('facebook.com/tr') ||
      resourceType === 'font'
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
};
