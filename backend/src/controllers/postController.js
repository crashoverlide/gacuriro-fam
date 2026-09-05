const Post = require("../models/Post");

exports.createPost = async (req, res) => {
  try {
    const { userId, imageUrl, caption } = req.body;
    const post = new Post({ user: userId, imageUrl, caption });
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate("user", "username avatar");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
