"use client";

import {
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  History,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type BookData = {
  title: string;
  subtitle?: string;
  authors?: { name: string; url?: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
  url?: string;
  identifiers?: Record<string, string[]>;
  subjects?: { name: string }[];
};

type RecentItem = { isbn: string; title: string };

const examples = [
  { isbn: "9780140328721", label: "Matilda" },
  { isbn: "9780439554930", label: "Harry Potter" },
  { isbn: "9780061120084", label: "To Kill a Mockingbird" },
];

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isValidIsbn(value: string) {
  if (/^\d{13}$/.test(value)) {
    const sum = value
      .slice(0, 12)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(value[12]);
  }

  if (/^\d{9}[\dX]$/.test(value)) {
    const sum = value.split("").reduce((total, digit, index) => {
      const number = digit === "X" ? 10 : Number(digit);
      return total + number * (10 - index);
    }, 0);
    return sum % 11 === 0;
  }

  return false;
}

export function BookLookup() {
  const [input, setInput] = useState("");
  const [book, setBook] = useState<BookData | null>(null);
  const [currentIsbn, setCurrentIsbn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setRecent(JSON.parse(localStorage.getItem("isbn-recent") || "[]"));
      } catch {
        setRecent([]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const normalized = useMemo(() => normalizeIsbn(input), [input]);
  const valid = isValidIsbn(normalized);

  async function lookup(isbn: string) {
    const clean = normalizeIsbn(isbn);
    setInput(clean);
    setError("");
    setBook(null);
    setLoading(true);

    if (!isValidIsbn(clean)) {
      setError("请输入有效的 ISBN-10 或 ISBN-13。横线和空格会自动忽略。");
      setLoading(false);
      return;
    }

    try {
      const key = `ISBN:${clean}`;
      const response = await fetch(
        `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&jscmd=data&format=json`,
      );
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as Record<string, BookData>;
      const result = data[key];

      if (!result) {
        setError("Open Library 暂未收录这本书。请检查 ISBN，或尝试另一个版本的 ISBN。");
        return;
      }

      setBook(result);
      setCurrentIsbn(clean);
      const next = [
        { isbn: clean, title: result.title },
        ...recent.filter((item) => item.isbn !== clean),
      ].slice(0, 5);
      setRecent(next);
      localStorage.setItem("isbn-recent", JSON.stringify(next));
    } catch {
      setError("查询服务暂时不可用，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup(normalized);
  }

  async function copySummary() {
    if (!book) return;
    const summary = [
      book.title,
      book.authors?.map((author) => author.name).join("、"),
      book.publishers?.map((publisher) => publisher.name).join("、"),
      book.publish_date,
      `ISBN ${currentIsbn}`,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadJson() {
    if (!book) return;
    const blob = new Blob([JSON.stringify({ isbn: currentIsbn, ...book }, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `book-${currentIsbn}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="书目返回顶部">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>书目</span>
        </a>
        <a className="source-link" href="https://openlibrary.org/" target="_blank" rel="noreferrer">
          数据来源 Open Library <ExternalLink size={14} />
        </a>
      </header>

      <section className="workspace" id="top">
        <div className="intro">
          <h1>一本书，从 ISBN 开始。</h1>
          <p>输入书背上的 ISBN，快速获取封面、作者、出版社与出版信息。无需登录，查询记录只保存在当前浏览器。</p>
        </div>

        <form className="search-form" onSubmit={submit}>
          <label htmlFor="isbn">ISBN-10 或 ISBN-13</label>
          <div className={`search-box ${input && !valid ? "invalid" : ""}`}>
            <Search size={21} aria-hidden="true" />
            <input
              id="isbn"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如 9787115428028"
              autoComplete="off"
              inputMode="text"
            />
            {input && (
              <button className="clear-button" type="button" onClick={() => setInput("")} aria-label="清空 ISBN">
                <X size={18} />
              </button>
            )}
            <button className="search-button" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
              查询图书
            </button>
          </div>
          <div className="examples" aria-label="示例 ISBN">
            <span>试试：</span>
            {examples.map((example) => (
              <button type="button" key={example.isbn} onClick={() => void lookup(example.isbn)}>
                {example.label}
              </button>
            ))}
          </div>
        </form>

        {error && <div className="message error-message">{error}</div>}

        {!book && !error && !loading && (
          <section className="empty-state">
            <div className="book-stack" aria-hidden="true"><span /><span /><span /></div>
            <div>
              <h2>准备查询一本书</h2>
              <p>ISBN 通常位于书籍背面的条形码上，支持带横线或空格输入。</p>
            </div>
          </section>
        )}

        {loading && (
          <section className="loading-state" aria-live="polite">
            <LoaderCircle className="spin" size={26} />
            <span>正在查找书目信息…</span>
          </section>
        )}

        {book && (
          <section className="result" aria-live="polite">
            <div className="cover-wrap">
              {book.cover?.large || book.cover?.medium ? (
                <Image
                  src={book.cover.large || book.cover.medium || ""}
                  alt={`${book.title} 封面`}
                  width={280}
                  height={420}
                  className="cover"
                  unoptimized
                />
              ) : (
                <div className="cover-fallback"><BookOpen size={42} /><span>暂无封面</span></div>
              )}
            </div>

            <div className="book-info">
              <div className="result-heading">
                <div>
                  <span className="found"><Sparkles size={15} /> 已找到</span>
                  <h2>{book.title}</h2>
                  {book.subtitle && <p className="subtitle">{book.subtitle}</p>}
                </div>
                <div className="actions">
                  <button type="button" onClick={copySummary} title="复制书目信息">
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? "已复制" : "复制"}
                  </button>
                  <button type="button" onClick={downloadJson} title="下载 JSON">
                    <Download size={18} /> JSON
                  </button>
                </div>
              </div>

              <dl className="metadata">
                <div><dt>作者</dt><dd>{book.authors?.map((author) => author.name).join("、") || "未提供"}</dd></div>
                <div><dt>出版社</dt><dd>{book.publishers?.map((publisher) => publisher.name).join("、") || "未提供"}</dd></div>
                <div><dt>出版日期</dt><dd>{book.publish_date || "未提供"}</dd></div>
                <div><dt>页数</dt><dd>{book.number_of_pages ? `${book.number_of_pages} 页` : "未提供"}</dd></div>
                <div><dt>ISBN</dt><dd className="mono">{currentIsbn}</dd></div>
              </dl>

              {book.subjects?.length ? (
                <div className="subjects">
                  {book.subjects.slice(0, 7).map((subject) => <span key={subject.name}>{subject.name}</span>)}
                </div>
              ) : null}

              {book.url && (
                <a className="detail-link" href={book.url} target="_blank" rel="noreferrer">
                  在 Open Library 查看完整记录 <ExternalLink size={15} />
                </a>
              )}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="recent">
            <div className="section-title"><History size={18} /><h2>最近查询</h2></div>
            <div className="recent-list">
              {recent.map((item) => (
                <button key={item.isbn} type="button" onClick={() => void lookup(item.isbn)}>
                  <span>{item.title}</span><small>{item.isbn}</small>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

      <footer>书目信息可能存在缺失或差异，请以实体书版权页为准。</footer>
    </main>
  );
}
