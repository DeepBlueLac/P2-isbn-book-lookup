"use client";

import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Check,
  ChevronRight,
  CircleEllipsis,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileText,
  FolderOpen,
  Library,
  Link2,
  LoaderCircle,
  LockKeyhole,
  ScanLine,
  Search,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookOpenText, BookmarkSimple, Eye as PhosphorEye, ShieldCheck as PhosphorShieldCheck } from "@phosphor-icons/react";
import type { Session } from "@supabase/supabase-js";
import { CinematicHome } from "@/components/cinematic-home";
import {
  formatBookSummary,
  getPrimaryAccess,
  isValidIsbn,
  normalizeIsbn,
  type AccessKind,
  type BookResult,
  type DownloadEdition,
} from "@/core/books";
import { trackProductEvent } from "@/platform/analytics";
import {
  buildShareableSearchUrl,
  parseShareableSearch,
  type SearchFilter,
  type SearchMode,
} from "@/platform/shareable-search";
import {
  getLocalBook,
  importLocalBook,
  listLocalBooks,
  loadSavedBooks,
  removeBookFromShelf,
  removeLocalBook,
  saveBookToShelf,
  type LocalBookFile,
  type SavedBook,
} from "@/platform/local-library";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

type QuotaSnapshot = {
  subject: {
    kind: "guest" | "user";
    email: string | null;
    dailyDownloads: number;
  };
  usedDownloads: number;
  remainingDownloads: number;
  resetAt: string;
};

type PendingDownload = {
  edition: DownloadEdition;
};

type NativeBarcodePlugin = {
  isSupported?: () => Promise<{ supported: boolean }>;
  requestPermissions?: () => Promise<{ camera: string }>;
  scan: () => Promise<{ barcodes?: { rawValue?: string; displayValue?: string }[] }>;
};

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { BarcodeScanner?: NativeBarcodePlugin };
    };
  }
}

const EXAMPLES = {
  search: [
    { value: "火星救援", label: "火星救援" },
    { value: "三体", label: "三体" },
    { value: "Andy Weir", label: "Andy Weir" },
  ],
  isbn: [
    { value: "9780140328721", label: "9780140328721" },
    { value: "9780553418026", label: "9780553418026" },
  ],
};

const DEMO_BOOK: BookResult = {
  id: "shelfmark-demo-the-martian",
  source: "Google Books",
  title: "The Martian",
  subtitle: "A Novel",
  authors: ["Andy Weir"],
  publisher: "Crown Publishing Group",
  publishedDate: "2014",
  description: "A stranded astronaut must rely on ingenuity and unshakeable determination to survive.",
  identifiers: [{ type: "ISBN_13", identifier: "9780553418026" }],
  pageCount: 387,
  categories: ["Science fiction", "Adventure"],
  averageRating: null,
  ratingsCount: null,
  language: "en",
  cover: "/media/the-martian-cover.webp",
  publicDomain: false,
  links: {
    epub: null,
    pdf: null,
    downloadPage: null,
    borrow: "https://openlibrary.org/isbn/9780553418026",
    preview: "https://books.google.com/books?vid=ISBN9780553418026",
    purchase: "https://books.google.com/books?vid=ISBN9780553418026",
    info: "https://books.google.com/books?vid=ISBN9780553418026",
  },
  purchase: null,
};

const ACCESS_ORDER: AccessKind[] = ["public-domain", "borrow", "preview", "purchase", "metadata"];

function AccessIcon({ kind, size = 16 }: { kind: AccessKind; size?: number }) {
  if (kind === "public-domain") return <Download size={size} />;
  if (kind === "borrow") return <Library size={size} />;
  if (kind === "preview") return <Eye size={size} />;
  if (kind === "purchase") return <ShoppingBag size={size} />;
  return <CircleEllipsis size={size} />;
}

