import React, { useState } from "react";

function Dashboard() {
  const [input, setInput] = useState("");

  return (
    <div>
      <h2>Dashboard</h2>

      <input
        type="text"
        placeholder="Enter something"
        onChange={(e) => setInput(e.target.value)}
      />

      <h3>Output:</h3>

      {/* Unsafe (XSS vulnerable) */}
      <div dangerouslySetInnerHTML={{ __html: input }} />
    </div>
  );
}

export default Dashboard;
