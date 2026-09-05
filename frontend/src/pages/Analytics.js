import React, { useEffect, useState } from "react";

function Analytics() {
  const [stats, setStats] = useState({ posts: 0, followers: 0, likes: 0 });

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div className="analytics">
      <h2>Creator Analytics</h2>
      <p>Posts: {stats.posts}</p>
      <p>Followers: {stats.followers}</p>
      <p>Likes: {stats.likes}</p>
    </div>
  );
}

export default Analytics;
