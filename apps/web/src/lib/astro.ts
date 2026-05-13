type PageLoadCallback = Parameters<(typeof document)["addEventListener"]>[1];
/**
 * A utility function to execute a callback on page load.
 * A common handler module to avoid repeating this logic
 * across different components.
 *
 * @param cb - The callback function to execute when the
 * page has loaded.
 */
const onPageLoad = (cb: PageLoadCallback) => {
    document.addEventListener("DOMContentLoaded", cb);
};

export { onPageLoad };
