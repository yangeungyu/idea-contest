require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const MongoDBStore = require('connect-mongodb-session')(session);
const LocalDataStore = require('./dataStore');
const { isAdmin } = require('./admin-middleware');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 10000;

// 데이터베이스 연결 상태 및 로컬 저장소
let isMongoConnected = false;
let localDataStore = null;

// MongoDB 연결 (배포 환경에서는 Atlas, 로컬에서는 폴백)
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10초 타임아웃
      connectTimeoutMS: 15000, // 15초 연결 타임아웃
      maxPoolSize: 10, // 연결 풀 크기
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('MongoDB에 성공적으로 연결되었습니다.');
    isMongoConnected = true;
    
    // MongoDB 연결 상태 모니터링
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB 연결이 끊어졌습니다.');
      isMongoConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB에 다시 연결되었습니다.');
      isMongoConnected = true;
    });
    
  } catch (error) {
    console.error('MongoDB 연결 오류:', error.message);
    console.log('MongoDB 연결에 실패했습니다. 로컬 파일 저장소를 사용합니다.');
    isMongoConnected = false;
    localDataStore = new LocalDataStore();
    console.log('로컬 데이터 저장소가 초기화되었습니다.');
  }
};

connectToDatabase();

// MongoDB 스토어 설정 (연결 실패 시 메모리 스토어 사용)
// 에러가 발생해도 서버가 종료되지 않도록 메모리 스토어를 기본값으로 사용
let store = null;
console.log('메모리 세션 스토어를 사용합니다.');

// 세션 설정
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1일
    httpOnly: true,
    secure: false // 개발환경에서는 false
  }
};

if (store) {
  sessionConfig.store = store;
}

app.use(session(sessionConfig));

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 뷰 엔진 설정 (현재 사용하지 않으므로 주석 처리)
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// 사용자 모델
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  location: { type: String }, // 지역 정보 추가
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // 사용자 역할 추가
  registrationDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, immutable: true },
  securityQuestion: { type: String },
  securityAnswer: { type: String }
});

// 스터디 모델
const studySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  maxMembers: { type: Number, required: true, min: 2, max: 20 },
  currentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // 스터디 종료일 필드 추가
  duration: { type: Number, required: true, min: 1, max: 52 }, // 주 단위
  meetingType: { type: String, enum: ['online', 'offline', 'both'], required: true },
  location: String,
  time: String, // 모임 시간 필드 추가
  frequency: { type: String, enum: ['once', 'weekly', 'biweekly', 'monthly', 'irregular'] }, // 모임 주기 필드 추가
  requirements: String, // 참가 조건/요구사항 필드 추가
  tags: [String],
  imageUrl: { type: String }, // 이미지 URL 필드 추가
  views: { type: Number, default: 0 }, // 조회수 필드 추가
  status: { type: String, enum: ['recruiting', 'in_progress', 'completed'], default: 'recruiting' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 채팅 메시지 모델
const chatMessageSchema = new mongoose.Schema({
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 1000 },
  messageType: { type: String, enum: ['text', 'system'], default: 'text' },
  createdAt: { type: Date, default: Date.now }
});

// 공지사항 모델
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['important', 'general', 'event', 'maintenance'], default: 'general' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPinned: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 커뮤니티 게시글 모델
const communityPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['question', 'discussion', 'share', 'free'], required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 댓글 모델
const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Study = mongoose.model('Study', studySchema);
const Notice = mongoose.model('Notice', noticeSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);
const Comment = mongoose.model('Comment', commentSchema);

// 미들웨어: 로그인 확인
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    // API 요청인 경우 JSON 응답
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    // 일반 페이지 요청인 경우 리다이렉트
    res.redirect('/login');
  }
};

// uploads 디렉토리 생성 (없으면)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'meeting-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 정적 파일 제공 (업로드된 이미지)
app.use('/uploads', express.static('uploads'));

