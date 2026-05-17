class ArticleCardElement extends HTMLElement {
    update(props: ArticleCardProps) {
        const template = document.getElementById(
            "t-article-card",
        ) as HTMLTemplateElement;
        const content = template.content.cloneNode(true) as DocumentFragment;

        const link = content.querySelector("a");
        if (link) {
            link.href = `/articles/${props.id}`;
            link.textContent = props.title;
        }

        content.querySelector(".description")!.textContent = props.description;
        content.querySelector(".date")!.textContent = props.publishedDate;

        this.innerHTML = "";
        this.appendChild(content);
    }

    connectedCallback() {
        // Add the "card" class to the element for styling
        this.classList.add("card");
    }
}

if (!customElements.get("c-article-card")) {
    customElements.define("c-article-card", ArticleCardElement);
}

export { ArticleCardElement };
