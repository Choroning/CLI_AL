import { SelectionWorkbench } from "@/components/SelectionWorkbench";

const sampleDocument = `기초연금 수급을 희망하는 사람은 주소지 관할 읍·면·동 행정복지센터 또는 국민연금공단 지사에 신청서를 제출하여야 합니다.

신청인은 신분증, 통장 사본, 금융정보 등 제공동의서 및 소득·재산 확인에 필요한 서류를 함께 제출해야 합니다.

담당 기관은 신청인의 소득인정액을 조사한 뒤 선정기준액 이하에 해당하는 경우 급여 지급 여부를 결정합니다.

거짓이나 그 밖의 부정한 방법으로 급여를 받은 경우에는 이미 지급된 급여의 전부 또는 일부를 환수할 수 있습니다.`;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="intro-panel" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Team CLI 행정문서 쉬운말 변환기</p>
          <h1 id="page-title">문서를 올리고 원문에서 바로 쉬운말을 확인하세요</h1>
        </div>
        <p>
          TXT, HWPX, DOCX, PDF 문서를 불러오거나 텍스트를 직접 붙여넣고,
          단락을 클릭해 쉬운 뜻과 표현을 확인할 수 있습니다.
        </p>
      </section>

      <SelectionWorkbench initialDocument={sampleDocument} />
    </main>
  );
}
