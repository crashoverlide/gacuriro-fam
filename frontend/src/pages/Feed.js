import React, { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import CreatePost from "../components/CreatePost";

function Feed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("/api/posts")
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

  return (
    <div>
      <CreatePost />
      {posts.map(post => <PostCard key={post._id} post={post} />)}
    </div>
  );
}

export default Feed;
