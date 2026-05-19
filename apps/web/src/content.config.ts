import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { ArticleFrontmatter } from "./types/frontmatter";

const articles = defineCollection({
    loader: glob({
        pattern: "**/*.md",
        base: "./src/data/articles",
    }),
    schema: ArticleFrontmatter,
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

const teams = defineCollection({
    loader: file("./src/data/team/team_members.json", {
        parser: (text) => JSON.parse(text),
    }),
    schema: z.object({
        name: z.string(),
        username: z.string(),
        linkedin: z.string(),
        role: z.string(),
        github: z.string(),
    }),
});

export const collections = {
    articles,
    general,
    legal,
    teams,
};
