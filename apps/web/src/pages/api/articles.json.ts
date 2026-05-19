import { getCollection } from "astro:content";

export async function GET() {
    // TODO: sanitize the articles, we don't want to send the whole content of the article
    // Sanitize the articles,
    // no need for rendered HTML stuff
    // and we don't want to send the whole content of the article
    const articles = await getCollection("articles");
    const response = articles.map((article) => ({
        ...article,
        filePath: undefined,
    }));

    return new Response(JSON.stringify(response, null, 2), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 200,
        statusText: "OK",
    });
}
