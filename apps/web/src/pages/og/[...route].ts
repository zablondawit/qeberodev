import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";
import type { CanvasKit } from "canvaskit-wasm/full";
import Contact from "../contact.astro";

type RGBColor = [number, number, number];
interface FontConfig {
    /** RGB text color. Default: `[255, 255, 255]` */
    color?: RGBColor;
    /** Font size. Title default is `70`, description default is `40`. */
    size?: number;
    /** Font weight. Make sure you provide a URL for the matching font weight. */
    weight?: Exclude<keyof CanvasKit["FontWeight"], "values">;
    /** Line height, a.k.a. leading. */
    lineHeight?: number;
    /**
     * Font families to use to render this text. These must be loaded using the
     * top-level `fonts` config option.
     *
     * Similar to CSS, this operates as a “font stack”. The first family in the
     * list will be preferred with next entries used if a glyph isn’t in earlier
     * families. Useful for providing fallbacks for different alphabets etc.
     *
     * Example: `['Noto Sans', 'Noto Sans Arabic']`
     */
    families?: string[];
}
const fontConfig: FontConfig = {
    families: ["Fira Sans", "Arial", "sans-serif"],
    color: [0, 0, 0],
};

type PageMap = Record<string, { title: string; description: string }>;

const articlePages: PageMap = (await getCollection("articles")).reduce(
    (acc, { data: { slug, title, description } }) => {
        if (!slug) return acc;
        acc[slug] = {
            title,
            description,
        };

        return acc;
    },
    {} as Record<string, { title: string; description: string }>,
);

const regularPages: PageMap = (() => {
    const pages = {
        index: {
            title: "qebero.dev - Build solutions your brand deserves",
            description:
                "Qebero is a blog about software development, technology, and more.",
        },
        about: {
            title: "About - qebero.dev",
            description: "Learn more about Qebero and the team behind it.",
        },
        contact: {
            title: "Contact - qebero.dev",
            description: "Get in touch with the Qebero team.",
        },
        legal: {
            title: "Legal - qebero.dev",
            description: "Read the legal information about using Qebero.",
        },
        articles: {
            title: "Articles - qebero.dev",
            description:
                "Read our latest articles on software development and technology.",
        },
    };

    // change keys to include a unique prefix to avoid conflicts with article slugs
    const prefixedPages: PageMap = {};
    for (const [key, value] of Object.entries(pages)) {
        prefixedPages[`page_${key}`] = value;
    }

    return prefixedPages;
})();

export const { getStaticPaths, GET } = await OGImageRoute({
    param: "route",

    pages: { ...articlePages, ...regularPages },

    getImageOptions: (_path, { title, description }) => ({
        title,
        description,
        bgImage: {
            path: "./src/assets/images/og-background.png",
            fit: "cover",
        },
        logo: {
            path: "./src/assets/images/og-logo.png",
            size: [200],
        },
        fonts: [
            "./src/assets/fonts/firasans/FiraSans-Regular.ttf",
            "./src/assets/fonts/firasans/FiraSans-Bold.ttf",
            "./src/assets/fonts/firasans/FiraSans-Light.ttf",
            "./src/assets/fonts/firasans/FiraSans-ExtraLight.ttf",
        ],
        font: {
            title: {
                ...fontConfig,
                weight: "ExtraLight",
            },
            description: {
                ...fontConfig,
                weight: "Light",
            },
        },
    }),
});
