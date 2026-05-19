import type { z } from "astro/zod";
import type { ArticleFrontmatter } from "../types/frontmatter";
import { join } from "path/posix";

type PageMetadata = {
    slug: string;
    author: string;
    canonical: string;
    description: string;
    og: {
        title: string;
        type: string;
        url: string;
        description: string;
        image: string;
    };
    article: {
        published_time: string;
        modified_time: string;
        author: string;
    };
    twitter: {
        card: string;
        title: string;
        description: string;
        image: string;
    };
};
const generatePageMetadata = (f: z.infer<typeof ArticleFrontmatter>) => {
    const meta: PageMetadata = {
        slug: f.slug || "",
        article: {
            author: f.author?.name || "Qebero",
            modified_time: f.updated
                ? f.updated.toISOString()
                : f.date.toISOString(),
            published_time: f.date.toISOString(),
        },
        author: f.author?.name || "Qebero",
        canonical: f.canonical_url || "",
        description: f.meta_description || f.description,
        og: {
            description: f.meta_description || f.description,
            image: f.og_image || "",
            title: f.meta_title || f.title,
            type: "article",
            url: f.canonical_url || "",
        },
        twitter: {
            card: "summary_large_image",
            description: f.meta_description || f.description,
            image: f.og_image || "",
            title: f.meta_title || f.title,
        },
    };

    return meta;
};

/**
 * for regular pages, the og image is generated at build time and stored in the public folder
 */
const getPageOGLink = (page: string, origin: string) =>
    new URL(join("og", `page_${page}.png`), origin);

export { generatePageMetadata, getPageOGLink };
export type { PageMetadata };
