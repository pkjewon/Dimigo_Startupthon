import { requireUser } from "@/lib/auth";
import { RequestForm } from "./request-form";

export default async function NewRequestPage() {
  const user = await requireUser("consumer", "/requests/new");

  return (
    <>
      <div className="subpage-intro">
        <div>
          <div className="eyebrow">FOR CUSTOMER / 01</div>
          <h1>어떤 옷을 찾고 있나요?</h1>
          <p>원하는 조건을 자세히 남길수록 더 정확한 제안을 받을 수 있어요.</p>
        </div>
        <div className="stepper">
          <b>01 요청 작성</b>
          <span className="step-dot" />
          <span>02 제안 비교</span>
          <span className="step-dot" />
          <span>03 선택 & 구매</span>
        </div>
      </div>
      <div className="two-col">
        <RequestForm userId={user.id} />
        <aside className="side-panel">
          <div className="how-card">
            <div className="section-kicker">HOW IT WORKS</div>
            <h3>
              요청 하나로
              <br />
              여러 제안을 받아보세요.
            </h3>
            <div className="how-step">
              <b>01</b>
              <span>찾는 옷과 조건을 작성해요.</span>
            </div>
            <div className="how-step">
              <b>02</b>
              <span>관심 카테고리 판매자에게 알림이 가고, 판매자가 실제 상품으로 제안해요.</span>
            </div>
            <div className="how-step">
              <b>03</b>
              <span>가격·매장 위치를 비교하고 문의하거나 바로 구매해요.</span>
            </div>
          </div>
          <div className="tip-card">
            <h3>좋은 요청 작성 팁</h3>
            <p>브랜드나 제품명을 모르더라도 괜찮아요. 사진, 색상, 핏, 예산 중 알고 있는 정보만 적어주세요.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