// 이미지 업로드 API
app.post('/api/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '이미지 파일이 필요합니다.' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl: imageUrl });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ message: '이미지 업로드 중 오류가 발생했습니다.' });
  }
});

// 마이페이지
app.get('/mypage', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'mypage.html'));
});

// 로그인 페이지
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 로그인 처리
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(400).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }
    
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      location: user.location,
      role: user.role,
      registrationDate: user.registrationDate
    };
    
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입 페이지
app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'register.html'));
});

// 회원가입 처리
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    console.log('회원가입 요청 데이터:', { username, password: '***', name });
    
    // 유효성 검사
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }
    
    // 중복 사용자 확인
    const existingUser = await User.findOne({ $or: [{ username }, { name }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.username === username ? '이미 사용 중인 아이디입니다.' : '이미 사용 중인 이름입니다.'
      });
    }
    
    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 사용자 생성 (가입일을 명시적으로 설정)
    const registrationDate = new Date();
    const user = new User({
      username,
      password: hashedPassword,
      name,
      email,
      location,
      role: username === 'yangeg2004' ? 'admin' : 'user', // yangeg2004만 관리자 권한
      registrationDate: registrationDate,
      createdAt: registrationDate,
      securityQuestion,
      securityAnswer
    });
    
    await user.save();
    
    // 자동 로그인
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      location: user.location,
      role: user.role,
      registrationDate: user.registrationDate
    };
    
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 로그아웃 처리
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('세션 삭제 오류:', err);
      return res.status(500).json({ success: false, message: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: '로그아웃되었습니다.' });
  });
});

// 현재 사용자 정보 가져오기
app.get('/api/current-user', (req, res) => {
  console.log('세션 확인:', req.session);
  console.log('사용자 정보:', req.session.user);
  
  if (req.session.user) {
    res.json({ isAuthenticated: true, user: req.session.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// 프로필 정보 가져오기
app.get('/api/profile', (req, res) => {
  console.log('프로필 API 호출 - 세션 사용자:', req.session.user);
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: '로그인이 필요합니다.' });
  }
});

// 임시 관리자 권한 업데이트 API
app.post('/api/update-admin', async (req, res) => {
  try {
    const result = await User.updateOne(
      { username: 'yangeg2004' },
      { $set: { role: 'admin' } }
    );
    
    // 세션도 업데이트
    if (req.session.user && req.session.user.username === 'yangeg2004') {
      req.session.user.role = 'admin';
    }
    
    res.json({ success: true, message: 'yangeg2004 계정이 관리자로 업데이트되었습니다.', result });
  } catch (error) {
    console.error('관리자 권한 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '업데이트 중 오류가 발생했습니다.' });
  }
});

// 프로필 업데이트
app.put('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, location, currentPassword, newPassword, securityQuestion, securityAnswer } = req.body;
    
    // 기본 유효성 검사
    if (!name) {
      return res.status(400).json({ success: false, message: '이름을 입력해주세요.' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 비밀번호 변경 요청이 있는 경우
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: '현재 비밀번호를 입력해주세요.' });
      }
      
      // 현재 비밀번호 확인
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
      }
      
      // 새 비밀번호 해싱
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedNewPassword;
    }
    
    // 프로필 정보 업데이트
    user.name = name;
    if (email !== undefined) {
      user.email = email;
    }
    if (location !== undefined) {
      user.location = location;
    }
    
    // 보안 질문 업데이트
    if (securityQuestion !== undefined) {
      user.securityQuestion = securityQuestion;
    }
    if (securityAnswer !== undefined) {
      user.securityAnswer = securityAnswer;
    }
    
    await user.save();
    
    // 세션 정보 업데이트
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      location: user.location,
      role: user.role,
      registrationDate: user.registrationDate,
      securityQuestion: user.securityQuestion,
      securityAnswer: user.securityAnswer
    };
    
    res.json({ 
      success: true, 
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: req.session.user
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '프로필 업데이트 중 오류가 발생했습니다.' });
  }
});

