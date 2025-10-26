// 사이드바 공통 기능
function initializeSidebar() {
  // 현재 페이지에 해당하는 메뉴 아이템 활성화
  function setActivePage() {
    // 사이드바가 로드될 때까지 기다림
    setTimeout(() => {
      // 현재 페이지 파일명 가져오기
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
      // 모든 사이드바 링크에서 활성 클래스 제거
      const sidebarLinks = document.querySelectorAll('#sidebar a[data-page]');
      sidebarLinks.forEach(link => {
        link.classList.remove('sidebar-active');
      });
      
      // 현재 페이지에 해당하는 링크 찾기 및 활성화
      let activeLink = null;
      
      if (currentPage === 'index.html' || currentPage === '') {
        activeLink = document.querySelector('#sidebar a[data-page="index"]');
      } else if (currentPage === 'create-meeting.html') {
        activeLink = document.querySelector('#sidebar a[data-page="create-meeting"]');
      } else if (currentPage === 'community.html') {
        activeLink = document.querySelector('#sidebar a[data-page="community"]');
      } else if (currentPage === 'studies.html') {
        activeLink = document.querySelector('#sidebar a[data-page="studies"]');
      } else if (currentPage === 'notices.html') {
        activeLink = document.querySelector('#sidebar a[data-page="notices"]');
      } else if (currentPage === 'mypage.html') {
        activeLink = document.querySelector('#sidebar a[data-page="mypage"]');
      }
      
      // 활성 링크에 클래스 추가
      if (activeLink) {
        activeLink.classList.add('sidebar-active');
        console.log('활성 페이지 설정:', currentPage);
      } else {
        console.log('활성 링크를 찾을 수 없음:', currentPage);
        console.log('사용 가능한 사이드바 링크:', document.querySelectorAll('#sidebar a[data-page]'));
      }
    }, 100);
  }
  
  setActivePage();
  
  // 사이드바 토글 (모바일) - 모바일 로고 클릭으로 사이드바 토글
  const mobileLogoBtn = document.getElementById('mobileLogoBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (mobileLogoBtn && sidebar && sidebarOverlay) {
    mobileLogoBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('모바일 로고 클릭됨!');
      console.log('현재 사이드바 클래스:', sidebar.className);
      
      const isVisible = sidebar.classList.contains('mobile-visible');
      if (isVisible) {
        sidebar.classList.remove('mobile-visible');
        sidebarOverlay.classList.add('hidden');
      } else {
        sidebar.classList.add('mobile-visible');
        sidebarOverlay.classList.remove('hidden');
      }
      console.log('토글 후 사이드바 클래스:', sidebar.className);
    });
    
    // 오버레이 클릭 시 사이드바 닫기
    sidebarOverlay.addEventListener('click', function() {
      sidebar.classList.remove('mobile-visible');
      sidebarOverlay.classList.add('hidden');
    });
  }
  
  // 화면 크기 변경 시 사이드바 상태 조정
  window.addEventListener('resize', function() {
    if (window.innerWidth > 1023) {
      sidebar.classList.remove('mobile-visible');
      sidebarOverlay.classList.add('hidden');
    }
  });

  // 사이드바 확장/축소 토글 기능
  const sidebarToggle = document.getElementById('sidebarToggle');
  
  if (sidebarToggle && sidebar) {
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

  console.log('사이드바 초기화 완료');
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
