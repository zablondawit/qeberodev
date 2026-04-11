import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/articles",
  }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = {
  articles,
};
