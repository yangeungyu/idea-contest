# Render 배포 가이드

## 데이터 영구 보존을 위한 MongoDB Atlas 설정

### 1. 현재 상황
- 로컬 개발: MongoDB 연결 실패 시 JSON 파일 사용 (임시 저장)
- Render 배포: MongoDB Atlas 연결 시 클라우드 DB 사용 (영구 저장)

### 2. Render 배포 시 환경 변수 설정

Render 대시보드에서 다음 환경 변수들을 설정해야 합니다:

```
MONGODB_URI=mongodb+srv://yangeg2004:diddmsrb123@hongidea.y6nah3o.mongodb.net/hongcheon-academy?retryWrites=true&w=majority&appName=hongidea
NODE_ENV=production
SESSION_SECRET=your-super-secret-key-here
PORT=10000
```

### 3. 배포 과정

1. **GitHub 연결**: Render에서 GitHub 저장소 연결
2. **환경 변수 설정**: 위의 환경 변수들을 Render 대시보드에 입력
3. **빌드 설정**:
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. **배포 실행**: 자동으로 배포가 시작됩니다

### 4. 데이터 보존 확인

배포 후 다음을 확인하세요:

1. **MongoDB 연결 로그**: 
   ```
   MongoDB에 성공적으로 연결되었습니다.
   ```

2. **데이터 테스트**:
   - 공지사항 작성 후 서버 재시작
   - 사용자 등록 후 서버 재시작
   - 스터디 생성 후 서버 재시작

### 5. 문제 해결

#### MongoDB 연결 실패 시
- Render 로그에서 연결 오류 확인
- MongoDB Atlas IP 화이트리스트에 `0.0.0.0/0` 추가
- 환경 변수 값 재확인

#### 세션 문제 시
- SESSION_SECRET 환경 변수 확인
- MongoDB 세션 스토어 연결 상태 확인

### 6. 보안 고려사항

1. **환경 변수**: 민감한 정보는 반드시 환경 변수로 설정
2. **IP 화이트리스트**: 가능하면 특정 IP만 허용
3. **비밀번호**: 강력한 비밀번호 사용

### 7. 모니터링

- Render 대시보드에서 로그 모니터링
- MongoDB Atlas에서 연결 상태 확인
- 정기적인 데이터 백업 권장

## 결론

이제 Render에 배포하면 MongoDB Atlas를 통해 데이터가 영구적으로 보존됩니다. 서버를 재시작해도 공지사항, 사용자 정보, 보안 질문 등 모든 데이터가 유지됩니다.
