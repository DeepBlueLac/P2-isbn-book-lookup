import type { Metadata } from "next";
import { BookLookup } from "@/components/book-lookup";

export const metadata: Metadata = {
  title: "书目 - 图书搜索与公版电子书下载",
  description: "按书名、作者或 ISBN 搜索图书。公版书可下载 Google Books 官方 EPUB/PDF，其他图书提供预览和购买入口。",
};

export default function Home() {
  return <BookLookup />;
}
