import { z } from "astro/zod";

export const Frontmatter = z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    // optional published/updated times
    updated: z.date().optional(),

    // author object (name required when author present)
    author: z
        .object({
            name: z.string(),
            url: z.string().optional(),
            avatar: z.string().optional(),
        })
        .optional(),

    tags: z.array(z.string()),

    // optional lists / taxonomy
    categories: z.array(z.string()).optional(),

    // content controls
    slug: z.string().optional(),
    draft: z.boolean().optional().default(false),
    layout: z.string().optional(),

    // presentation / hero
    cover: z.string().optional(),
    toc: z.boolean().optional(),
    reading_time: z.number().optional(),
    lang: z.string().optional(),
    weight: z.number().optional(),

    // SEO / social
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    og_image: z.string().optional(),
    canonical_url: z.string().optional(),

    // series or collection grouping
    series: z.string().optional(),
});
