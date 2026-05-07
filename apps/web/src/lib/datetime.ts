import { format, formatDistance, subDays } from "date-fns";

// Date Related
// author: Zablon Dawit

const formatArticleCardDate = (date: Date) => {
    console.log({
        date,
    });

    return format(date, "MMMM d, yyyy");
};

export { formatArticleCardDate };
