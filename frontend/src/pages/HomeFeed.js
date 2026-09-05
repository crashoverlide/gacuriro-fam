import React, { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "../components/PostCard";

export default function HomeFeed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/posts").then((res) => {
      setPosts(res.data);
    });
  }, []);

  return (
    <div className="feed">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
