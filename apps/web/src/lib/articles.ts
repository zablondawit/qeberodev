import { getCollection, type CollectionEntry } from "astro:content";
import { compareAsc } from "date-fns";

const retrieveArticles = async () => {
    const articles = await getCollection("articles");

    const filterArticles: Parameters<
        Array<CollectionEntry<"articles">>["filter"]
    >[0] = (article, index, arr) => {
        return !article.data.draft;
    };

    const sortArticles: Parameters<
        Array<CollectionEntry<"articles">>["sort"]
    >[0] = (first, second) => compareAsc(first.data.date, second.data.date);

    const filteredArticles = articles.filter(filterArticles);
    filteredArticles.sort(sortArticles);

    return filterArticles;
};

export { retrieveArticles };
