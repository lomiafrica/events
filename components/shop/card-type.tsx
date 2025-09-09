import { CreditCard } from "lucide-react";

interface CardTypeIconProps {
  className?: string;
}

// Simple card type icons - can be expanded with actual SVG icons later
export function CardTypeIcon({ className = "w-6 h-6" }: CardTypeIconProps) {
  // For now, just return a generic credit card icon
  // In a real implementation, you'd have specific icons for Visa, Mastercard, etc.
  return <CreditCard className={`${className} opacity-75`} />;
}
