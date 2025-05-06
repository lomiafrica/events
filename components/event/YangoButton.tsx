import Link from "next/link";

interface YangoButtonProps {
  href: string;
  altText?: string;
  buttonText?: string;
  className?: string;
}

export const YangoButton: React.FC<YangoButtonProps> = ({
  href,
  altText = "Get a ride with Yango",
  buttonText = "Yango",
  className = "",
}) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={altText}
      className={`inline-flex items-center justify-center px-4 py-2 h-7 w-15 rounded-sm text-xs font-bold bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${className}`}
    >
      {buttonText}
    </Link>
  );
};
