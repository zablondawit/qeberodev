import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { ArticleFrontmatter } from "./types/frontmatter";
import { parse } from "yaml";

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

const team = defineCollection({
    loader: file("./src/data/team/team_members.yml", {
        parser: (text) => parse(text),
    }),
    schema: z
        .object({
            name: z.string(),
            username: z.string(),
            linkedin: z.string(),
            role: z.string(),
            github: z.string(),
            description: z.object({
                about: z.array(z.string()),
            }),
        })
        .transform((member) => {
            const site = import.meta.env.DEV
                ? "http://localhost:4321"
                : import.meta.env.SITE;

            return {
                ...member,
                avatar: `${site}/github/${member.username}/avatar.jpg`,
            };
        }),
});

export const collections = {
    articles,
    general,
    legal,
    team,
};
