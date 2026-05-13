import { format } from "date-fns";

// Date Related
// author: Zablon Dawit

const formatArticleCardDate = (date: Date) => {
    return format(date, "MMMM d, yyyy");
};

export { formatArticleCardDate };
