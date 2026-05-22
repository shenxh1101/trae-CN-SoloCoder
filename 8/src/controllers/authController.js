const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const config = require('../config');

async function register(req, res) {
  try {
    const { username, password, nickname } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const user = new User({
      username,
      password,
      nickname: nickname || username
    });
    
    await user.save();
    
    const token = generateToken(user);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    user.status = 'online';
    user.lastActive = new Date();
    await user.save();
    
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function loginAsAdmin(req, res) {
  try {
    const { username, password } = req.body;
    
    if (username === config.admin.username && password === config.admin.password) {
      let adminUser = await User.findOne({ username: config.admin.username });
      
      if (!adminUser) {
        adminUser = new User({
          username: config.admin.username,
          password: config.admin.password,
          nickname: 'Administrator',
          isAdmin: true
        });
        await adminUser.save();
      } else {
        adminUser.status = 'online';
        adminUser.lastActive = new Date();
        await adminUser.save();
      }
      
      const token = generateToken(adminUser);
      
      return res.json({
        message: 'Admin login successful',
        token,
        user: adminUser.toJSON()
      });
    }
    
    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      status: 'offline',
      lastActive: new Date()
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  loginAsAdmin,
  getCurrentUser,
  logout
};
