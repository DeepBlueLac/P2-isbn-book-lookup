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
import { FormEvent, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookOpenText, BookmarkSimple, Eye as PhosphorEye, ShieldCheck as PhosphorShieldCheck, ShoppingBagOpen } from "@phosphor-icons/react";

import {
  formatBookSummary,
  getPrimaryAccess,
  isValidIsbn,
  normalizeIsbn,
  type AccessKind,
  type BookResult,
  type SourceState,
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
    { value: "Pride and Prejudice", label: "Pride and Prejudice" },
    { value: "Octavia Butler", label: "Octavia Butler" },
    { value: "The Martian", label: "The Martian" },
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

export function BookLookup() {
  const [view, setView] = useState<"find" | "shelf">("find");
  const [mode, setMode] = useState<"search" | "isbn">("search");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessKind | "all">("all");
  const [books, setBooks] = useState<BookResult[]>([]);
  const [sources, setSources] = useState<SourceState[]>([]);
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
  const savedIds = useMemo(() => new Set(savedBooks.map((item) => item.id)), [savedBooks]);

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
    try {
      const params = new URLSearchParams({ q: normalizedQuery, mode: requestedMode });
      const response = await fetch(`/api/books/search?${params}`);
      const data = (await response.json()) as {
        books?: BookResult[];
        sources?: SourceState[];
        partial?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "The catalog could not complete this search.");
      const nextBooks = data.books || [];
      setBooks(nextBooks);
      setSources(data.sources || []);
      setFilter(requestedFilter);
      if (requestedMode === "isbn" && nextBooks.length === 1) setSelected(nextBooks[0]);
      if (data.partial) setNotice("Some catalogs were unavailable. Showing the sources that responded.");
      trackProductEvent("search_succeeded", { mode: requestedMode, result_count: nextBooks.length, partial: Boolean(data.partial) });
    } catch (reason) {
      setBooks([]);
      setSources([]);
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
        setSources([]);
        setSelected(null);
        setFilter("all");
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
    setSources([]);
    setSelected(null);
    setFilter("all");
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
          <a className="studio-link" href="https://bulidoge.site/products/shelfmark">DBL-TOOLS</a>
          <a className="transparency-link" href="#data-notice"><PhosphorShieldCheck size={16} weight="regular" /> Source transparent</a>
        </div>
      </header>

      {view === "find" ? (
        <div className="find-view">
          {!searched ? (
            <section className="portal-hero" aria-labelledby="hero-title">
              <div className="portal-stage">
                <Image className="portal-art" src="/media/reading-portal.webp" alt="" fill priority sizes="(max-width: 760px) 100vw, 62vw" />
                <div className="portal-vignette" aria-hidden="true" />
              <div className="portal-copy">
                <p className="eyebrow"><span>01</span> Reading portal</p>
                <h1 id="hero-title">One book.<br /><em>Every legitimate<br />way in.</em></h1>
                <p className="hero-description">
                  Search a title, author, or ISBN. Shelfmark separates public-domain downloads, library borrowing,
                  previews, and purchase routes—without pretending a catalog record is a free ebook.
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
                {error ? <ErrorMessage message={error} /> : null}
                {notice ? <NoticeMessage message={notice} /> : null}
              </div>

              <p className="portal-caption"><span>Search the index</span><span>One clear route at a time</span></p>
              </div>
              <DemoResultPanel saved={savedIds.has(DEMO_BOOK.id)} onSave={() => toggleSavedBook(DEMO_BOOK)} />
            </section>
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
                <BookResults
                  books={books}
                  visibleBooks={visibleBooks}
                  sources={sources}
                  filter={filter}
                  savedIds={savedIds}
                  onFilter={changeFilter}
                  onCopyLink={() => void copyResultLink()}
                  onSelect={setSelected}
                  onSave={toggleSavedBook}
                  onReadingPath={openReadingPath}
                />
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

      <footer id="data-notice">
        <div><strong>Shelfmark</strong><span>Open Library · Google Books · Project Gutenberg</span></div>
        <p>Availability varies by edition and region. Local shelf files stay in this browser and are never uploaded.</p>
        <div className="footer-links">
          <a href="https://bulidoge.site/products/shelfmark">DBL-TOOLS</a>
          <a href="https://github.com/DeepBlueLac/P2-isbn-book-lookup" target="_blank" rel="noreferrer">Data & source notes <ExternalLink size={14} /></a>
        </div>
      </footer>
    </main>
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
      <div className="path-heading"><span>Choose your path</span><span>verified sources</span></div>
      <ol className="demo-paths" id="reading-paths">
        <li><a href={DEMO_BOOK.links.preview || "#"} target="_blank" rel="noreferrer"><span className="path-number">01</span><PhosphorEye size={22} weight="regular" /><span><strong>Preview</strong><small>Read a free sample</small></span><ArrowUpRight size={20} /></a></li>
        <li><a href={DEMO_BOOK.links.borrow || "#"} target="_blank" rel="noreferrer"><span className="path-number">02</span><BookOpenText size={22} weight="regular" /><span><strong>Borrow</strong><small>Check library availability</small></span><ArrowUpRight size={20} /></a></li>
        <li><a href={DEMO_BOOK.links.purchase || "#"} target="_blank" rel="noreferrer"><span className="path-number">03</span><ShoppingBagOpen size={22} weight="regular" /><span><strong>Purchase</strong><small>Buy from a trusted seller</small></span><ArrowUpRight size={20} /></a></li>
      </ol>
      <button className="demo-shelf" type="button" onClick={onSave}>
        <BookmarkSimple size={20} weight={saved ? "fill" : "regular"} />
        <span><strong>{saved ? "On my private shelf" : "Save to my private shelf"}</strong><small>{saved ? "Saved on this device" : "Stored locally in this browser"}</small></span>
      </button>
      <p className="demo-source"><PhosphorShieldCheck size={18} weight="regular" /> Source transparent. Availability varies by region.</p>
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
          placeholder={props.mode === "isbn" ? "9780553418026" : "Try The Martian or Andy Weir"}
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

function BookResults({
  books,
  visibleBooks,
  sources,
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
  sources: SourceState[];
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
      <aside className="source-rail">
        <p className="rail-label">SOURCE CHECK</p>
        {sources.map((source) => (
          <div className="source-state" key={source.source}>
            <span className={`state-dot state-${source.status}`} />
            <div><strong>{source.source}</strong><small>{source.status === "available" ? source.detail : source.status === "skipped" ? "Not configured for this search" : "Temporarily unavailable"}</small></div>
          </div>
        ))}
        <p>Results are merged, then deduplicated by ISBN or title and author. Availability can still vary by region.</p>
      </aside>
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
