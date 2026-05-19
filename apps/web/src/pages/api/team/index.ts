import { getCollection } from "astro:content";

export async function GET() {
    const isDev = import.meta.env.DEV;
    const site = isDev ? "http://localhost:4321" : import.meta.env.SITE;

    const teamMembersCollection = await getCollection("teams");
    const responseData = {
        members: teamMembersCollection.map(({ id, data }) => ({
            id,
            // should also work in dev
            avatar: `${site}/github/${data.username}/avatar.jpg`,
            ...data,
        })),
    };

    return new Response(JSON.stringify(responseData, null, 2), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 200,
        statusText: "OK",
    });
}
