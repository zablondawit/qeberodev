import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

type PostKey = string;
type FilterBy =
    | { type: "search"; query: string }
    | { type: "category"; category: string }
    | { type: "saved" }
    | { type: "none" };

const $filterBy = atom<FilterBy>({ type: "none" });
const $savedPosts = persistentAtom<PostKey[]>("", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export type { FilterBy };
export { $savedPosts, $filterBy };
