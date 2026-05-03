declare global {
    declare class ArticleSearchElement extends HTMLElement {
        dispatchSearch(query: string): void;
    }
    interface ArticleSearchChangeDetail {
        query: string;
    }

    declare class ArticleSearchEvent extends CustomEvent<ArticleSearchChangeDetail> {}

    interface HTMLElementTagNameMap {
        "c-article-search": ArticleSearchElement;
    }

    interface GlobalEventHandlersEventMap {
        "search-change": ArticleSearchEvent;
    }
}

export {};
