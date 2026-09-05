import React, { useState, useEffect } from "react";

function Stories() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/stories")
      .then(res => res.json())
      .then(data => setStories(data));
  }, []);

  return (
    <div className="stories-viewer">
      {stories.map(story => (
        <div key={story._id} className="story-item">
          <img src={story.media} alt="story" />
          <p>{story.user.username}</p>
        </div>
      ))}
    </div>
  );
}

export default Stories;
