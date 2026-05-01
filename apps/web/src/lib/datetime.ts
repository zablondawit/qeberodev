import { formatDistance, subDays } from "date-fns";

// Date Related
// author: Zablon Dawit

const formatArticleCardDate = (date: Date) => {
  return formatDistance(subDays(date, 7), date, { addSuffix: true });
};

export { formatArticleCardDate };
