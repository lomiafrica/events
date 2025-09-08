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
      className={`inline-flex items-center justify-center px-6 py-2 h-8 w-20 rounded-xs text-sm font-bold bg-red-600 text-white ${className}`}
    >
      {buttonText}
    </Link>
  );
};
