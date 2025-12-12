/**
 * BackstopJS onReady script
 * Runs when page is ready for screenshot
 */

module.exports = async (page, scenario, vp) => {
  console.log(`READY > ${scenario.label}`);

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  // Wait for images to load
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const images = Array.from(document.images);
      let loadedCount = 0;

      if (images.length === 0) {
        resolve();
        return;
      }

      images.forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === images.length) {
            resolve();
          }
        } else {
          img.addEventListener('load', () => {
            loadedCount++;
            if (loadedCount === images.length) {
              resolve();
            }
          });
          img.addEventListener('error', () => {
            loadedCount++;
            if (loadedCount === images.length) {
              resolve();
            }
          });
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => resolve(), 5000);
    });
  });

  // Hide dynamic content that changes (timestamps, etc.)
  await page.evaluate(() => {
    // Hide elements with timestamps
    const timestampElements = document.querySelectorAll('[data-timestamp]');
    timestampElements.forEach((el) => {
      el.style.visibility = 'hidden';
    });

    // Hide cursor/caret in input fields
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
      input.style.caretColor = 'transparent';
    });
  });

  // Additional wait for scenario-specific delays
  if (scenario.delay) {
    await page.waitForTimeout(scenario.delay);
  }

  // Scroll to selector if specified
  if (scenario.scrollToSelector) {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }, scenario.scrollToSelector);
  }
};