// 스터디 생성
app.post('/api/studies', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // currentMembers 처리
    let currentMembers = [userId];
    if (req.body.currentMembers && Array.isArray(req.body.currentMembers)) {
      // 클라이언트에서 보낸 currentMembers가 객체 배열인 경우
      currentMembers = req.body.currentMembers.map(member => {
        if (typeof member === 'object' && member.username) {
          return {
            userId: userId,
            username: member.username,
            name: member.name,
            isLeader: member.isLeader || false
          };
        }
        return userId;
      });
    }

    const studyData = {
      ...req.body,
      leader: userId,
      currentMembers: currentMembers
    };
    
    // 날짜 필드가 있는 경우에만 변환
    if (req.body.deadline) {
      studyData.deadline = new Date(req.body.deadline);
    }
    if (req.body.startDate) {
      studyData.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      studyData.endDate = new Date(req.body.endDate);
    }

    const study = new Study(studyData);
    await study.save();

    res.status(201).json({ 
      message: '스터디가 성공적으로 생성되었습니다.',
      studyId: study._id
    });
  } catch (error) {
    console.error('스터디 생성 오류:', error);
    console.error('요청 데이터:', req.body);
    res.status(500).json({ message: '스터디 생성 중 오류가 발생했습니다.', error: error.message });
  }
});

// 스터디 목록 조회
app.get('/api/studies', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const studies = await Study.find(query)
      .populate('leader', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Study.countDocuments(query);

    res.json({
      studies,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('스터디 목록 조회 오류:', error);
    res.status(500).json({ message: '스터디 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 스터디 상세 조회 (조회수 증가)
app.get('/api/studies/:id', async (req, res) => {
  try {
    const study = await Study.findById(req.params.id)
      .populate('leader', 'name')
      .populate('currentMembers', 'name');
    
    if (!study) {
      return res.status(404).json({ message: '스터디를 찾을 수 없습니다.' });
    }
    
    // 조회수 증가
    study.views = (study.views || 0) + 1;
    await study.save();
    
    res.json(study);
  } catch (error) {
    console.error('스터디 상세 조회 오류:', error);
    res.status(500).json({ message: '스터디 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 스터디 참가
app.post('/api/studies/:id/join', isAuthenticated, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    const userId = req.session.user.id;

    if (!study) {
      return res.status(404).json({ message: '스터디를 찾을 수 없습니다.' });
    }

    if (study.currentMembers.includes(userId)) {
      return res.status(400).json({ message: '이미 참여 중인 스터디입니다.' });
    }

    if (study.currentMembers.length >= study.maxMembers) {
      return res.status(400).json({ message: '최대 인원에 도달하여 참여할 수 없습니다.' });
    }

    study.currentMembers.push(userId);
    await study.save();

    res.json({ message: '스터디에 성공적으로 참여했습니다.' });
  } catch (error) {
    console.error('스터디 참가 오류:', error);
    res.status(500).json({ message: '스터디 참가 중 오류가 발생했습니다.' });
  }
});

// 공지사항 목록 조회
app.get('/api/notices', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const notices = await Notice.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Notice.countDocuments(query);

    res.json(notices);
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error);
    res.status(500).json({ message: '공지사항 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 공지사항 작성 (관리자만)
app.post('/api/notices', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, category, isPinned } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ message: '제목, 내용, 카테고리는 필수입니다.' });
    }
    
    const notice = new Notice({
      title,
      content,
      category,
      isPinned: isPinned || false,
      author: req.session.user.id
    });
    
    await notice.save();
    
    res.json({ success: true, notice });
  } catch (error) {
    console.error('공지사항 작성 오류:', error);
    res.status(500).json({ message: '공지사항 작성 중 오류가 발생했습니다.' });
  }
});

// 공지사항 수정 (관리자만)
app.put('/api/notices/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, category, isPinned } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ message: '제목, 내용, 카테고리는 필수입니다.' });
    }
    
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        category,
        isPinned: isPinned || false,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('author', 'name');
    
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, notice });
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    res.status(500).json({ message: '공지사항 수정 중 오류가 발생했습니다.' });
  }
});

