import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { Frontmatter } from "./types/frontmatter";

const articles = defineCollection({
    loader: glob({
        pattern: "**/*.md",
        base: "./src/data/articles",
    }),
    schema: Frontmatter,
});

const legal = defineCollection({
    loader: glob({
        pattern: "**/*.md",
        base: "./src/data/legal",
    }),
});

const general = defineCollection({
    loader: glob({
        pattern: "**/*.md",
        base: "./src/data/general",
    }),
});

export const collections = {
    articles,
    general,
    legal,
};
