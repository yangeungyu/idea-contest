/* 기본 스타일 */
body {
    font-family: "Noto Sans KR", sans-serif;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    color: #333;
    background: #fafafa;
  }
  
  /* 헤더 */
  header {
    background: #b22222;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 30px;
    position: sticky;
    top: 0;
  }
  
  header .logo {
    font-size: 1.5em;
    font-weight: bold;
  }
  
  header nav a {
    margin-left: 20px;
    color: white;
    text-decoration: none;
    font-weight: 500;
  }
  
  header nav a:hover {
    text-decoration: underline;
  }
  
  /* 히어로 섹션 */
  .hero {
    background: url("https://picsum.photos/1600/400") no-repeat center/cover;
    color: white;
    text-align: center;
    padding: 100px 20px;
  }
  
  .hero h1 {
    font-size: 3em;
    margin-bottom: 10px;
  }
  
  /* 섹션 공통 */
  section {
    padding: 60px 20px;
    max-width: 900px;
    margin: auto;
  }
  
  section h2 {
    color: #b22222;
    margin-bottom: 20px;
  }
  
  ul {
    list-style: disc;
    padding-left: 20px;
  }
  
  /* 버튼 */
  .survey-buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
  }
  
  button {
    background: #b22222;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-size: 1em;
    cursor: pointer;
    transition: 0.3s;
  }
  
  button:hover {
    background: #8b1a1a;
  }
  
  /* 푸터 */
  footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 20px;
  }
  
  /* 추가 스타일 */
  .shadow-lg {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }
  
  .search-form {
    position: relative;
  }
  
  .search-form input[type="text"] {
    padding: 10px;
    border: none;
    border-radius: 5px;
    width: 100%;
  }
  
  .search-form button[type="submit"] {
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    background: #b22222;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
  }
  
  .category-card {
    transition: transform 0.3s ease;
  }
  
  .category-card:hover {
    transform: translateY(-5px);
  }
  
  .event-card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
  
  .event-image {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 10px 10px 0 0;
  }
  
  .event-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #b22222;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
  }
  
  .mobile-menu {
    display: none;
  }
  
  .mobile-menu-button {
    display: none;
  }
  
  @media (max-width: 768px) {
    .mobile-menu {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background: white;
      padding: 20px;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }
    
    .mobile-menu-button {
      display: block;
      position: fixed;
      top: 10px;
      left: 10px;
      background: #b22222;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    
    .mobile-menu-button:hover {
      background: #8b1a1a;
    }
    
    .mobile-menu.hidden {
      transform: translateX(-100%);
    }
    
    .mobile-menu.show {
      transform: translateX(0);
    }
  }
  
  // 헤더 스크롤 이벤트
  window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
      header.classList.add('shadow-lg');
    } else {
      header.classList.remove('shadow-lg');
    }
  });
  
  // 검색 기능
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const searchInput = this.querySelector('input[type="text"]');
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        // 검색 로직 구현 (예: 검색 페이지로 이동)
        console.log('검색어:', searchTerm);
        // window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
      }
    });
  }
  
  // 카테고리 호버 효과
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
  
  // 날짜 포맷팅 함수
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ko-KR', options);
  }
  
  // 이벤트 카드 생성 함수 (데이터 바인딩용)
  function createEventCard(event) {
    return `
      <div class="event-card">
        <div class="relative">
          <img src="${event.image || 'https://picsum.photos/400/300?random=' + Math.floor(Math.random() * 1000)}" 
               alt="${event.title}" class="event-image">
          ${event.badge ? `<span class="event-badge">${event.badge}</span>` : ''}
        </div>
        <div class="p-4">
          <div class="text-sm text-gray-500 mb-1">
            ${formatDate(event.startDate)} ~ ${formatDate(event.endDate)}
          </div>
          <h3 class="font-bold text-lg mb-2">${event.title}</h3>
          <p class="text-gray-600 text-sm mb-4">${event.description}</p>
          <div class="flex justify-between items-center">
            <span class="text-red-600 font-bold">${event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}</span>
            <span class="text-sm text-gray-500">신청 ${event.currentParticipants}/${event.maxParticipants}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // 모바일 메뉴 토글
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
      mobileMenu.classList.toggle('hidden');
    });
  }
  
  // 페이지 로드 시 이벤트 카드 렌더링 (예시 데이터)
  document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('events-container');
    
    if (eventsContainer) {
      // 실제 데이터는 API에서 가져오는 것으로 대체
      const sampleEvents = [
        {
          title: '웹 개발 입문 워크샵',
          description: 'HTML, CSS, JavaScript 기초부터 배우는 웹 개발 입문 과정',
          startDate: '2023-11-10',
          endDate: '2023-11-12',
          price: 0,
          currentParticipants: 15,
          maxParticipants: 30,
          badge: '마감임박'
        },
        // 추가 이벤트 데이터...
      ];
      
      // 이벤트 카드 렌더링
      const eventsHTML = sampleEvents.map(event => createEventCard(event)).join('');
      eventsContainer.innerHTML = eventsHTML;
    }
    
    // 로그인/회원가입 버튼 이벤트 핸들러
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        window.location.href = '/login.html';
      });
    }

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.addEventListener('click', function() {
        window.location.href = '/register.html';
      });
    }

    // 드롭다운 메뉴 토글
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      const button = dropdown.querySelector('button');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      button.addEventListener('click', () => {
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
      });
      
      // 외부 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    });

    // 모바일 메뉴 토글
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', !isOpen);
        mobileMenu.classList.toggle('block', isOpen);
      });
    }
  });
  
  // 스크롤 시 헤더 색상 변경
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    } else {
      header.style.background = 'white';
      header.style.backdropFilter = 'none';
    }
  });
  
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

  // 날짜 포맷팅 함수
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ko-KR', options);
  }

  // 이벤트 카드 생성 함수 (데이터 바인딩용)
  function createEventCard(event) {
    return `
      <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div class="h-48 bg-gray-200 relative">
          <img src="${event.image}" alt="${event.title}" class="w-full h-full object-cover">
          ${event.badge ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">${event.badge}</span>` : ''}
        </div>
        <div class="p-4">
          <div class="text-sm text-gray-500 mb-1">${event.date}</div>
          <h3 class="font-bold text-lg mb-2">${event.title}</h3>
          <p class="text-gray-600 text-sm mb-4">${event.description}</p>
          <div class="flex justify-between items-center">
            <span class="text-red-600 font-bold">${event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}</span>
            <span class="text-sm text-gray-500">신청 ${event.participants}/${event.maxParticipants}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 인기 행사 로드 함수
  async function loadPopularEvents() {
    try {
      const eventsContainer = document.getElementById('events-container');
      if (!eventsContainer) return;

      // 실제로는 API를 통해 데이터를 가져옵니다.
      // 여기서는 예시 데이터를 사용합니다.
      const sampleEvents = [
        {
          id: 1,
          title: '웹 개발 입문 워크샵',
          description: 'HTML, CSS, JavaScript 기초부터 배우는 웹 개발 입문 과정',
          date: '2023.11.10 ~ 2023.11.12',
          price: 0,
          participants: 15,
          maxParticipants: 30,
          badge: '마감임박',
          image: 'https://picsum.photos/400/300?random=1'
        },
        // 추가 이벤트 데이터...
      ];
      
      const eventsHTML = sampleEvents.map(event => createEventCard(event)).join('');
      eventsContainer.innerHTML = eventsHTML;
    } catch (error) {
      console.error('이벤트를 불러오는 중 오류 발생:', error);
    }
  }

  // 페이지 로드 시 실행
  document.addEventListener('DOMContentLoaded', async () => {
    // 로그인/회원가입 버튼 이벤트 핸들러
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'login.html';
      });
    }

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'register.html';
      });
    }

    // 드롭다운 메뉴 토글
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      const button = dropdown.querySelector('button');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
      });
      
      // 외부 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    });

    // 모바일 메뉴 토글
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', !isOpen);
        mobileMenu.classList.toggle('block', isOpen);
      });
    }

    // 현재 로그인 상태 확인 및 UI 업데이트
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('userMenu');
    
    if (authButtons && userMenu) {
      const { isAuthenticated, user } = await fetchCurrentUser();
      
      if (isAuthenticated && user) {
        // 로그인 상태일 때
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        
        const userNickname = document.getElementById('userNickname');
        if (userNickname) {
          userNickname.textContent = user.nickname || user.username;
        }
      } else {
        // 비로그인 상태일 때
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
      }
    }
    
    // 인기 행사 로드
    loadPopularEvents();
  });