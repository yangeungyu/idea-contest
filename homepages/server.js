require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const path = require('path');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// MongoDB 스토어 설정
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hongcheon-academy',
  collection: 'sessions'
});

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1일
    httpOnly: true,
    secure: false // 개발환경에서는 false
  }
}));

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 사용자 모델
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nickname: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
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

const User = mongoose.model('User', userSchema);
const Study = mongoose.model('Study', studySchema);
const Notice = mongoose.model('Notice', noticeSchema);
const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

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

// 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
      nickname: user.nickname
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
    const { username, password, nickname } = req.body;
    
    // 유효성 검사
    if (!username || !password || !nickname) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }
    
    // 중복 사용자 확인
    const existingUser = await User.findOne({ $or: [{ username }, { nickname }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.username === username ? '이미 사용 중인 아이디입니다.' : '이미 사용 중인 닉네임입니다.'
      });
    }
    
    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 사용자 생성
    const user = new User({
      username,
      password: hashedPassword,
      nickname
    });
    
    await user.save();
    
    // 자동 로그인
    req.session.user = {
      id: user._id,
      username: user.username,
      nickname: user.nickname
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

// 스터디 생성
app.post('/api/studies', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const studyData = {
      ...req.body,
      leader: userId,
      currentMembers: [userId],
      deadline: new Date(req.body.deadline),
      startDate: new Date(req.body.startDate)
    };

    const study = new Study(studyData);
    await study.save();

    res.status(201).json({ 
      message: '스터디가 성공적으로 생성되었습니다.',
      studyId: study._id
    });
  } catch (error) {
    console.error('스터디 생성 오류:', error);
    res.status(500).json({ message: '스터디 생성 중 오류가 발생했습니다.' });
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
      .populate('leader', 'nickname')
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
      .populate('leader', 'nickname')
      .populate('currentMembers', 'nickname');
    
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
      .populate('author', 'nickname')
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

// 공지사항 상세 조회
app.get('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('author', 'nickname');
    
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
      .populate('author', 'nickname')
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
      .populate('author', 'nickname');
    
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

// 정적 파일 서빙 (API 라우팅 후에 배치)
app.use(express.static(__dirname));

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
