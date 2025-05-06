import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import yangoIcon from "@/components/icons/yango.webp";

interface YangoButtonProps {
    href: string;
    altText?: string;
    className?: string;
}

export const YangoButton: React.FC<YangoButtonProps> = ({
    href,
    altText = "Get a ride with Yango",
    className = "",
}) => {
    return (
        <Button
            asChild
            variant="default"
            size="icon"
            className={`bg-red-600 hover:bg-red-700 p-1.5 ${className}`} // Adjusted padding for a slightly tighter fit
        >
            <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={altText}>
                <Image src={yangoIcon} alt="Yango Icon" width={20} height={20} /> {/* Adjusted size slightly */}
            </Link>
        </Button>
    );
}; 