import { describe, it, expect, vi } from "vitest";
import { fetchGithubProfiles } from "../fetch-profile";
import fs, { existsSync, mkdirSync, writeFileSync } from "node:fs";

vi.mock("node:fs", () => ({
    default: {
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn(),
        existsSync: vi.fn(() => true),
    },
}));

describe("fetchGithubProfiles", () => {
    it("should fetch profiles and save to outDir", async () => {
        const outDir = "./public/github/test-out";
        const usernames = ["zablondawit"];

        await fetchGithubProfiles({
            outDir: outDir,
            usernames,
        });

        // Verify directory was created and contains files
        expect(fs.writeFileSync).toHaveBeenCalled();
    }, 30000);
});
