import Badge from "../ui/Badge";
import { ratingLabel, ratingColor } from "../../lib/formatters";

interface AiAnalysisBadgeProps {
  rating: string;
  score?: number | null;
}

export default function AiAnalysisBadge({ rating, score }: AiAnalysisBadgeProps) {
  const color = ratingColor(rating);

  return (
    <Badge className={`${color} text-white`}>
      {ratingLabel(rating)}
      {score != null && ` ${score}`}
    </Badge>
  );
}
