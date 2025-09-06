// 사이드바 공통 기능
function initializeSidebar() {
  // 사이드바 토글 (모바일)
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('-translate-x-full');
      sidebarOverlay.classList.toggle('hidden');
    });
    
    // 오버레이 클릭 시 사이드바 닫기
    sidebarOverlay.addEventListener('click', function() {
      sidebar.classList.add('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
    });
  }

  // 사이드바 확장/축소 토글 기능
  const sidebarToggle = document.getElementById('sidebarToggle');
  
  if (sidebarToggle && sidebar) {
    console.log('사이드바 토글 버튼 찾음:', sidebarToggle);
    
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('로고 클릭됨!');
      
      // 현재 상태 확인
      const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
      console.log('현재 상태 - 접힘:', isCollapsed);
      
      // 클래스 토글
      if (isCollapsed) {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');
        console.log('→ 사이드바 확장됨');
      } else {
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.add('sidebar-collapsed');
        console.log('→ 사이드바 축소됨');
      }
      
      console.log('최종 클래스:', sidebar.className);
    });
  } else {
    console.error('사이드바 토글 버튼을 찾을 수 없습니다!');
  }

  // 현재 페이지 활성화 표시
  const currentPage = document.body.getAttribute('data-page');
  if (currentPage) {
    const activeLink = document.querySelector(`[data-page="${currentPage}"]`);
    if (activeLink) {
      activeLink.classList.add('bg-green-700');
    }
  }

  // 사이드바 사용자 정보 업데이트
  updateSidebarUserInfo();
}

// 사이드바 사용자 정보 업데이트 (현재는 사용하지 않음)
async function updateSidebarUserInfo() {
  // 사이드바에서 사용자 정보 섹션을 제거했으므로 빈 함수로 유지
}

// 사이드바 로드 함수
function loadSidebar() {
  return fetch('sidebar.html')
    .then(response => response.text())
    .then(html => {
      // 사이드바를 body의 첫 번째 자식으로 삽입
      document.body.insertAdjacentHTML('afterbegin', html);
      
      // 사이드바 초기화
      initializeSidebar();
    })
    .catch(error => {
      console.error('사이드바 로드 오류:', error);
    });
}
