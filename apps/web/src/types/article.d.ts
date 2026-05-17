import { DOMAttributes } from "react";

/**
 * Article related data types
 */

interface ArticleSearchEventMap extends HTMLElementEventMap {
    "search-change": ArticleSearchEvent;
}

declare global {
    declare class ArticleSearchElement extends HTMLElement {
        dispatchSearch(query: string): void;

        addEventListener<K extends keyof ArticleSearchEventMap>(
            type: K,
            listener: (
                this: ArticleSearchElement,
                ev: ArticleSearchEventMap[K],
            ) => any,
            options?: boolean | AddEventListenerOptions,
        );
        removeEventListener<K extends keyof ArticleSearchEventMap>(
            type: K,
            listener: (
                this: ArticleSearchElement,
                ev: ArticleSearchEventMap[K],
            ) => any,
            options?: boolean | AddEventListenerOptions,
        );
    }

    interface ArticleCardProps {
        id: string;
        title: string;
        description: string;
        publishedDate: string;
    }
    declare class ArticleCardElement extends HTMLElement {
        /**
         * Update the article card with new data
         * @param data The article data to update the card with
         */
        update(data: ArticleCardProps): void;
    }

    interface ArticleSearchOptions {
        quickSearch: boolean;
    }

    interface ArticleSearchChangeDetail {
        query: string;
        options: ArticleSearchOptions;
    }

    declare class ArticleSearchEvent extends CustomEvent<ArticleSearchChangeDetail> {}

    interface HTMLElementTagNameMap {
        "c-article-search": ArticleSearchElement;
        "c-article-card": ArticleCardElement;
    }

    interface GlobalEventHandlersEventMap {}
}

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "c-article-card": React.DetailedHTMLProps<
                React.HTMLAttributes<ArticleCardElement>,
                ArticleCardElement
            >;
        }
    }
}

export {};
