// 전역 변수
let hoverTimeout;

// 현재 사용자 정보 가져오기
async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/current-user', {
      credentials: 'include'
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('사용자 정보를 가져오는 중 오류 발생:', error);
    return { isAuthenticated: false };
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      window.location.href = '/';
      window.location.reload();
    } else {
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// 전역으로 함수 등록
window.handleLogout = handleLogout;

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', async function() {
  // 공통 페이지 초기화
  await initializePage();
});