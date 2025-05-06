import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms and Conditions | Djaouli Ent.",
    description: "Terms and Conditions for Djaouli Ent., an Alternative Music Project from Abidjan.",
};

export default function TermsAndConditionsPage() {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <>
            <Header />
            <main className="bg-background text-gray-300">
                <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-center text-white">Terms and Conditions</h1>
                    <div className="text-center mb-8 md:mb-12">
                        <span className="inline-block bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-medium">Last Updated: {today}</span>
                    </div>

                    <div className="prose prose-invert max-w-3xl mx-auto">
                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Introduction</h2>
                        <p>Welcome to Djaouli Ent. (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms and Conditions (&quot;Terms&quot;) govern your use of our website, services, and attendance at our events. By accessing our services or purchasing tickets to our events, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access our services or attend our events.</p>
                        <p className="mt-4">Our services primarily involve organizing and promoting alternative music events and experiences. These Terms outline your rights and obligations when interacting with Djaouli Ent.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Use of Our Services</h2>
                        <p>You agree to use our website and services only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else&apos;s use and enjoyment of Djaouli Ent. Prohibited behavior includes harassing or causing distress or inconvenience to any person, transmitting obscene or offensive content, or disrupting the normal flow of dialogue within our services.</p>
                        <p className="mt-4">When registering for events or creating an account, you must provide information that is accurate, complete, and current. You are responsible for maintaining the confidentiality of your account information, including your password.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Event Tickets and Admission</h2>
                        <p>All ticket sales for Djaouli Ent. events are subject to availability and any specific terms and conditions provided at the time of purchase (e.g., age restrictions, specific entry requirements).</p>
                        <p className="mt-4">Tickets are generally non-refundable and non-transferable, except as required by applicable law or as explicitly stated by Djaouli Ent. for a particular event. We reserve the right to cancel or reschedule events; in such cases, our refund policy or exchange options will be communicated to ticket holders.</p>
                        <p className="mt-4">We reserve the right to refuse admission or eject any person whose conduct is deemed by us to be disorderly, who fails to comply with these Terms or specific event rules, or who is a risk to the safety or enjoyment of others. No refunds will be offered to refused or ejected individuals in such circumstances.</p>
                        <p className="mt-4">Attendees must comply with all venue regulations, health and safety guidelines, and instructions from event staff.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Intellectual Property</h2>
                        <p>All content on our website and related to our events, including text, graphics, logos, images, audio clips, digital downloads, and software, is the property of Djaouli Ent. or its content suppliers and protected by international copyright and trademark laws. You may not reproduce, duplicate, copy, sell, resell, or exploit any portion of the service or event content without express written permission from us.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">User Content</h2>
                        <p>If you post content or submit material (e.g., comments, photos at events if shared with us), and unless we indicate otherwise, you grant Djaouli Ent. a nonexclusive, royalty-free, perpetual, irrevocable, and fully sublicensable right to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content throughout the world in any media, primarily for promoting Djaouli Ent.</p>
                        <p className="mt-4">You represent and warrant that you own or otherwise control all of the rights to the content that you post; that the content is accurate; that use of the content you supply does not violate this policy and will not cause injury to any person or entity; and that you will indemnify Djaouli Ent. for all claims resulting from content you supply.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Limitation of Liability</h2>
                        <p>Djaouli Ent. will not be liable for any damages of any kind arising from the use of our services or attendance at our events, including, but not limited to direct, indirect, incidental, punitive, and consequential damages, unless otherwise specified in writing. Your attendance at our events is at your own risk.</p>
                        <p className="mt-4">We do not warrant that the website, its servers, or e-mail sent from Djaouli Ent. are free of viruses or other harmful components. We strive to provide a secure environment but cannot guarantee absolute security.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Indemnification</h2>
                        <p>You agree to indemnify, defend, and hold harmless Djaouli Ent., its officers, directors, employees, agents, licensors, and suppliers from and against all losses, expenses, damages, and costs, including reasonable attorneys&apos; fees, resulting from any violation of these Terms or any activity related to your account (including negligent or wrongful conduct) by you or any other person accessing the service using your account.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Governing Law</h2>
                        <p>These Terms and any dispute or claim arising out of or in connection with them or their subject matter or formation (including non-contractual disputes or claims) shall be governed by and construed in accordance with the laws of Côte d&apos;Ivoire.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Changes to These Terms</h2>
                        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will make reasonable efforts to provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
                        <p className="mt-4">By continuing to access or use our Service or attend our events after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, in whole or in part, please stop using the website and our services.</p>

                        <h2 className="text-2xl text-gray-100 font-semibold tracking-tight mt-8 mb-4 pb-2 border-b border-gray-700">Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us at [Your Legal Contact Email, e.g., legal@djaoulient.com].</p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}