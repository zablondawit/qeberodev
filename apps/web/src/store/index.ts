import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

type PostKey = string;
type FilterBy =
    | { type: "search"; query: string }
    | { type: "tag"; tag: string }
    | { type: "saved" };

const $filterBy = atom<FilterBy | undefined>();
const $searchQuery = atom<string>("");
const $savedPosts = persistentAtom<PostKey[]>("", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export { $savedPosts, $filterBy, $searchQuery };
