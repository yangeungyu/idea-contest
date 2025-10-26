// 관리자 권한 확인 미들웨어
const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  
  next();
};

module.exports = { isAdmin };
