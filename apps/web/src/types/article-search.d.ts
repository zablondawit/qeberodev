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
    }

    interface GlobalEventHandlersEventMap {}
}

export {};
