import { formatArticleCardDate } from "@/lib/datetime";
import type { CollectionEntry } from "astro:content";
import type { FC } from "react";
import "../../styles/components/article/card.css";
import "@/components/web-components/article-card";

type ArticleCardProps = {
    article: CollectionEntry<"articles">;
};
export const ArticleCard: FC<ArticleCardProps> = ({ article }) => {
    const publishedDate = formatArticleCardDate(article.data.date);

    return (
        <c-article-card className="card">
            <h3 className="title">
                <a href={`/articles/${article.id}`}>{article.data.title}</a>
            </h3>
            <p className="description">{article.data.description}</p>
            <small className="date">{publishedDate}</small>
        </c-article-card>
    );
};
