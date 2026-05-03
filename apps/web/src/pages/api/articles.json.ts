import { getCollection } from "astro:content";

export async function GET() {
    // Sanitize the articles,
    // no need for rendered HTML stuff
    // and we don't want to send the whole content of the article
    const articles = await getCollection("articles");
    return new Response(JSON.stringify(articles, null, 2), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