// 공지사항 삭제 (관리자만)
app.delete('/api/notices/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({ message: '공지사항 삭제 중 오류가 발생했습니다.' });
  }
});

// 공지사항 고정/해제 (관리자만)
app.patch('/api/notices/:id/pin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { isPinned } = req.body;
    
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { isPinned: isPinned },
      { new: true }
    ).populate('author', 'name');
    
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, notice });
  } catch (error) {
    console.error('공지사항 고정 설정 오류:', error);
    res.status(500).json({ message: '공지사항 고정 설정 중 오류가 발생했습니다.' });
  }
});

// 공지사항 상세 조회
app.get('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('author', 'name');
    
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }
    
    res.json(notice);
  } catch (error) {
    console.error('공지사항 상세 조회 오류:', error);
    res.status(500).json({ message: '공지사항 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 커뮤니티 게시글 목록 조회
app.get('/api/community/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await CommunityPost.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await CommunityPost.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('커뮤니티 게시글 목록 조회 오류:', error);
    res.status(500).json({ message: '커뮤니티 게시글 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 커뮤니티 게시글 상세 조회
app.get('/api/community/posts/:id', async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('author', 'name');
    
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('커뮤니티 게시글 상세 조회 오류:', error);
    res.status(500).json({ message: '게시글 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 커뮤니티 게시글 작성
app.post('/api/community/posts', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const postData = {
      ...req.body,
      author: userId
    };

    const post = new CommunityPost(postData);
    await post.save();

    res.status(201).json({ 
      message: '게시글이 성공적으로 작성되었습니다.',
      postId: post._id
    });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ message: '게시글 작성 중 오류가 발생했습니다.' });
  }
});

// 모임 탈퇴
app.post('/api/studies/:id/leave', isAuthenticated, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    const userId = req.session.user.id;

    if (!study) {
      return res.status(404).json({ message: '모임을 찾을 수 없습니다.' });
    }

    const isMember = study.currentMembers.some(memberId => memberId.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ message: '참가하지 않은 모임입니다.' });
    }
    
    console.log('탈퇴 요청 - 사용자 ID:', userId);
    console.log('리더 ID:', study.leader.toString());
    console.log('현재 멤버들:', study.currentMembers.map(m => m.toString()));

    if (study.leader.toString() === userId) {
      return res.status(400).json({ message: '모임 리더는 탈퇴할 수 없습니다.' });
    }

    study.currentMembers = study.currentMembers.filter(memberId => memberId.toString() !== userId.toString());
    await study.save();
    
    console.log('탈퇴 후 멤버들:', study.currentMembers.map(m => m.toString()));

    res.json({ message: '모임에서 성공적으로 탈퇴했습니다.' });
  } catch (error) {
    console.error('모임 탈퇴 오류:', error);
    res.status(500).json({ message: '모임 탈퇴 중 오류가 발생했습니다.' });
  }
});

// 모임 삭제
app.delete('/api/studies/:id', isAuthenticated, async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    const userId = req.session.user.id;

    console.log('모임 삭제 요청 - 모임 ID:', req.params.id);
    console.log('모임 삭제 요청 - 사용자 ID:', userId);
    console.log('모임 삭제 요청 - 모임 리더 ID:', study?.leader);
    console.log('리더 ID 타입:', typeof study?.leader);
    console.log('사용자 ID 타입:', typeof userId);
    console.log('리더 toString():', study?.leader?.toString());
    console.log('비교 결과 (===):', study?.leader?.toString() === userId);

    if (!study) {
      return res.status(404).json({ message: '모임을 찾을 수 없습니다.' });
    }

    // ObjectId와 문자열 비교를 위해 toString() 사용
    if (study.leader.toString() !== userId.toString()) {
      console.log('권한 없음 - 리더가 아님');
      return res.status(403).json({ message: '모임 리더만 삭제할 수 있습니다.' });
    }

    await Study.findByIdAndDelete(req.params.id);
    console.log('모임 삭제 성공');
    res.json({ message: '모임이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('모임 삭제 오류:', error);
    res.status(500).json({ message: '모임 삭제 중 오류가 발생했습니다.' });
  }
});

// 커뮤니티 게시글 수정
app.put('/api/community/posts/:id', isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const { title, content, category } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ message: '제목, 내용, 카테고리는 필수입니다.' });
    }
    
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    
    // 작성자 또는 관리자만 수정 가능
    if (post.author.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: '게시글 수정 권한이 없습니다.' });
    }
    
    post.title = title;
    post.content = content;
    post.category = category;
    post.updatedAt = new Date();
    
    await post.save();
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('커뮤니티 게시글 수정 오류:', error);
    res.status(500).json({ message: '게시글 수정 중 오류가 발생했습니다.' });
  }
});

