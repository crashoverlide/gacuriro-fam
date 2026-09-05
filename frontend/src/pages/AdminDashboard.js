import React, { useEffect, useState } from "react";

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, posts: 0, errors: 0 });

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div className="admin-dashboard">
      <h2>System Overview</h2>
      <p>Total Users: {stats.users}</p>
      <p>Total Posts: {stats.posts}</p>
      <p>Error Rate: {stats.errors}%</p>
    </div>
  );
}

export default AdminDashboard;
