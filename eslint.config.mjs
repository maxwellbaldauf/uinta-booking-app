import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
    // Maintenance scripts — plain Node, not part of the Next app or its lint rules.
    { ignores: ["scripts/**"] },
    {
        extends: [...nextCoreWebVitals],
    },
]);