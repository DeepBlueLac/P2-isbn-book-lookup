"use client";

import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  LoaderCircle,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type BookResult = {
  id: string;
  source: "Google Books" | "Project Gutenberg";
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  identifiers: { type?: string; identifier?: string }[];
  pageCount: number | null;
  categories: string[];
  averageRating: number | null;
  ratingsCount: number | null;
  language: string | null;
  cover: string | null;
  previewLink: string | null;
  infoLink: string | null;
  publicDomain: boolean;
  viewability: string;
  downloads: { epub: string | null; pdf: string | null };
  purchase: { link: string | null; amount: number | null; currency: string | null } | null;
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

const examples = {
  isbn: [
    { value: "9780140328721", label: "Matilda" },
    { value: "9780439554930", label: "Harry Potter" },
  ],
  search: [
    { value: "Pride and Prejudice", label: "傲慢与偏见" },
    { value: "鲁迅", label: "鲁迅" },
    { value: "intitle:三体", label: "三体" },
  ],
};

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isValidIsbn(value: string) {
  if (/^\d{13}$/.test(value)) {
    const sum = value.slice(0, 12).split("").reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
      0,
    );
    return (10 - (sum % 10)) % 10 === Number(value[12]);
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    return value.split("").reduce((total, digit, index) => {
      const number = digit === "X" ? 10 : Number(digit);
      return total + number * (10 - index);
    }, 0) % 11 === 0;
  }
  return false;
}

function hasDownload(book: BookResult) {
  return Boolean(book.downloads.epub || book.downloads.pdf);
}

