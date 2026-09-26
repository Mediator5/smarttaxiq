import type { Metadata } from "next";
import "./academy.css";

/**
 * The Academy route segment.
 *
 * Exists to do two things the pages underneath should not each repeat: pull in
 * the course stylesheet once, and keep the whole section out of search
 * results. It is a private training area for five named people, not content.
 */
export const metadata: Metadata = {
  title: "Tax Academy",
  robots: { index: false, follow: false, nocache: true },
};

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="academy">{children}</div>;
}
