import type { CollectionEntry } from "astro:content";
import { useEffect, useMemo, type FC } from "react";
import "@/components/web-components/article-card";
import { useStore } from "@nanostores/react";
import { ArticleCard } from "./article-card";
import { $filterBy, $searchQuery } from "@/store";

type FilterComponentProps = {
    articles: CollectionEntry<"articles">[];
};
/**
 * Filter also includes searching, and filtering content
 *
 * 1. Search by name, description, and other relevant fields
 * 2. Filter by categories, tags, or other relevant criteria
 * 3. Sort by relevance, date, or other relevant criteria
 */
const FilterComponent: FC<FilterComponentProps> = (props) => {
    const { articles } = props;
    const filterBy = useStore($filterBy);

    const filterBySearch = (
        articles: CollectionEntry<"articles">[],
        query: string,
    ) =>
        articles.filter(
            (article) =>
                article.data.title
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                article.data.description
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                article.data.tags.some((tag) =>
                    tag.toLowerCase().includes(query.toLowerCase()),
                ),
        );

    const filteredArticles = useMemo(() => {
        if (filterBy?.type === "search") {
            const query = filterBy.query;
            return filterBySearch(articles, query);
        }

        return articles;
    }, [filterBy]);

    return (
        <>
            {filteredArticles.map((article) => (
                <ArticleCard key={article.data.slug} article={article} />
            ))}
        </>
    );
};

export { FilterComponent };
