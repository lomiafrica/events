import type { Metadata } from 'next';
import TermsClientPage from './terms-client';

export const metadata: Metadata = {
    title: "Terms",
    description: "Understand the Terms and Conditions for engaging with Djaouli Entertainment, Abidjan's pioneering alternative Hip-Hop & Electronic music collective and event organizer.",
};

export default function Page() {
    return <TermsClientPage />;
}