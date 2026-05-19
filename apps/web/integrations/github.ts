import type { AstroIntegration } from "astro";
import {
    fetchGithubProfiles,
    cleanGithubProfiles,
} from "../scripts/fetch-profile";

function githubProfileIntegration(): AstroIntegration {
    return {
        name: "github-profile",
        hooks: {
            "astro:build:start": async () => {
                const opts = {
                    outDir: "public/github",
                    usernames: ["zablondawit"],
                };

                await cleanGithubProfiles(opts);
                await fetchGithubProfiles(opts);
            },
        },
    };
}

export { githubProfileIntegration };
