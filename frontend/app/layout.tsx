import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쉬운 행정문서 변환기",
  description: "행정문서를 장애인과 고령자가 읽기 쉬운 말로 바꾸는 웹 도구"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
