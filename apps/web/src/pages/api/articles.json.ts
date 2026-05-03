import { getCollection } from "astro:content";

export async function GET() {
  const articles = await getCollection("articles");
  return new Response(JSON.stringify(articles, null, 2), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
