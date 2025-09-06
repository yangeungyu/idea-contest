// 공통 유틸리티 함수들

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
    } else {
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// 사용자 인증 확인 및 UI 업데이트
async function updateAuthUI(user) {
  try {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (user) {
      // 로그인 상태
      authButtons.style.display = 'none';
      userMenu.style.display = 'block';
      userName.textContent = user.name || user.username;
    } else {
      // 로그아웃 상태
      authButtons.style.display = 'flex';
      userMenu.style.display = 'none';
    }
  } catch (error) {
    console.error('인증 UI 업데이트 오류:', error);
  }
}

// 드롭다운 메뉴 초기화
function initializeDropdown() {
  const userMenu = document.getElementById('userMenu');
  const dropdown = userMenu?.querySelector('.dropdown-menu');
  
  if (!userMenu || !dropdown) return;

  let hoverTimeout;

  // 프로필 버튼 클릭 시 토글
  const profileButton = userMenu.querySelector('button');
  if (profileButton) {
    profileButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
    });
  }

  // 마우스 호버 이벤트
  userMenu.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
    dropdown.style.display = 'block';
  });

  userMenu.addEventListener('mouseleave', () => {
    hoverTimeout = setTimeout(() => {
      dropdown.style.display = 'none';
    }, 200);
  });

  dropdown.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
    dropdown.style.display = 'block';
  });

  dropdown.addEventListener('mouseleave', () => {
    hoverTimeout = setTimeout(() => {
      dropdown.style.display = 'none';
    }, 200);
  });

  // 외부 클릭 시 메뉴 닫기
  document.addEventListener('click', function(e) {
    if (!userMenu.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// 페이지 초기화
async function initializePage() {
  // 사이드바 로드
  if (typeof loadSidebar === 'function') {
    await loadSidebar();
  }
  
  // 드롭다운 초기화
  initializeDropdown();
  
  // 인증 UI 업데이트
  const userData = await fetchCurrentUser();
  if (userData.isAuthenticated) {
    await updateAuthUI(userData.user);
  } else {
    await updateAuthUI(null);
  }
}

// 전역으로 함수 등록
window.handleLogout = handleLogout;
window.fetchCurrentUser = fetchCurrentUser;
window.updateAuthUI = updateAuthUI;
window.initializePage = initializePage;
