import { atom } from "nanostores";

const $categories = atom<string[]>([
    "All",
    "Web Development",
    "Mobile Development",
    "Data Science",
]);

export { $categories };
