type Callback = Parameters<Document["addEventListener"]>[1];
const onPageLoad = (cb: Callback) =>
    document.addEventListener("DOMContentLoaded", cb);

export { onPageLoad };