// 커뮤니티 게시글 삭제
app.delete('/api/community/posts/:id', isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.user.id;

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 작성자 또는 관리자만 삭제 가능
    if (post.author.toString() !== userId && req.session.user.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    // 관련 댓글도 함께 삭제
    await Comment.deleteMany({ post: postId });
    await CommunityPost.findByIdAndDelete(postId);

    res.json({ message: '게시글이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ message: '게시글 삭제 중 오류가 발생했습니다.' });
  }
});

// 댓글 목록 조회
app.get('/api/community/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    
    const comments = await Comment.find({ post: postId })
      .populate('author', 'name username')
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({ message: '댓글 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 댓글 작성
app.post('/api/community/posts/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.user.id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
    }

    // 게시글 존재 확인
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const comment = new Comment({
      content: content.trim(),
      author: userId,
      post: postId
    });

    await comment.save();
    
    // 작성자 정보와 함께 반환
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name username');

    res.status(201).json({ 
      message: '댓글이 성공적으로 작성되었습니다.',
      comment: populatedComment
    });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ message: '댓글 작성 중 오류가 발생했습니다.' });
  }
});

// 댓글 삭제
app.delete('/api/community/comments/:id', isAuthenticated, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.session.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }

    // 작성자 또는 관리자만 삭제 가능
    if (comment.author.toString() !== userId && req.session.user.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ message: '댓글이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ message: '댓글 삭제 중 오류가 발생했습니다.' });
  }
});

