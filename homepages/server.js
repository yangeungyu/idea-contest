require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const MongoDBStore = require('connect-mongodb-session')(session);

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 5초 타임아웃
  connectTimeoutMS: 10000, // 10초 연결 타임아웃
})
.then(() => {
  console.log('MongoDB에 성공적으로 연결되었습니다.');
})
.catch((error) => {
  console.error('MongoDB 연결 오류:', error.message);
  console.log('MongoDB 연결에 실패했지만 서버는 계속 실행됩니다.');
  console.log('로컬 개발을 위해 MongoDB Atlas 사용을 권장합니다.');
});

// MongoDB 스토어 설정 (MongoDB 연결 실패 시 메모리 스토어 사용)
let store;
try {
  store = new MongoDBStore({
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy',
    collection: 'sessions'
  });
  
  store.on('error', function(error) {
    console.log('MongoDB 세션 스토어 오류:', error.message);
  });
} catch (error) {
  console.log('MongoDB 스토어 생성 실패, 메모리 스토어를 사용합니다.');
  store = null; // 메모리 스토어 사용
}

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
  duration: { type: Number, required: true, min: 1, max: 52 }, // 주 단위
  meetingType: { type: String, enum: ['online', 'offline', 'both'], required: true },
  location: String,
  tags: [String],
  imageUrl: { type: String }, // 이미지 URL 필드 추가
  status: { type: String, enum: ['recruiting', 'in_progress', 'completed'], default: 'recruiting' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
      registrationDate: registrationDate,
      createdAt: registrationDate
    });
    
    await user.save();
    
    // 자동 로그인
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
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

// 프로필 업데이트
app.put('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, currentPassword, newPassword, securityQuestion, securityAnswer } = req.body;
    
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
      registrationDate: user.registrationDate
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

// 스터디 상세 조회
app.get('/api/studies/:id', async (req, res) => {
  try {
    const study = await Study.findById(req.params.id)
      .populate('leader', 'name')
      .populate('currentMembers', 'name');
    
    if (!study) {
      return res.status(404).json({ message: '스터디를 찾을 수 없습니다.' });
    }
    
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

    res.json({
      notices,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error);
    res.status(500).json({ message: '공지사항 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 공지사항 작성
app.post('/api/notices', isAuthenticated, async (req, res) => {
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

    if (!study.currentMembers.includes(userId)) {
      return res.status(400).json({ message: '참가하지 않은 모임입니다.' });
    }

    if (study.leader.toString() === userId) {
      return res.status(400).json({ message: '모임 리더는 탈퇴할 수 없습니다.' });
    }

    study.currentMembers = study.currentMembers.filter(memberId => memberId.toString() !== userId);
    await study.save();

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
    const { title, content, category } = req.body;

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 작성자 또는 관리자만 수정 가능
    if (post.author.toString() !== userId && req.session.user.username !== 'yangeg2004') {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }

    post.title = title;
    post.content = content;
    post.category = category;
    post.updatedAt = new Date();

    await post.save();

    res.json({ 
      message: '게시글이 성공적으로 수정되었습니다.',
      post: post
    });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
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
    if (post.author.toString() !== userId && req.session.user.username !== 'yangeg2004') {
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
    if (comment.author.toString() !== userId && req.session.user.username !== 'yangeg2004') {
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

// 정적 파일 서빙 (API 라우팅 후에 배치)
app.use(express.static(__dirname));

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
