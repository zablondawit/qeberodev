import "@/components/web-components/article-card";
import { formatArticleCardDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { CollectionEntry } from "astro:content";
import type { FC, HTMLAttributes, PropsWithChildren } from "react";
import "../../styles/components/article/card.css";
import { type BadgeVariantProps, badgeVariants } from "../ui/badge";
import type { ClassValue } from "clsx";

type TagProps = {} & BadgeVariantProps & HTMLAttributes<HTMLSpanElement>;

const Badge: FC<PropsWithChildren<TagProps>> = (
    props = { variant: "default" },
) => {
    const { children, variant, className, ...rest } = props;

    return (
        <span
            data-role="badge"
            className={cn(badgeVariants({ variant }), "select-none", className)}
            {...rest}
        >
            {children}
        </span>
    );
};

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
            <span id="article-tags" className="flex flex-row gap-1 pt-2 pb-1">
                <Badge>{article.data?.category}</Badge>
                {article.data?.tags.map((tag) => (
                    <Badge variant={"outline"}>{tag}</Badge>
                ))}
            </span>
            <small className="date">{publishedDate}</small>
        </c-article-card>
    );
};
