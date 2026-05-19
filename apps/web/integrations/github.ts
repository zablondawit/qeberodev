import type { AstroIntegration } from "astro";
import {
    fetchGithubProfiles,
    cleanGithubProfiles,
} from "../scripts/fetch-profile";
import { join } from "node:path";
import fs from "node:fs";
import { z } from "astro/zod";

const githubProfilesIntegration = async () => {
    const teamDir = "src/data/team";
    const teamFile = "team_members.json";
    const teamFilePath = join(teamDir, teamFile);

    const schema = z.object({
        name: z.string(),
        username: z.string(),
        linkedin: z.string(),
        role: z.string(),
    });
    type TeamMembersList = Record<string, z.infer<typeof schema>>;
    const team = JSON.parse(
        fs.readFileSync(teamFilePath).toString(),
    ) as TeamMembersList;
    const usernames = Object.values(team).map((member) => member.username);

    const opts = {
        outDir: "public/github",
        usernames,
    };

    // Disable for now to avoid unnecessary API calls during development. Enable when needed.
    false && (await cleanGithubProfiles(opts));
    await fetchGithubProfiles(opts);
};

/**
 * An Astro integration that fetches and saves GitHub profiles
 * during both development and production builds.
 *
 * NOTE: For development server, this integration only works
 * if server is restarted after making changes to the list of
 * GitHub usernames in the `usernames` array.
 */
function githubProfileIntegration(): AstroIntegration {
    return {
        name: "github-profile",
        hooks: {
            "astro:server:start": githubProfilesIntegration,
            "astro:build:start": githubProfilesIntegration,
        },
    };
}

export { githubProfileIntegration };
