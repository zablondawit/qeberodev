import type { FC } from "react";
import Button from "../button.astro";

export const FilterTags: FC<{ categories: string[] }> = (props) => {
    const { categories } = props;

    return (
        <section id="article-categories">
            {categories.map((category) => (
                <Button
                    variant={"outline"}
                    class="filter-btn"
                    size={"xs"}
                    data-category={category}
                >
                    {category}
                </Button>
            ))}
        </section>
    );
};
