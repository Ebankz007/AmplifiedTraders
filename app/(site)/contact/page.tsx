import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { ContactForm } from "@/components/site/contact-form";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Amplified Traders team.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Contact Amplified Traders"
        lead="Questions about the platform, partnerships or participation — we're here to help."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-display text-lg font-bold">Reach us</h2>
              <div className="mt-4 space-y-3 text-sm text-muted">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-brand" />
                  <div>
                    <p className="text-foreground">Support</p>
                    <p>support@amplifiedtraders.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-brand" />
                  <div>
                    <p className="text-foreground">General enquiries</p>
                    <p>hello@amplifiedtraders.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-brand" />
                  <div>
                    <p className="text-foreground">Phone</p>
                    <p>—</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-brand" />
                  <div>
                    <p className="text-foreground">Address</p>
                    <p>—</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <h2 className="font-display text-lg font-bold">Response time</h2>
              <p className="mt-2 text-sm text-muted">
                We aim to respond to support tickets within one business day.
                General enquiries are handled during business hours.
              </p>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold">Send a message</h2>
            <p className="mt-2 text-sm text-muted">
              All messages are recorded. Please avoid sharing sensitive
              credentials or payment details.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
