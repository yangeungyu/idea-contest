const fs = require('fs');
const path = require('path');

class LocalDataStore {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.ensureDataDirectory();
    
    // 데이터 파일 경로
    this.files = {
      users: path.join(this.dataDir, 'users.json'),
      studies: path.join(this.dataDir, 'studies.json'),
      notices: path.join(this.dataDir, 'notices.json'),
      communityPosts: path.join(this.dataDir, 'communityPosts.json'),
      comments: path.join(this.dataDir, 'comments.json'),
      counters: path.join(this.dataDir, 'counters.json')
    };
    
    // 메모리 캐시
    this.cache = {
      users: [],
      studies: [],
      notices: [],
      communityPosts: [],
      comments: [],
      counters: { users: 0, studies: 0, notices: 0, communityPosts: 0, comments: 0 }
    };
    
    this.loadAllData();
  }
  
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  loadAllData() {
    Object.keys(this.files).forEach(key => {
      try {
        if (fs.existsSync(this.files[key])) {
          const data = fs.readFileSync(this.files[key], 'utf8');
          this.cache[key] = JSON.parse(data);
        }
      } catch (error) {
        console.error(`${key} 데이터 로드 오류:`, error);
        // 기본값 유지
      }
    });
    
    console.log('로컬 데이터 로드 완료');
    console.log('사용자 수:', this.cache.users.length);
    console.log('스터디 수:', this.cache.studies.length);
    console.log('공지사항 수:', this.cache.notices.length);
  }
  
  saveData(type) {
    try {
      const filePath = this.files[type];
      const data = JSON.stringify(this.cache[type], null, 2);
      fs.writeFileSync(filePath, data, 'utf8');
    } catch (error) {
      console.error(`${type} 데이터 저장 오류:`, error);
    }
  }
  
  generateId(type) {
    this.cache.counters[type] = (this.cache.counters[type] || 0) + 1;
    this.saveData('counters');
    return this.cache.counters[type].toString();
  }
  
  // 사용자 관련 메서드
  async createUser(userData) {
    const user = {
      _id: this.generateId('users'),
      ...userData,
      createdAt: new Date(),
      registrationDate: new Date()
    };
    
    this.cache.users.push(user);
    this.saveData('users');
    return user;
  }
  
  async findUser(query) {
    return this.cache.users.find(user => {
      return Object.keys(query).every(key => {
        if (key === '_id') return user._id === query[key];
        return user[key] === query[key];
      });
    });
  }
  
  async findUserById(id) {
    return this.cache.users.find(user => user._id === id);
  }
  
  async updateUser(id, updateData) {
    const userIndex = this.cache.users.findIndex(user => user._id === id);
    if (userIndex !== -1) {
      this.cache.users[userIndex] = { ...this.cache.users[userIndex], ...updateData };
      this.saveData('users');
      return this.cache.users[userIndex];
    }
    return null;
  }
  
  // 스터디 관련 메서드
  async createStudy(studyData) {
    const study = {
      _id: this.generateId('studies'),
      ...studyData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cache.studies.push(study);
    this.saveData('studies');
    return study;
  }
  
  async findStudies(query = {}, options = {}) {
    let results = [...this.cache.studies];
    
    // 필터링
    if (Object.keys(query).length > 0) {
      results = results.filter(study => {
        return Object.keys(query).every(key => {
          if (key === '$or') {
            return query[key].some(condition => 
              Object.keys(condition).every(condKey => {
                if (condKey === 'title' && condition[condKey].$regex) {
                  return study.title.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                if (condKey === 'description' && condition[condKey].$regex) {
                  return study.description.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                if (condKey === 'tags' && condition[condKey].$in) {
                  return study.tags && study.tags.some(tag => 
                    condition[condKey].$in.some(searchTag => 
                      tag.toLowerCase().includes(searchTag.source.toLowerCase())
                    )
                  );
                }
                return study[condKey] === condition[condKey];
              })
            );
          }
          return study[key] === query[key];
        });
      });
    }
    
    // 정렬
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortKey];
      results.sort((a, b) => {
        if (sortOrder === -1) {
          return new Date(b[sortKey]) - new Date(a[sortKey]);
        }
        return new Date(a[sortKey]) - new Date(b[sortKey]);
      });
    }
    
    // 페이지네이션
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async findStudyById(id) {
    return this.cache.studies.find(study => study._id === id);
  }
  
  async updateStudy(id, updateData) {
    const studyIndex = this.cache.studies.findIndex(study => study._id === id);
    if (studyIndex !== -1) {
      this.cache.studies[studyIndex] = { 
        ...this.cache.studies[studyIndex], 
        ...updateData,
        updatedAt: new Date()
      };
      this.saveData('studies');
      return this.cache.studies[studyIndex];
    }
    return null;
  }
  
  async deleteStudy(id) {
    const studyIndex = this.cache.studies.findIndex(study => study._id === id);
    if (studyIndex !== -1) {
      this.cache.studies.splice(studyIndex, 1);
      this.saveData('studies');
      return true;
    }
    return false;
  }
  
  async countStudies(query = {}) {
    const results = await this.findStudies(query);
    return results.length;
  }
  
  // 공지사항 관련 메서드
  async createNotice(noticeData) {
    const notice = {
      _id: this.generateId('notices'),
      ...noticeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cache.notices.push(notice);
    this.saveData('notices');
    return notice;
  }
  
  async findNotices(query = {}, options = {}) {
    let results = [...this.cache.notices];
    
    // 필터링
    if (Object.keys(query).length > 0) {
      results = results.filter(notice => {
        return Object.keys(query).every(key => {
          if (key === '$or') {
            return query[key].some(condition => 
              Object.keys(condition).every(condKey => {
                if (condKey === 'title' && condition[condKey].$regex) {
                  return notice.title.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                if (condKey === 'content' && condition[condKey].$regex) {
                  return notice.content.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                return notice[condKey] === condition[condKey];
              })
            );
          }
          return notice[key] === query[key];
        });
      });
    }
    
    // 정렬
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortKey];
      results.sort((a, b) => {
        if (sortOrder === -1) {
          return new Date(b[sortKey]) - new Date(a[sortKey]);
        }
        return new Date(a[sortKey]) - new Date(b[sortKey]);
      });
    }
    
    // 페이지네이션
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async findNoticeById(id) {
    return this.cache.notices.find(notice => notice._id === id);
  }
  
  async countNotices(query = {}) {
    const results = await this.findNotices(query);
    return results.length;
  }
  
  // 커뮤니티 게시글 관련 메서드
  async createCommunityPost(postData) {
    const post = {
      _id: this.generateId('communityPosts'),
      ...postData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cache.communityPosts.push(post);
    this.saveData('communityPosts');
    return post;
  }
  
  async findCommunityPosts(query = {}, options = {}) {
    let results = [...this.cache.communityPosts];
    
    // 필터링 로직 (공지사항과 동일)
    if (Object.keys(query).length > 0) {
      results = results.filter(post => {
        return Object.keys(query).every(key => {
          if (key === '$or') {
            return query[key].some(condition => 
              Object.keys(condition).every(condKey => {
                if (condKey === 'title' && condition[condKey].$regex) {
                  return post.title.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                if (condKey === 'content' && condition[condKey].$regex) {
                  return post.content.toLowerCase().includes(condition[condKey].$regex.toLowerCase());
                }
                return post[condKey] === condition[condKey];
              })
            );
          }
          return post[key] === query[key];
        });
      });
    }
    
    // 정렬 및 페이지네이션
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortKey];
      results.sort((a, b) => {
        if (sortOrder === -1) {
          return new Date(b[sortKey]) - new Date(a[sortKey]);
        }
        return new Date(a[sortKey]) - new Date(b[sortKey]);
      });
    }
    
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async findCommunityPostById(id) {
    return this.cache.communityPosts.find(post => post._id === id);
  }
  
  async updateCommunityPost(id, updateData) {
    const postIndex = this.cache.communityPosts.findIndex(post => post._id === id);
    if (postIndex !== -1) {
      this.cache.communityPosts[postIndex] = { 
        ...this.cache.communityPosts[postIndex], 
        ...updateData,
        updatedAt: new Date()
      };
      this.saveData('communityPosts');
      return this.cache.communityPosts[postIndex];
    }
    return null;
  }
  
  async deleteCommunityPost(id) {
    const postIndex = this.cache.communityPosts.findIndex(post => post._id === id);
    if (postIndex !== -1) {
      this.cache.communityPosts.splice(postIndex, 1);
      this.saveData('communityPosts');
      return true;
    }
    return false;
  }
  
  async countCommunityPosts(query = {}) {
    const results = await this.findCommunityPosts(query);
    return results.length;
  }
  
  // 댓글 관련 메서드
  async createComment(commentData) {
    const comment = {
      _id: this.generateId('comments'),
      ...commentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.cache.comments.push(comment);
    this.saveData('comments');
    return comment;
  }
  
  async findComments(query = {}, options = {}) {
    let results = [...this.cache.comments];
    
    // 필터링
    if (Object.keys(query).length > 0) {
      results = results.filter(comment => {
        return Object.keys(query).every(key => {
          return comment[key] === query[key];
        });
      });
    }
    
    // 정렬
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortKey];
      results.sort((a, b) => {
        if (sortOrder === 1) {
          return new Date(a[sortKey]) - new Date(b[sortKey]);
        }
        return new Date(b[sortKey]) - new Date(a[sortKey]);
      });
    }
    
    return results;
  }
  
  async findCommentById(id) {
    return this.cache.comments.find(comment => comment._id === id);
  }
  
  async deleteComment(id) {
    const commentIndex = this.cache.comments.findIndex(comment => comment._id === id);
    if (commentIndex !== -1) {
      this.cache.comments.splice(commentIndex, 1);
      this.saveData('comments');
      return true;
    }
    return false;
  }
  
  async deleteCommentsByPost(postId) {
    this.cache.comments = this.cache.comments.filter(comment => comment.post !== postId);
    this.saveData('comments');
  }
}

module.exports = LocalDataStore;
