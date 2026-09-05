import React, { useState } from "react";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();
    setResults(data);
  };

  return (
    <div className="search">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users or hashtags" />
      <button onClick={handleSearch}>Search</button>
      <ul>
        {results.map(r => <li key={r._id}>{r.username || r.tag}</li>)}
      </ul>
    </div>
  );
}

export default Search;
