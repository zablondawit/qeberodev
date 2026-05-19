// @ts-check
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { githubProfileIntegration } from "./integrations/github";

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },
    site: "https://qebero.dev",
    integrations: [icon(), react(), githubProfileIntegration()],
});