// 보안 질문 확인 API
app.post('/api/check-security-question', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: '아이디를 입력해주세요.' 
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '존재하지 않는 사용자입니다.' 
      });
    }

    if (!user.securityQuestion || !user.securityAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: '보안 질문이 설정되지 않았습니다. 관리자에게 문의하세요.' 
      });
    }

    res.json({ 
      success: true, 
      securityQuestion: user.securityQuestion 
    });
  } catch (error) {
    console.error('보안 질문 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 보안 답변 확인 API
app.post('/api/verify-security-answer', async (req, res) => {
  try {
    const { username, answer } = req.body;

    if (!username || !answer) {
      return res.status(400).json({ 
        success: false, 
        message: '아이디와 답변을 모두 입력해주세요.' 
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '존재하지 않는 사용자입니다.' 
      });
    }

    // 답변 비교 (대소문자 구분 없이, 공백 제거)
    const normalizedUserAnswer = user.securityAnswer.toLowerCase().replace(/\s+/g, '');
    const normalizedInputAnswer = answer.toLowerCase().replace(/\s+/g, '');

    if (normalizedUserAnswer !== normalizedInputAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: '보안 답변이 일치하지 않습니다.' 
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('보안 답변 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 인기 모임 조회 (TOP 3)
app.get('/api/popular-studies', async (req, res) => {
  try {
    const popularStudies = await Study.find({ status: 'recruiting' })
      .populate('leader', 'name')
      .sort({ views: -1, createdAt: -1 }) // 조회수 내림차순, 최신순
      .limit(3)
      .exec();

    res.json(popularStudies);
  } catch (error) {
    console.error('인기 모임 조회 오류:', error);
    res.status(500).json({ message: '인기 모임 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 비밀번호 재설정 API
app.post('/api/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '아이디와 새 비밀번호를 모두 입력해주세요.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '비밀번호는 6자 이상이어야 합니다.' 
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '존재하지 않는 사용자입니다.' 
      });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: '비밀번호가 성공적으로 변경되었습니다.' 
    });
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 채팅 메시지 조회 API
app.get('/api/studies/:studyId/messages', isAuthenticated, async (req, res) => {
  try {
    const { studyId } = req.params;
    const userId = req.session.user.id;
    const { page = 1, limit = 50 } = req.query;

    // 모임 참가자 확인
    const study = await Study.findById(studyId);
    if (!study) {
      return res.status(404).json({ message: '모임을 찾을 수 없습니다.' });
    }

    const isLeader = study.leader.toString() === userId.toString();
    const isMember = study.currentMembers.includes(userId);
    
    if (!isLeader && !isMember) {
      return res.status(403).json({ message: '채팅방 접근 권한이 없습니다.' });
    }

    // 메시지 조회
    const messages = await ChatMessage.find({ studyId })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('채팅 메시지 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '메시지 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 정적 파일 서빙 (API 라우팅 후에 배치)
app.use(express.static(__dirname));

// Socket.IO 설정
const server = http.createServer(app);

// Socket.IO 초기화
let io;
try {
  const socketIo = require('socket.io');
  io = new socketIo.Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  console.log('Socket.IO 서버가 초기화되었습니다.');
} catch (error) {
  console.log('Socket.IO를 찾을 수 없습니다. 채팅 기능이 비활성화됩니다.');
  console.log('npm install socket.io 명령어로 Socket.IO를 설치해주세요.');
  io = null;
}

// Socket.IO 연결 처리 (io가 있는 경우에만)
if (io) {
  io.on('connection', (socket) => {
  console.log('사용자 연결:', socket.id);

  // 채팅방 입장
  socket.on('join-chat', async (data) => {
    const { studyId, userId } = data;
    
    try {
      // 모임 참가자 확인
      const study = await Study.findById(studyId);
      if (!study) {
        socket.emit('error', { message: '모임을 찾을 수 없습니다.' });
        return;
      }

      const isLeader = study.leader.toString() === userId.toString();
      const isMember = study.currentMembers.includes(userId);
      
      if (!isLeader && !isMember) {
        socket.emit('error', { message: '채팅방 접근 권한이 없습니다.' });
        return;
      }

      socket.join(`study-${studyId}`);
      socket.userId = userId;
      socket.studyId = studyId;
      
      // 최근 메시지 전송
      const messages = await ChatMessage.find({ studyId })
        .populate('sender', 'name')
        .sort({ createdAt: -1 })
        .limit(50);
      
      socket.emit('chat-history', messages.reverse());
      
    } catch (error) {
      console.error('채팅방 입장 오류:', error);
      socket.emit('error', { message: '채팅방 입장 중 오류가 발생했습니다.' });
    }
  });

  // 메시지 전송
  socket.on('send-message', async (data) => {
    const { message } = data;
    const { userId, studyId } = socket;

    if (!userId || !studyId) {
      socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
      return;
    }

    try {
      // 메시지 저장
      const chatMessage = new ChatMessage({
        studyId,
        sender: userId,
        message: message.trim(),
        messageType: 'text'
      });

      await chatMessage.save();
      await chatMessage.populate('sender', 'name');

      // 채팅방의 모든 사용자에게 메시지 전송
      io.to(`study-${studyId}`).emit('new-message', chatMessage);

    } catch (error) {
      console.error('메시지 전송 오류:', error);
      socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id);
  });
  });
}

// 서버 시작
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
