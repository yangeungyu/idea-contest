const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  location: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  registrationDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, immutable: true },
  securityQuestion: { type: String },
  securityAnswer: { type: String }
});

const User = mongoose.model('User', userSchema);

async function updateAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결됨');

    const result = await User.updateOne(
      { username: 'yangeg2004' },
      { $set: { role: 'admin' } }
    );

    console.log('업데이트 결과:', result);

    const user = await User.findOne({ username: 'yangeg2004' });
    console.log('업데이트된 사용자:', user);

    await mongoose.disconnect();
    console.log('완료');
  } catch (error) {
    console.error('오류:', error);
  }
}

updateAdminRole();
