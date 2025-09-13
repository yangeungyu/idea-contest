require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB에 연결되었습니다.');
  
  try {
    // 기존 사용자 데이터 모두 삭제
    const result = await mongoose.connection.db.collection('users').deleteMany({});
    console.log(`삭제된 사용자 수: ${result.deletedCount}`);
    
    // 세션 데이터도 삭제
    const sessionResult = await mongoose.connection.db.collection('sessions').deleteMany({});
    console.log(`삭제된 세션 수: ${sessionResult.deletedCount}`);
    
    console.log('사용자 데이터베이스가 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.error('데이터베이스 초기화 중 오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결이 해제되었습니다.');
    process.exit(0);
  }
})
.catch((error) => {
  console.error('MongoDB 연결 오류:', error);
  process.exit(1);
});
