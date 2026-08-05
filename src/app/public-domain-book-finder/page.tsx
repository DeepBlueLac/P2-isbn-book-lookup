import { permanentRedirect } from "next/navigation";

export default function PublicDomainBookFinderPage() {
  permanentRedirect("/downloadable-book-files");
}
