import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("userEmail");
    navigate("/");
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Welcome to Dashboard 🎉</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default Dashboard;