function BookCover({ book, size = "row" }: { book: BookResult; size?: "row" | "detail" | "shelf" }) {
  return (
    <div className={`book-cover book-cover-${size}`}>
      {book.cover ? (
        <Image
          src={book.cover}
          alt={`${book.title} cover`}
          fill
          sizes={size === "detail" ? "(max-width: 720px) 180px, 260px" : "72px"}
          unoptimized
        />
      ) : (
        <div className="cover-missing" aria-label="Cover unavailable">
          <BookOpen size={size === "detail" ? 34 : 20} />
          {size === "detail" ? <span>{book.title}</span> : null}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function fileNameFromDisposition(value: string | null, fallback: string) {
  const encoded = value?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }
  return value?.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export function BookLookup() {
  const [view, setView] = useState<"find" | "shelf">("find");
  const [mode, setMode] = useState<"search" | "isbn">("search");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessKind | "all">("all");
  const [books, setBooks] = useState<BookResult[]>([]);
  const [downloadEditions, setDownloadEditions] = useState<DownloadEdition[]>([]);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [resultView, setResultView] = useState<"downloads" | "catalog">("downloads");
  const [downloadFormat, setDownloadFormat] = useState("all");
  const [selected, setSelected] = useState<BookResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searched, setSearched] = useState(false);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalBookFile[]>([]);
  const [localStorageError, setLocalStorageError] = useState("");
  const [copied, setCopied] = useState(false);
  const [nativeScanner, setNativeScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [quota, setQuota] = useState<QuotaSnapshot | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pendingDownload, setPendingDownload] = useState<PendingDownload | null>(null);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [quotaRequestOpen, setQuotaRequestOpen] = useState(false);
  const [quotaRequestLoading, setQuotaRequestLoading] = useState(false);
  const [quotaRequestDone, setQuotaRequestDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shelfTimer = window.setTimeout(() => {
      setSavedBooks(loadSavedBooks());
      setNativeScanner(Boolean(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.BarcodeScanner));
    }, 0);
    void listLocalBooks().then(setLocalFiles).catch((reason: unknown) => {
      setLocalStorageError(reason instanceof Error ? reason.message : "Local files are unavailable.");
    });
    return () => window.clearTimeout(shelfTimer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const normalizedIsbn = useMemo(() => normalizeIsbn(query), [query]);
  const invalidIsbn = mode === "isbn" && Boolean(query) && !isValidIsbn(normalizedIsbn);
  const visibleBooks = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((book) => getPrimaryAccess(book).kind === filter);
  }, [books, filter]);
  const visibleDownloadEditions = useMemo(() => {
    if (downloadFormat === "all") return downloadEditions;
    return downloadEditions.filter((edition) => edition.format === downloadFormat);
  }, [downloadEditions, downloadFormat]);
  const savedIds = useMemo(() => new Set(savedBooks.map((item) => item.id)), [savedBooks]);
  const authToken = session?.access_token || "";

  const refreshQuota = useCallback(async (token = authToken) => {
    const response = await fetch("/api/quota", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const data = (await response.json()) as { quota?: QuotaSnapshot };
    if (data.quota) setQuota(data.quota);
  }, [authToken]);

  useEffect(() => {
    trackProductEvent("page_view", { page: window.location.pathname || "/" });
    const supabase = getSupabaseBrowserClient();
    const quotaTimer = window.setTimeout(() => void refreshQuota(), 0);
    if (!supabase) return () => window.clearTimeout(quotaTimer);

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.access_token) void refreshQuota(data.session.access_token);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void refreshQuota(nextSession?.access_token || "");
    });
    return () => {
      window.clearTimeout(quotaTimer);
      data.subscription.unsubscribe();
    };
  }, [refreshQuota]);

  function switchView(next: "find" | "shelf") {
    startTransition(() => setView(next));
    setSelected(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeMode(next: "search" | "isbn") {
    setMode(next);
    setQuery("");
    setError("");
    setFilter("all");
    setDownloadFormat("all");
  }

  const lookup = useCallback(async (
    value: string,
    requestedMode: SearchMode,
    requestedFilter: SearchFilter = "all",
    historyMode: "push" | "replace" | "none" = "push",
  ) => {
    const normalizedQuery = requestedMode === "isbn" ? normalizeIsbn(value) : value.trim();
    setMode(requestedMode);
    setQuery(value);
    setError("");
    setNotice("");
    if (!normalizedQuery) {
      setError("Enter a title, author, or ISBN to begin.");
      return;
    }
    if (requestedMode === "isbn" && !isValidIsbn(normalizedQuery)) {
      setError("Enter a valid ISBN-10 or ISBN-13. Spaces and hyphens are fine.");
      return;
    }

    if (historyMode !== "none") {
      const nextUrl = buildShareableSearchUrl({
        query: normalizedQuery,
        mode: requestedMode,
        access: requestedFilter,
      });
      if (historyMode === "replace") window.history.replaceState({}, "", nextUrl);
      else window.history.pushState({}, "", nextUrl);
    }

    setLoading(true);
    setSearched(true);
    setSelected(null);
    trackProductEvent("search_submitted", {
      query_normalized: normalizedQuery.toLowerCase(),
      query_length: normalizedQuery.length,
      query_type: requestedMode === "isbn" ? "isbn" : "mixed",
      page: window.location.pathname || "/",
    });
    try {
      const params = new URLSearchParams({ q: normalizedQuery, mode: requestedMode });
      const response = await fetch(`/api/books/search?${params}`);
      const data = (await response.json()) as {
        books?: BookResult[];
        downloadEditions?: DownloadEdition[];
        downloadTotal?: number;
        partial?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "The catalog could not complete this search.");
      const nextBooks = data.books || [];
      const nextDownloads = data.downloadEditions || [];
      setBooks(nextBooks);
      setDownloadEditions(nextDownloads);
      setDownloadTotal(data.downloadTotal || nextDownloads.length);
      setDownloadFormat("all");
      setResultView(nextDownloads.length ? "downloads" : "catalog");
      setFilter(requestedFilter);
      if (requestedMode === "isbn" && nextBooks.length === 1) setSelected(nextBooks[0]);
      if (data.partial) setNotice("Some catalogs were unavailable. Showing the sources that responded.");
      trackProductEvent(nextDownloads.length ? "zlib_results_loaded" : "search_no_results", {
        query_normalized: normalizedQuery.toLowerCase(),
        query_length: normalizedQuery.length,
        query_type: requestedMode === "isbn" ? "isbn" : "mixed",
        result_count: nextDownloads.length,
        formats_available: Array.from(new Set(nextDownloads.map((edition) => edition.format))).length,
      });
    } catch (reason) {
      setBooks([]);
      setDownloadEditions([]);
      setDownloadTotal(0);
      setError(reason instanceof Error ? reason.message : "Book search is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function syncFromUrl() {
      const sharedSearch = parseShareableSearch(window.location.search);
      if (!sharedSearch) {
        setSearched(false);
        setBooks([]);
        setDownloadEditions([]);
        setDownloadTotal(0);
        setSelected(null);
        setFilter("all");
        setDownloadFormat("all");
        return;
      }
      void lookup(sharedSearch.query, sharedSearch.mode, sharedSearch.access, "none");
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [lookup]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup(query, mode, "all");
  }

  function changeFilter(nextFilter: SearchFilter) {
    setFilter(nextFilter);
    const sharedSearch = parseShareableSearch(window.location.search);
    if (!sharedSearch) return;
    window.history.replaceState({}, "", buildShareableSearchUrl({ ...sharedSearch, access: nextFilter }));
  }

  function startNewSearch() {
    setSearched(false);
    setBooks([]);
    setDownloadEditions([]);
    setDownloadTotal(0);
    setSelected(null);
    setFilter("all");
    setDownloadFormat("all");
    window.history.pushState({}, "", "/");
  }

  async function copyResultLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Shareable search link copied.");
      trackProductEvent("search_link_copied", { mode });
    } catch {
      setError("The result URL is ready in the address bar, but clipboard access is unavailable.");
    }
  }

  async function scanIsbn() {
    const scanner = window.Capacitor?.Plugins?.BarcodeScanner;
    if (!scanner) return;
    setError("");
    setScanning(true);
    try {
      const support = await scanner.isSupported?.();
      if (support && !support.supported) throw new Error("Barcode scanning is not supported on this device.");
      const permission = await scanner.requestPermissions?.();
      if (permission && !["granted", "limited"].includes(permission.camera)) {
        throw new Error("Camera access is required to scan an ISBN.");
      }
      const result = await scanner.scan();
      const value = result.barcodes?.[0]?.rawValue || result.barcodes?.[0]?.displayValue;
      if (!value) throw new Error("No ISBN was detected. Try again with the barcode centered.");
      const isbn = normalizeIsbn(value);
      setMode("isbn");
      setQuery(isbn);
      await lookup(isbn, "isbn", "all");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The barcode could not be scanned.");
    } finally {
      setScanning(false);
    }
  }

  async function copyBook(book: BookResult) {
    try {
      await navigator.clipboard.writeText(formatBookSummary(book));
      setCopied(true);
      setNotice("Book details copied.");
      window.setTimeout(() => setCopied(false), 1600);
      trackProductEvent("book_details_copied", { source: book.source });
    } catch {
      setError("Clipboard access is unavailable. Select and copy the details manually.");
    }
  }

  function toggleSavedBook(book: BookResult) {
    try {
      if (savedIds.has(book.id)) {
        setSavedBooks(removeBookFromShelf(book.id));
        setNotice("Removed from your shelf.");
      } else {
        setSavedBooks(saveBookToShelf(book));
        setNotice("Saved to this device.");
        trackProductEvent("shelf_item_saved", { source: book.source, access: getPrimaryAccess(book).kind });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your shelf could not be updated.");
    }
  }

  function openReadingPath(book: BookResult, route: ReturnType<typeof getPrimaryAccess>) {
    trackProductEvent("reading_path_clicked", { source: book.source, access: route.kind });
    if (route.kind === "purchase") trackProductEvent("purchase_route_clicked", { source: book.source });
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      await importLocalBook(file);
      setLocalFiles(await listLocalBooks());
      setNotice(`${file.name} is now on this device.`);
      trackProductEvent("local_file_imported", { type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This file could not be imported.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function openLocalFile(file: LocalBookFile, download = false) {
    setError("");
    try {
      const record = await getLocalBook(file.id);
      if (!record) throw new Error("This file is no longer available on this device.");
      const url = URL.createObjectURL(record.blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = record.name;
        anchor.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This local file could not be opened.");
    }
  }

  async function deleteLocalFile(id: string) {
    try {
      await removeLocalBook(id);
      setLocalFiles((current) => current.filter((file) => file.id !== id));
      setNotice("Local file removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This local file could not be removed.");
    }
  }

  async function downloadEdition(edition: DownloadEdition, token = authToken) {
    const key = `${edition.id}-${edition.format}`;
    setDownloadingKey(key);
    setError("");
    trackProductEvent("download_requested", {
      source: "zlibrary",
      format: edition.format,
      has_quota: quota ? quota.remainingDownloads > 0 : true,
    });
    try {
      const response = await fetch(`/api/books/download?token=${encodeURIComponent(edition.downloadIntent)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.status === 429) {
        const data = (await response.json()) as { error?: string; quota?: QuotaSnapshot };
        if (data.quota) setQuota(data.quota);
        setPendingDownload({ edition });
        setAuthOpen(true);
        setAuthError("");
        trackProductEvent("download_quota_blocked", { source: "zlibrary", format: edition.format });
        trackProductEvent("login_prompt_shown", { source: "quota_block" });
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Download failed before the file could start.");
      }
      const blob = await response.blob();
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = fileNameFromDisposition(response.headers.get("content-disposition"), `${edition.title}.${edition.format}`);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(anchor.href), 60_000);
      setNotice(`Download started. ${response.headers.get("x-shelfmark-downloads-remaining") || "Quota"} left today.`);
      trackProductEvent("download_started", { source: "zlibrary", format: edition.format });
      void refreshQuota();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Download failed before the file could start.");
      trackProductEvent("download_failed", { source: "zlibrary", format: edition.format, failure_stage: "client" });
    } finally {
      setDownloadingKey("");
    }
  }

  async function sendAuthCode(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase is not configured yet.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: { shouldCreateUser: true },
      });
      if (signInError) throw signInError;
      setAuthStep("code");
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Could not send the code.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyAuthCode(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase is not configured yet.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: authEmail.trim(),
        token: authCode.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;
      setSession(data.session);
      setAuthOpen(false);
      setAuthStep("email");
      setAuthCode("");
      trackProductEvent("login_completed", { method: "email_otp" });
      await refreshQuota(data.session?.access_token || "");
      const nextDownload = pendingDownload;
      setPendingDownload(null);
      if (nextDownload) void downloadEdition(nextDownload.edition, data.session?.access_token || "");
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "The code could not be verified.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function submitQuotaRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuotaRequestLoading(true);
    setAuthError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/quota/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          expectedDailyDownloads: form.get("expectedDailyDownloads"),
          useCase: form.get("useCase"),
        }),
      });
      if (!response.ok) throw new Error("Could not record this request.");
      setQuotaRequestDone(true);
      trackProductEvent("quota_request_submitted", { source: "quota_panel" });
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Could not record this request.");
    } finally {
      setQuotaRequestLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => switchView("find")} aria-label="Shelfmark home">
          <Image className="brand-mark" src="/media/shelfmark-mark.png" alt="" width={30} height={30} priority />
          <span><strong>Shelfmark</strong><small>Find the book. Choose how to read it.</small></span>
        </button>
        <nav aria-label="Primary navigation">
          <button className={view === "find" ? "active" : ""} type="button" onClick={() => switchView("find")}>
            <Search size={16} /> Find
          </button>
          <button className={view === "shelf" ? "active" : ""} type="button" onClick={() => switchView("shelf")}>
            <Library size={16} /> My shelf <span className="nav-count">{savedBooks.length + localFiles.length}</span>
          </button>
        </nav>
        <div className="topbar-links">
          <QuotaPill quota={quota} onNeedMore={() => setQuotaRequestOpen(true)} />
          <button className="signin-button" type="button" onClick={() => { setAuthOpen(true); trackProductEvent("login_prompt_shown", { source: "header" }); }}>
            {session?.user.email || "Sign in"}
          </button>
        </div>
      </header>

      {view === "find" ? (
        <div className="find-view">
          {!searched ? (
            <CinematicHome
              heroContent={(
                <>
                  <p className="eyebrow"><span>01</span> Reading portal</p>
                  <h1 id="hero-title">
                    <span className="hero-title-line">Find the book.</span>
                    <em className="hero-title-line">Get the file.</em>
                  </h1>
                  <p className="hero-description">
                    Search millions of books and start reading instantly.
                  </p>
                  <SearchPanel
                    mode={mode}
                    query={query}
                    loading={loading}
                    invalidIsbn={invalidIsbn}
                    nativeScanner={nativeScanner}
                    scanning={scanning}
                    onModeChange={changeMode}
                    onQueryChange={setQuery}
                    onSubmit={submit}
                    onExample={(value) => void lookup(value, mode, "all")}
                    onScan={() => void scanIsbn()}
                  />
                  <nav className="task-shortcuts" aria-label="Common book search tasks">
                    <span>Explore</span>
                    <Link href="/find-book-by-title">Title or author</Link>
                    <Link href="/isbn-lookup">ISBN lookup</Link>
                    <Link href="/public-domain-book-finder">Browse by format</Link>
                  </nav>
                  {error ? <ErrorMessage message={error} /> : null}
                  {notice ? <NoticeMessage message={notice} /> : null}
                </>
              )}
              preview={<DemoResultPanel saved={savedIds.has(DEMO_BOOK.id)} onSave={() => toggleSavedBook(DEMO_BOOK)} />}
            />
          ) : null}

          {searched ? (
            <section className="catalog-workspace">
              <div className="compact-search-row">
                <button className="compact-brand" type="button" onClick={startNewSearch}>
                  <ArrowLeft size={17} /> New search
                </button>
                <SearchPanel
                  compact
                  mode={mode}
                  query={query}
                  loading={loading}
                  invalidIsbn={invalidIsbn}
                  nativeScanner={nativeScanner}
                  scanning={scanning}
                  onModeChange={changeMode}
                  onQueryChange={setQuery}
                  onSubmit={submit}
                  onExample={(value) => void lookup(value, mode, "all")}
                  onScan={() => void scanIsbn()}
                />
              </div>
              {error ? <ErrorMessage message={error} /> : null}
              {notice ? <NoticeMessage message={notice} /> : null}
              {loading ? <LoadingState /> : null}
              {!loading && selected ? (
                <BookDetail
                  book={selected}
                  saved={savedIds.has(selected.id)}
                  copied={copied}
                  onBack={() => setSelected(null)}
                  onCopy={() => void copyBook(selected)}
                  onSave={() => toggleSavedBook(selected)}
                  onReadingPath={openReadingPath}
                />
              ) : null}
              {!loading && !selected ? (
                <>
                  <div className="result-tabs" role="tablist" aria-label="Search result view">
                    <button className={resultView === "downloads" ? "active" : ""} type="button" role="tab" aria-selected={resultView === "downloads"} onClick={() => setResultView("downloads")}>
                      Downloadable editions <span>{downloadEditions.length}</span>
                    </button>
                    <button className={resultView === "catalog" ? "active" : ""} type="button" role="tab" aria-selected={resultView === "catalog"} onClick={() => setResultView("catalog")}>
                      Book information <span>{books.length}</span>
                    </button>
                  </div>
                  {resultView === "downloads" ? (
                    <DownloadResults
                      editions={downloadEditions}
                      visibleEditions={visibleDownloadEditions}
                      total={downloadTotal}
                      format={downloadFormat}
                      onFormat={setDownloadFormat}
                      downloadingKey={downloadingKey}
                      onDownload={(edition) => void downloadEdition(edition)}
                    />
                  ) : (
                    <BookResults
                      books={books}
                      visibleBooks={visibleBooks}
                      filter={filter}
                      savedIds={savedIds}
                      onFilter={changeFilter}
                      onCopyLink={() => void copyResultLink()}
                      onSelect={setSelected}
                      onSave={toggleSavedBook}
                      onReadingPath={openReadingPath}
                    />
                  )}
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <ShelfView
          savedBooks={savedBooks}
          localFiles={localFiles}
          localStorageError={localStorageError}
          error={error}
          notice={notice}
          importing={importing}
          fileInputRef={fileInputRef}
          onFind={() => switchView("find")}
          onSelect={(book) => { setSelected(book); setBooks([book]); setSearched(true); switchView("find"); window.setTimeout(() => setSelected(book), 0); }}
          onRemoveSaved={(id) => setSavedBooks(removeBookFromShelf(id))}
          onImport={(file) => void importFile(file)}
          onOpen={(file, download) => void openLocalFile(file, download)}
          onDelete={(id) => void deleteLocalFile(id)}
        />
      )}

      {authOpen ? (
        <AuthDialog
          email={authEmail}
          code={authCode}
          step={authStep}
          loading={authLoading}
          error={authError}
          pendingDownload={Boolean(pendingDownload)}
          onEmail={setAuthEmail}
          onCode={setAuthCode}
          onClose={() => { setAuthOpen(false); setPendingDownload(null); }}
          onSendCode={sendAuthCode}
          onVerifyCode={verifyAuthCode}
        />
      ) : null}

      {quotaRequestOpen ? (
        <QuotaRequestDialog
          loading={quotaRequestLoading}
          done={quotaRequestDone}
          error={authError}
          onClose={() => { setQuotaRequestOpen(false); setQuotaRequestDone(false); setAuthError(""); }}
          onSubmit={submitQuotaRequest}
        />
      ) : null}

      <footer id="data-notice">
        <div><strong>Shelfmark</strong><span>Find the book. Choose the edition.</span></div>
        <p>Search preferences and local shelf files stay in this browser.</p>
        <div className="footer-links">
          <a href="https://bulidoge.site/products/shelfmark">DBL-TOOLS</a>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/DeepBlueLac/P2-isbn-book-lookup" target="_blank" rel="noreferrer">Data & source notes <ExternalLink size={14} /></a>
        </div>
      </footer>
    </main>
  );
}

function QuotaPill({ quota, onNeedMore }: { quota: QuotaSnapshot | null; onNeedMore: () => void }) {
  const label = quota?.subject.kind === "user" ? "Signed in" : "Guest";
  return (
    <details className="quota-pill">
      <summary>
        <LockKeyhole size={14} />
        <span>{quota ? `${label} · Downloads ${quota.remainingDownloads}/${quota.subject.dailyDownloads}` : "Quota"}</span>
      </summary>
      <div className="quota-popover">
        <strong>{quota ? `${quota.remainingDownloads} downloads left today` : "Checking quota"}</strong>
        <span>Search is unlimited. Downloads reset {quota ? formatDate(quota.resetAt) : "daily"}.</span>
        <button type="button" onClick={onNeedMore}>Need more downloads?</button>
      </div>
    </details>
  );
}

function AuthDialog({
  email,
  code,
  step,
  loading,
  error,
  pendingDownload,
  onEmail,
  onCode,
  onClose,
  onSendCode,
  onVerifyCode,
}: {
  email: string;
  code: string;
  step: "email" | "code";
  loading: boolean;
  error: string;
  pendingDownload: boolean;
  onEmail: (value: string) => void;
  onCode: (value: string) => void;
  onClose: () => void;
  onSendCode: (event: FormEvent) => void;
  onVerifyCode: (event: FormEvent) => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <section className="modal-panel auth-panel">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close sign in"><X size={18} /></button>
        <p className="eyebrow"><span>LOGIN</span> Free account</p>
        <h2 id="auth-title">Sign in to continue downloading</h2>
        <p>Create your free Shelfmark account with a 6-digit email code. Signed-in users get 10 downloads per day.</p>
        {pendingDownload ? <div className="pending-note"><Download size={16} /> Your download will continue after sign in.</div> : null}
        {step === "email" ? (
          <form className="auth-form" onSubmit={onSendCode}>
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" value={email} onChange={(event) => onEmail(event.target.value)} autoComplete="email" required />
            <button className="find-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : null} Send code</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onVerifyCode}>
            <label htmlFor="auth-code">6-digit code</label>
            <input id="auth-code" value={code} onChange={(event) => onCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required />
            <button className="find-button" type="submit" disabled={loading || code.length < 6}>{loading ? <LoaderCircle className="spin" size={16} /> : null} Verify and continue</button>
          </form>
        )}
        {error ? <ErrorMessage message={error} /> : null}
      </section>
    </div>
  );
}

function QuotaRequestDialog({
  loading,
  done,
  error,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  done: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quota-request-title">
      <section className="modal-panel quota-request-panel">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close request"><X size={18} /></button>
        <p className="eyebrow"><span>LIMIT</span> Request access</p>
        <h2 id="quota-request-title">{done ? "Request recorded" : "Need more downloads?"}</h2>
        {done ? (
          <p>Thanks. The request has been recorded for review.</p>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <label htmlFor="expectedDailyDownloads">Expected daily downloads</label>
            <select id="expectedDailyDownloads" name="expectedDailyDownloads" defaultValue="20">
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <label htmlFor="useCase">Use case</label>
            <select id="useCase" name="useCase" defaultValue="personal_reading">
              <option value="personal_reading">Personal reading</option>
              <option value="study_research">Study & research</option>
              <option value="collection_management">Collection management</option>
              <option value="other">Other</option>
            </select>
            <button className="find-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : null} Submit request</button>
          </form>
        )}
        {error ? <ErrorMessage message={error} /> : null}
      </section>
    </div>
  );
}

function DemoResultPanel({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <aside className="demo-result" aria-label="Example reading paths">
      <div className="demo-result-book">
        <Image src="/media/the-martian-cover.webp" alt="The Martian cover" width={188} height={250} priority />
        <div className="demo-result-meta">
          <p className="result-kicker">Selected book</p>
          <h2>The Martian</h2>
          <p className="result-author">Andy Weir</p>
          <div className="result-facts"><span>2014</span><span>Crown Publishing Group</span><span>English</span></div>
          <div className="result-tags"><span>Science fiction</span><span>Adventure</span></div>
        </div>
      </div>
      <p className="result-description">A stranded astronaut must rely on ingenuity and unshakeable determination to survive.</p>
      <div className="path-heading"><span>Choose your path</span><span>edition preview</span></div>
      <ol className="demo-paths" id="reading-paths">
        <li><a href={DEMO_BOOK.links.preview || "#"} target="_blank" rel="noreferrer"><span className="path-number">01</span><PhosphorEye size={22} weight="regular" /><span><strong>Preview</strong><small>Read a free sample</small></span><ArrowUpRight size={20} /></a></li>
        <li><a href={DEMO_BOOK.links.borrow || "#"} target="_blank" rel="noreferrer"><span className="path-number">02</span><BookOpenText size={22} weight="regular" /><span><strong>Borrow</strong><small>Check library availability</small></span><ArrowUpRight size={20} /></a></li>
        <li><button type="button" onClick={() => document.getElementById("book-query")?.focus()}><span className="path-number">03</span><Download size={22} /><span><strong>Download</strong><small>Search available editions</small></span><ChevronRight size={20} /></button></li>
      </ol>
      <button className="demo-shelf" type="button" onClick={onSave}>
        <BookmarkSimple size={20} weight={saved ? "fill" : "regular"} />
        <span><strong>{saved ? "On my private shelf" : "Save to my private shelf"}</strong><small>{saved ? "Saved on this device" : "Stored locally in this browser"}</small></span>
      </button>
      <p className="demo-source"><PhosphorShieldCheck size={18} weight="regular" /> Search results update by title, author, or ISBN.</p>
    </aside>
  );
}

type SearchPanelProps = {
  compact?: boolean;
  mode: "search" | "isbn";
  query: string;
  loading: boolean;
  invalidIsbn: boolean;
  nativeScanner: boolean;
  scanning: boolean;
  onModeChange: (mode: "search" | "isbn") => void;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onExample: (value: string) => void;
  onScan: () => void;
};

function SearchPanel(props: SearchPanelProps) {
  return (
    <form className={`search-panel ${props.compact ? "search-panel-compact" : ""}`} onSubmit={props.onSubmit}>
      <div className="search-mode" role="tablist" aria-label="Search mode">
        <button className={props.mode === "search" ? "active" : ""} type="button" role="tab" aria-selected={props.mode === "search"} onClick={() => props.onModeChange("search")}>Title or author</button>
        <button className={props.mode === "isbn" ? "active" : ""} type="button" role="tab" aria-selected={props.mode === "isbn"} onClick={() => props.onModeChange("isbn")}>ISBN</button>
      </div>
      <label htmlFor={props.compact ? "compact-book-query" : "book-query"}>
        {props.mode === "isbn" ? "ISBN-10 or ISBN-13" : "Book title or author"}
      </label>
      <div className={`search-input ${props.invalidIsbn ? "invalid" : ""}`}>
        <Search size={20} aria-hidden="true" />
        <input
          id={props.compact ? "compact-book-query" : "book-query"}
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder={props.mode === "isbn" ? "9780553418026" : "Search 火星救援, a title, or an author"}
          autoComplete="off"
          inputMode={props.mode === "isbn" ? "text" : "search"}
          aria-invalid={props.invalidIsbn}
        />
        {props.query ? <button className="clear-query" type="button" onClick={() => props.onQueryChange("")} aria-label="Clear search"><X size={18} /></button> : null}
        <button className="find-button" type="submit" disabled={props.loading || props.invalidIsbn}>
          {props.loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
          Find this book
        </button>
      </div>
      {!props.compact ? (
        <div className="search-examples">
          <span>Try</span>
          {EXAMPLES[props.mode].map((example) => (
            <button key={example.value} type="button" onClick={() => props.onExample(example.value)}>{example.label}</button>
          ))}
          {props.mode === "isbn" && props.nativeScanner ? (
            <button type="button" disabled={props.scanning} onClick={props.onScan}>
              {props.scanning ? <LoaderCircle className="spin" size={13} /> : <ScanLine size={13} />} Scan a barcode
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function DownloadResults({
  editions,
  visibleEditions,
  total,
  format,
  onFormat,
  downloadingKey,
  onDownload,
}: {
  editions: DownloadEdition[];
  visibleEditions: DownloadEdition[];
  total: number;
  format: string;
  onFormat: (format: string) => void;
  downloadingKey: string;
  onDownload: (edition: DownloadEdition) => void;
}) {
  const formats = Array.from(new Set(editions.map((edition) => edition.format))).sort();
  return (
    <div className="results-layout download-results-layout">
      <section className="results-main" aria-live="polite">
        <div className="results-toolbar">
          <div><p className="eyebrow"><span>02</span> Downloadable editions</p><h2>{total ? `${total.toLocaleString()} matches` : "No downloadable editions"}</h2></div>
          <label className="format-select">
            <span>File format</span>
            <select value={format} onChange={(event) => onFormat(event.target.value)}>
              <option value="all">All formats</option>
              {formats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
        {visibleEditions.length ? (
          <div className="download-list">
            {visibleEditions.map((edition) => (
              <article className="download-row" key={`${edition.id}-${edition.format}`}>
                <div className="download-cover">
                  {edition.cover ? <Image src={edition.cover} alt={`${edition.title} cover`} fill sizes="64px" unoptimized /> : <BookOpen size={22} />}
                </div>
                <div className="download-copy">
                  <div className="edition-badges"><span>{edition.format.toUpperCase()}</span>{edition.size ? <span>{edition.size}</span> : null}</div>
                  <h3>{edition.title}</h3>
                  <p>{edition.author || "Author not listed"}</p>
                  <small>{[edition.publisher, edition.year, edition.language].filter(Boolean).join(" · ")}</small>
                </div>
                <button
                  className="download-button"
                  type="button"
                  disabled={downloadingKey === `${edition.id}-${edition.format}`}
                  onClick={() => onDownload(edition)}
                >
                  {downloadingKey === `${edition.id}-${edition.format}` ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}
                  Download {edition.format.toUpperCase()}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results"><BookOpen size={30} /><h3>No editions match this format.</h3><p>Choose another file format or view book information.</p></div>
        )}
      </section>
    </div>
  );
}

function BookResults({
  books,
  visibleBooks,
  filter,
  savedIds,
  onFilter,
  onSelect,
  onSave,
  onReadingPath,
  onCopyLink,
}: {
  books: BookResult[];
  visibleBooks: BookResult[];
  filter: AccessKind | "all";
  savedIds: Set<string>;
  onFilter: (filter: AccessKind | "all") => void;
  onSelect: (book: BookResult) => void;
  onSave: (book: BookResult) => void;
  onReadingPath: (book: BookResult, route: ReturnType<typeof getPrimaryAccess>) => void;
  onCopyLink: () => void;
}) {
  const availableFilters = ACCESS_ORDER.filter((kind) => books.some((book) => getPrimaryAccess(book).kind === kind));
  return (
    <div className="results-layout">
      <section className="results-main" aria-live="polite">
        <div className="results-toolbar">
          <div><p className="eyebrow"><span>02</span> Catalog results</p><h2>{books.length === 1 ? "1 edition" : `${books.length} editions and works`}</h2></div>
          <div className="results-toolbar-actions">
            <div className="access-filters" aria-label="Filter by access">
              <button className={filter === "all" ? "active" : ""} type="button" onClick={() => onFilter("all")}>All</button>
              {availableFilters.map((kind) => <button className={filter === kind ? "active" : ""} key={kind} type="button" onClick={() => onFilter(kind)}>{getFilterLabel(kind)}</button>)}
            </div>
            <button className="share-results" type="button" onClick={onCopyLink}><Link2 size={14} /> Copy result link</button>
          </div>
        </div>
        {visibleBooks.length ? (
          <div className="book-list">
            {visibleBooks.map((book) => {
              const route = getPrimaryAccess(book);
              return (
                <article className="book-row" key={book.id}>
                  <BookCover book={book} />
                  <div className="book-row-copy">
                    <span className={`access-badge access-${route.kind}`}><AccessIcon kind={route.kind} size={13} />{route.label}</span>
                    <h3>{book.title}</h3>
                    <p>{book.authors.join(", ") || "Author not listed"}</p>
                    <small>{[book.source, book.publishedDate, book.language?.toUpperCase()].filter(Boolean).join(" · ")}</small>
                  </div>
                  <div className="book-row-actions">
                    {route.href ? (
                      <a className="route-button" href={route.href} target="_blank" rel="noreferrer" onClick={() => onReadingPath(book, route)}>
                        {route.actionLabel} <ExternalLink size={14} />
                      </a>
                    ) : null}
                    <div>
                      <button type="button" onClick={() => onSelect(book)}>Details</button>
                      <button className={savedIds.has(book.id) ? "saved" : ""} type="button" onClick={() => onSave(book)} aria-label={savedIds.has(book.id) ? "Remove from shelf" : "Save to shelf"}>
                        {savedIds.has(book.id) ? <Check size={16} /> : <BookMarked size={16} />}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-results"><BookOpen size={30} /><h3>No books match this access filter.</h3><p>Try all results or search with fewer words.</p></div>
        )}
      </section>
    </div>
  );
}

function BookDetail({ book, saved, copied, onBack, onCopy, onSave, onReadingPath }: {
  book: BookResult;
  saved: boolean;
  copied: boolean;
  onBack: () => void;
  onCopy: () => void;
  onSave: () => void;
  onReadingPath: (book: BookResult, route: ReturnType<typeof getPrimaryAccess>) => void;
}) {
  const route = getPrimaryAccess(book);
  const isbn = book.identifiers.find((item) => item.type === "ISBN_13")?.identifier || book.identifiers.find((item) => item.type === "ISBN_10")?.identifier;
  const actions = [
    { href: book.links.epub, label: "Download EPUB", icon: Download, kind: "public-domain" as AccessKind },
    { href: book.links.pdf, label: "Download PDF", icon: Download, kind: "public-domain" as AccessKind },
    { href: book.links.downloadPage, label: "View download formats", icon: Download, kind: "public-domain" as AccessKind },
    { href: book.links.borrow, label: "Check library", icon: Library, kind: "borrow" as AccessKind },
    { href: book.links.preview, label: "Open preview", icon: Eye, kind: "preview" as AccessKind },
    { href: book.links.purchase, label: book.purchase?.amount ? `Buy · ${book.purchase.amount} ${book.purchase.currency || ""}` : "View purchase", icon: ShoppingBag, kind: "purchase" as AccessKind },
  ].filter((action): action is { href: string; label: string; icon: typeof Download; kind: AccessKind } => Boolean(action.href));

  return (
    <section className="book-detail" aria-live="polite">
      <button className="detail-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to results</button>
      <div className="detail-grid">
        <div className="detail-cover-column"><BookCover book={book} size="detail" /><span>{book.source}</span></div>
        <div className="detail-copy">
          <span className={`access-badge access-${route.kind}`}><AccessIcon kind={route.kind} size={14} />{route.label}</span>
          <h2>{book.title}</h2>
          {book.subtitle ? <p className="detail-subtitle">{book.subtitle}</p> : null}
          <p className="detail-author">{book.authors.length ? `By ${book.authors.join(", ")}` : "Author not listed"}</p>
          <div className="detail-actions">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return <a className={index === 0 ? "primary" : "secondary"} key={`${action.kind}-${action.href}`} href={action.href} target="_blank" rel="noreferrer" onClick={() => onReadingPath(book, { ...route, kind: action.kind, href: action.href, actionLabel: action.label })}><Icon size={17} />{action.label}<ExternalLink size={13} /></a>;
            })}
            <button className={saved ? "saved" : ""} type="button" onClick={onSave}>{saved ? <Check size={17} /> : <BookMarked size={17} />}{saved ? "On your shelf" : "Save to shelf"}</button>
            <button type="button" onClick={onCopy}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Copied" : "Copy details"}</button>
          </div>
          <dl className="book-metadata">
            <div><dt>Publisher</dt><dd>{book.publisher || "Not listed"}</dd></div>
            <div><dt>Published</dt><dd>{book.publishedDate || "Not listed"}</dd></div>
            <div><dt>Pages</dt><dd>{book.pageCount ? book.pageCount.toLocaleString() : "Not listed"}</dd></div>
            <div><dt>Language</dt><dd>{book.language?.toUpperCase() || "Not listed"}</dd></div>
            <div><dt>ISBN</dt><dd className="mono">{isbn || "Not listed"}</dd></div>
          </dl>
          {book.description ? <p className="book-description">{book.description}</p> : null}
          {book.categories.length ? <div className="subjects">{book.categories.slice(0, 6).map((category) => <span key={category}>{category}</span>)}</div> : null}
          {book.links.info ? <a className="source-record-link" href={book.links.info} target="_blank" rel="noreferrer">View the source record <ExternalLink size={14} /></a> : null}
        </div>
      </div>
    </section>
  );
}

function ShelfView({ savedBooks, localFiles, localStorageError, error, notice, importing, fileInputRef, onFind, onSelect, onRemoveSaved, onImport, onOpen, onDelete }: {
  savedBooks: SavedBook[];
  localFiles: LocalBookFile[];
  localStorageError: string;
  error: string;
  notice: string;
  importing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFind: () => void;
  onSelect: (book: BookResult) => void;
  onRemoveSaved: (id: string) => void;
  onImport: (file: File | undefined) => void;
  onOpen: (file: LocalBookFile, download: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="shelf-view">
      <div className="shelf-hero">
        <div><p className="eyebrow"><span>MY</span> Device-only library</p><h1>A quiet shelf that stays <em>with you.</em></h1><p>Save catalog records or keep your own EPUB and PDF files in this browser. No account, upload, or reading-history profile.</p></div>
        <div className="privacy-stamp"><LockKeyhole size={22} /><strong>Stored on this device</strong><span>Clearing browser data removes this shelf.</span></div>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      {notice ? <NoticeMessage message={notice} /> : null}
      <div className="shelf-grid">
        <section className="saved-section">
          <div className="section-heading"><div><span>01</span><div><h2>Saved records</h2><p>{savedBooks.length} catalog {savedBooks.length === 1 ? "entry" : "entries"}</p></div></div><button type="button" onClick={onFind}><Search size={15} /> Find a book</button></div>
          {savedBooks.length ? <div className="saved-list">{savedBooks.map((item) => {
            const route = getPrimaryAccess(item.book);
            return <article key={item.id}><button className="saved-book-main" type="button" onClick={() => onSelect(item.book)}><BookCover book={item.book} size="shelf" /><span><small>{route.label}</small><strong>{item.book.title}</strong><em>{item.book.authors.join(", ") || "Author not listed"}</em></span><ChevronRight size={18} /></button><button className="remove-icon" type="button" onClick={() => onRemoveSaved(item.id)} aria-label={`Remove ${item.book.title}`}><Trash2 size={16} /></button></article>;
          })}</div> : <div className="shelf-empty"><BookMarked size={28} /><h3>No saved records yet.</h3><p>Use Shelfmark to find a book, then save the edition or work you want to remember.</p><button type="button" onClick={onFind}>Find your first book</button></div>}
        </section>
        <section className="local-section">
          <div className="section-heading"><div><span>02</span><div><h2>Your EPUB & PDF files</h2><p>{localFiles.length} local {localFiles.length === 1 ? "file" : "files"}</p></div></div></div>
          <input ref={fileInputRef} type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" hidden onChange={(event) => onImport(event.target.files?.[0])} />
          <button className="import-dropzone" type="button" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? <LoaderCircle className="spin" size={25} /> : <Upload size={25} />}
            <span><strong>{importing ? "Saving to this device…" : "Import a book you own"}</strong><small>EPUB or PDF · up to 50 MB · never uploaded</small></span>
          </button>
          {localStorageError ? <div className="storage-warning"><FileText size={18} /><span><strong>Local file storage is unavailable.</strong>{localStorageError}</span></div> : null}
          {localFiles.length ? <div className="local-files">{localFiles.map((file) => <article key={file.id}>
            <span className="file-type">{file.type === "application/pdf" ? <FileText size={19} /> : <FileArchive size={19} />}{file.type === "application/pdf" ? "PDF" : "EPUB"}</span>
            <div><strong>{file.name}</strong><small>{formatFileSize(file.size)} · Added {formatDate(file.addedAt)}</small></div>
            <div className="file-actions"><button type="button" onClick={() => onOpen(file, false)}><FolderOpen size={15} /> Open</button><button type="button" onClick={() => onOpen(file, true)} aria-label={`Download ${file.name}`}><Download size={15} /></button><button type="button" onClick={() => onDelete(file.id)} aria-label={`Delete ${file.name}`}><Trash2 size={15} /></button></div>
          </article>)}</div> : null}
        </section>
      </div>
    </section>
  );
}

function LoadingState() {
  return <div className="loading-state" aria-live="polite"><LoaderCircle className="spin" size={24} /><div><strong>Checking three catalogs</strong><span>Looking for editions, borrowing, previews, and public-domain files.</span></div></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="message error-message" role="alert"><X size={18} /><span><strong>That search needs another try.</strong>{message}</span></div>;
}

function NoticeMessage({ message }: { message: string }) {
  return <div className="message notice-message" role="status"><Check size={18} /><span>{message}</span></div>;
}

function getFilterLabel(kind: AccessKind) {
  if (kind === "public-domain") return "Download";
  if (kind === "borrow") return "Borrow";
  if (kind === "preview") return "Preview";
  if (kind === "purchase") return "Purchase";
  return "Record only";
}
