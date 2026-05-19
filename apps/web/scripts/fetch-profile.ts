import { log } from "node:console";
import fs from "node:fs";
import { join } from "path";

/** GitHub user profile data */
type GitHubProfileDetails = {
    /** Unique handle/username */
    login: string;
    /** Numeric ID */
    id: number;
    /** Global node ID for GraphQL */
    node_id: string;
    /** Image URL for profile picture */
    avatar_url: string;
    /** Legacy Gravatar ID */
    gravatar_id: string;
    /** API endpoint for user */
    url: string;
    /** Profile web URL */
    html_url: string;
    /** API endpoint for followers */
    followers_url: string;
    /** API template for following */
    following_url: string;
    /** API template for gists */
    gists_url: string;
    /** API template for starred repos */
    starred_url: string;
    /** API endpoint for subscriptions */
    subscriptions_url: string;
    /** API endpoint for organizations */
    organizations_url: string;
    /** API endpoint for repositories */
    repos_url: string;
    /** API template for events */
    events_url: string;
    /** API endpoint for received events */
    received_events_url: string;
    /** Account type (e.g., User, Organization) */
    type: string;
    /** Profile visibility status */
    user_view_type: string;
    /** Admin status flag */
    site_admin: boolean;
    /** Full display name */
    name: string | null;
    /** Employer or organization */
    company: string | null;
    /** Personal website URL */
    blog: string | null;
    /** Geographic location */
    location: string | null;
    /** Public email address */
    email: string | null;
    /** Job seeking status */
    hireable: boolean | null;
    /** Profile biography text */
    bio: string | null;
    /** Twitter/X handle */
    twitter_username: string | null;
    /** Count of public repositories */
    public_repos: number;
    /** Count of public gists */
    public_gists: number;
    /** Count of followers */
    followers: number;
    /** Count of following */
    following: number;
    /** Account creation timestamp (ISO 8601) */
    created_at: string;
    /** Last update timestamp (ISO 8601) */
    updated_at: string;
};

async function fetchUserProfile(outDir: string, username: string) {
    const PROFILE_URL = `https://api.github.com/users/${username}`;

    const data = await fetch(PROFILE_URL);
    const json = (await data.json()) as GitHubProfileDetails;
    const {
        avatar_url,
        hireable,
        name,
        html_url: url,
        email,
        twitter_username,
    } = json;
    const avatarBuffer = await fetch(avatar_url).then((r) => r.arrayBuffer());

    return {
        profile_details: {
            url,
            name,
            email,
            hireable,
            twitter_username,
        },
        avatarBuffer,
    };
}

/**
 * Fetches the GitHub profile of the user "zablondawit" and saves the avatar image to the specified output directory.
 *
 * @param outDir - The directory where the avatar image will be saved. The file will be named "avatar.jpg".
 */
type FetchGithubProfileOptions = {
    outDir: string;
    usernames: string[];
};
async function fetchGithubProfiles(options: FetchGithubProfileOptions) {
    const { outDir, usernames } = options;

    for (const username of usernames) {
        const profile = await fetchUserProfile(outDir, username);
        const { avatarBuffer, profile_details } = profile;

        const userOutDir = join(outDir, username);
        const AVATAR_OUT_FILE = join(userOutDir, "avatar.jpg");
        const PROFILE_OUT_FILE = join(userOutDir, "profile.json");

        if (!fs.existsSync(userOutDir)) {
            fs.mkdirSync(userOutDir, { recursive: true });
        }

        // Save the avatar image to the output directory
        fs.writeFileSync(AVATAR_OUT_FILE, Buffer.from(avatarBuffer));
        // Save the profile details as JSON to the output directory
        fs.writeFileSync(
            PROFILE_OUT_FILE,
            JSON.stringify(profile_details, null, 2),
        );
    }
}

type CleanGithubProfilesOptions = {
    outDir: string;
};
async function cleanGithubProfiles(options: CleanGithubProfilesOptions) {
    const { outDir } = options;

    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
        log(`Cleaning up GitHub profile directory:`, outDir);
    } else {
        log(`GitHub profile directory  does not exist:`);
    }
    // const GITHUB_PROFILES_DIR = join(process.cwd(), "public/github");
    // log("Cleaning GitHub profiles directory:", GITHUB_PROFILES_DIR);
}

export { fetchGithubProfiles, cleanGithubProfiles };