export function BookLookup() {
  const [mode, setMode] = useState<"isbn" | "search">("search");
  const [input, setInput] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [books, setBooks] = useState<BookResult[]>([]);
  const [selected, setSelected] = useState<BookResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeScanner, setNativeScanner] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNativeScanner(Boolean(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.BarcodeScanner));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const normalized = useMemo(() => normalizeIsbn(input), [input]);
  const invalidIsbn = mode === "isbn" && Boolean(input) && !isValidIsbn(normalized);

  function changeMode(next: "isbn" | "search") {
    setMode(next);
    setInput("");
    setBooks([]);
    setSelected(null);
    setError("");
    setSearched(false);
    if (next === "isbn") setFreeOnly(false);
  }

  async function lookup(value = input) {
    const query = mode === "isbn" ? normalizeIsbn(value) : value.trim();
    setInput(value);
    setError("");

    if (!query) {
      setError("请输入书名、作者或 ISBN。");
      return;
    }
    if (mode === "isbn" && !isValidIsbn(query)) {
      setError("请输入有效的 ISBN-10 或 ISBN-13。横线和空格会自动忽略。");
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      const params = new URLSearchParams({ q: query, mode, freeOnly: String(freeOnly) });
      const response = await fetch(`/api/books/search?${params}`);
      const data = (await response.json()) as { books?: BookResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || "查询失败");
      const next = data.books || [];
      setBooks(next);
      if (mode === "isbn" && next.length) setSelected(next[0]);
    } catch (reason) {
      setBooks([]);
      setError(reason instanceof Error ? reason.message : "查询服务暂时不可用");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup();
  }

  async function scanIsbn() {
    const scanner = window.Capacitor?.Plugins?.BarcodeScanner;
    if (!scanner) return;
    setError("");
    setScanning(true);
    try {
      const support = await scanner.isSupported?.();
      if (support && !support.supported) throw new Error("当前设备不支持条码扫描");
      const permission = await scanner.requestPermissions?.();
      if (permission && !["granted", "limited"].includes(permission.camera)) {
        throw new Error("需要相机权限才能扫描书籍条码");
      }
      const result = await scanner.scan();
      const value = result.barcodes?.[0]?.rawValue || result.barcodes?.[0]?.displayValue;
      if (!value) throw new Error("没有识别到 ISBN，请重新扫描");
      const isbn = normalizeIsbn(value);
      setInput(isbn);
      await lookup(isbn);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "条码扫描失败");
    } finally {
      setScanning(false);
    }
  }

  async function copySummary() {
    if (!selected) return;
    const isbn = selected.identifiers.find((item) => item.type?.startsWith("ISBN"))?.identifier;
    await navigator.clipboard.writeText(
      [selected.title, selected.authors.join("、"), selected.publisher, selected.publishedDate, isbn && `ISBN ${isbn}`]
        .filter(Boolean)
        .join("\n"),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const visibleBooks = freeOnly ? books.filter(hasDownload) : books;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="书目返回顶部">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>书目</span>
        </a>
        <a className="source-link" href="https://books.google.com/" target="_blank" rel="noreferrer">
          数据来源 Google Books <ExternalLink size={14} />
        </a>
      </header>

      <section className="workspace" id="top">
        <div className="intro">
          <h1>找到一本书，也找到阅读它的方式。</h1>
          <p>按书名、作者或 ISBN 搜索。公版书可直接下载官方 EPUB/PDF，其他书籍提供在线预览或购买入口。</p>
        </div>

        <div className="mode-switch" role="tablist" aria-label="查询方式">
          <button className={mode === "search" ? "active" : ""} onClick={() => changeMode("search")} role="tab" aria-selected={mode === "search"}>书名 / 作者</button>
          <button className={mode === "isbn" ? "active" : ""} onClick={() => changeMode("isbn")} role="tab" aria-selected={mode === "isbn"}>ISBN 精确查询</button>
        </div>

        <form className="search-form" onSubmit={submit}>
          <label htmlFor="book-query">{mode === "isbn" ? "ISBN-10 或 ISBN-13" : "书名、作者或 Google Books 查询语法"}</label>
          <div className={`search-box ${invalidIsbn ? "invalid" : ""}`}>
            <Search size={21} aria-hidden="true" />
            <input
              id="book-query"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "isbn" ? "例如 9780140328721" : "例如：傲慢与偏见、鲁迅、intitle:三体"}
              autoComplete="off"
              inputMode={mode === "isbn" ? "text" : "search"}
            />
            {input && <button className="clear-button" type="button" onClick={() => setInput("")} aria-label="清空查询"><X size={18} /></button>}
            <button className="search-button" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
              搜索图书
            </button>
          </div>

          <div className="search-options">
            <div className="examples" aria-label="示例查询">
              <span>试试：</span>
              {examples[mode].map((example) => (
                <button type="button" key={example.value} onClick={() => void lookup(example.value)}>{example.label}</button>
              ))}
              {mode === "isbn" && nativeScanner && (
                <button className="scan-button" type="button" disabled={scanning} onClick={() => void scanIsbn()}>
                  {scanning ? <LoaderCircle className="spin" size={14} /> : <ScanLine size={14} />} 扫描条码
                </button>
              )}
            </div>
            {mode === "search" && (
              <label className="free-filter">
                <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
                <Filter size={14} /> 只看可下载
              </label>
            )}
          </div>
        </form>

        {error && <div className="message error-message">{error}</div>}

        {!searched && !error && (
          <section className="empty-state">
            <div className="book-stack" aria-hidden="true"><span /><span /><span /></div>
            <div>
              <h2>从一个关键词开始</h2>
              <p>搜索结果会明确区分“直接下载”“在线预览”和“购买”，不会把受限预览伪装成免费下载。</p>
            </div>
          </section>
        )}

        {loading && <section className="loading-state" aria-live="polite"><LoaderCircle className="spin" size={26} /><span>正在检索 Google Books…</span></section>}

        {!loading && searched && !error && visibleBooks.length === 0 && (
          <div className="no-results"><BookOpen size={30} /><h2>没有找到符合条件的书</h2><p>尝试缩短关键词、改用作者名，或关闭“只看可下载”。</p></div>
        )}

        {!loading && visibleBooks.length > 0 && !selected && (
          <section className="results-section">
            <div className="results-heading"><h2>搜索结果</h2><span>{visibleBooks.length} 条</span></div>
            <div className="result-list">
              {visibleBooks.map((book) => (
                <button className="result-row" key={book.id} type="button" onClick={() => setSelected(book)}>
                  <div className="row-cover">
                    {book.cover ? <Image src={book.cover} alt="" fill sizes="64px" unoptimized /> : <BookOpen size={23} />}
                  </div>
                  <div className="row-copy">
                    <div className="row-title-line">
                      <h3>{book.title}</h3>
                      {hasDownload(book) && <span className="downloadable"><Download size={12} /> 可下载</span>}
                    </div>
                    <p>{book.authors.join("、") || "作者未知"}</p>
                    <small>{[book.source, book.publisher, book.publishedDate, book.language?.toUpperCase()].filter(Boolean).join(" · ")}</small>
                  </div>
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
          </section>
        )}

        {selected && <BookDetail book={selected} copied={copied} onCopy={copySummary} onBack={() => setSelected(null)} />}
      </section>

      <footer>下载按钮仅展示 Google Books 或 Project Gutenberg 明确提供的公版官方下载链接。</footer>
    </main>
  );
}

function BookDetail({ book, copied, onCopy, onBack }: { book: BookResult; copied: boolean; onCopy: () => void; onBack: () => void }) {
  const isbn = book.identifiers.find((item) => item.type === "ISBN_13")?.identifier || book.identifiers.find((item) => item.type === "ISBN_10")?.identifier;
  return (
    <section className="result detail-result" aria-live="polite">
      <button className="back-button" type="button" onClick={onBack}>返回搜索结果</button>
      <div className="cover-wrap">
        {book.cover ? <Image src={book.cover} alt={`${book.title} 封面`} width={280} height={420} className="cover" unoptimized /> : <div className="cover-fallback"><BookOpen size={42} /><span>暂无封面</span></div>}
      </div>
      <div className="book-info">
        <div className="result-heading">
          <div>
            <span className={`access-label ${hasDownload(book) ? "available" : "preview"}`}>
              {hasDownload(book) ? <><ShieldCheck size={15} /> {book.source} 公版可下载</> : <><FileText size={15} /> {book.previewLink ? "可在线预览" : "仅书目信息"}</>}
            </span>
            <h2>{book.title}</h2>
            {book.subtitle && <p className="subtitle">{book.subtitle}</p>}
          </div>
          <button className="copy-button" type="button" onClick={onCopy}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "已复制" : "复制信息"}</button>
        </div>

        <div className="primary-actions">
          {book.downloads.epub && <a className="download-action" href={book.downloads.epub} target="_blank" rel="noreferrer"><Download size={18} /> 下载 EPUB</a>}
          {book.downloads.pdf && <a className="download-action" href={book.downloads.pdf} target="_blank" rel="noreferrer"><Download size={18} /> 下载 PDF</a>}
          {book.previewLink && <a className="secondary-action" href={book.previewLink} target="_blank" rel="noreferrer"><BookOpen size={18} /> 在线预览</a>}
          {book.purchase?.link && <a className="secondary-action" href={book.purchase.link} target="_blank" rel="noreferrer"><ShoppingBag size={18} /> 购买{book.purchase.amount ? ` ${book.purchase.amount} ${book.purchase.currency}` : ""}</a>}
        </div>

        <dl className="metadata">
          <div><dt>作者</dt><dd>{book.authors.join("、") || "未提供"}</dd></div>
          <div><dt>出版社</dt><dd>{book.publisher || "未提供"}</dd></div>
          <div><dt>出版日期</dt><dd>{book.publishedDate || "未提供"}</dd></div>
          <div><dt>页数</dt><dd>{book.pageCount ? `${book.pageCount} 页` : "未提供"}</dd></div>
          <div><dt>ISBN</dt><dd className="mono">{isbn || "未提供"}</dd></div>
        </dl>

        {book.description && <p className="description">{book.description}</p>}
        {book.categories.length > 0 && <div className="subjects">{book.categories.slice(0, 6).map((category) => <span key={category}>{category}</span>)}</div>}
        {book.infoLink && <a className="detail-link" href={book.infoLink} target="_blank" rel="noreferrer">在 {book.source} 查看完整记录 <ExternalLink size={15} /></a>}
      </div>
    </section>
  );
}
