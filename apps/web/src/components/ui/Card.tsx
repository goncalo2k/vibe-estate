interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
