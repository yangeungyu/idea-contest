// 설문 링크 (실제 Google Form 주소로 교체하세요)
const FORM_STUDENT = "https://docs.google.com/forms/학생용";
const FORM_SOLDIER = "https://docs.google.com/forms/군인용";

function openSurvey(type) {
  if (type === "student") {
    window.open(FORM_STUDENT, "_blank");
  } else if (type === "soldier") {
    window.open(FORM_SOLDIER, "_blank");
  }
}
