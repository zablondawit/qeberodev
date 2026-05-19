import { getCollection } from "astro:content";

export async function GET() {
    const teamMembersCollection = await getCollection("teams");
    const responseData = {
        team: teamMembersCollection.map(({ id, data }) => ({
            id,
            details: data,
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
