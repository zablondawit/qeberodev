import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

type PostKey = string;

const $searchQuery = atom<string>("");
const $savedPosts = persistentAtom<PostKey[]>("", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export { $searchQuery, $savedPosts };
