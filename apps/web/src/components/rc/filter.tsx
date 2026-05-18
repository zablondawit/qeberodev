import type { CollectionEntry } from "astro:content";
import { useEffect, useMemo, type FC } from "react";
import "@/components/web-components/article-card";
import { useStore } from "@nanostores/react";
import { ArticleCard } from "./article-card";
import { $filterBy, $savedPosts } from "@/store";

const NoArticleFound: FC = () => {
    return (
        <section className="h-[60vh]">
            <h1>No articles found.</h1>
        </section>
    );
};

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
    const filterBy = useStore($filterBy);
    const savedPostIds = useStore($savedPosts);
    // Filter out draft articles
    const articles = props.articles.filter((a) => !a.data.draft);

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

    const filterByCategory = (
        articles: CollectionEntry<"articles">[],
        category: string,
    ) => {
        return articles.filter((article) => {
            if (!category) return false;
            if (category === "all") return true;

            return (
                category.toLowerCase() === article.data.category?.toLowerCase()
            );
        });
    };

    const filteredArticles = useMemo(() => {
        switch (filterBy?.type) {
            case "search":
                return filterBySearch(articles, filterBy.query);
            case "category":
                return filterByCategory(articles, filterBy.category);
            case "saved":
                return articles.filter((article) =>
                    savedPostIds.includes(article.id),
                );
            case "none":
            default:
                return articles.filter((article) => !article.data.draft);
        }
    }, [filterBy]);

    return (
        <>
            {!filteredArticles.length && <NoArticleFound />}

            {filteredArticles.map((article) => (
                <ArticleCard key={article.data.slug} article={article} />
            ))}
        </>
    );
};

export { FilterComponent };
