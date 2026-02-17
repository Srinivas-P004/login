import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otpArray, setOtpArray] = useState(new Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [step, setStep] = useState(1);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getStrength = () => {
    if (password.length < 6) return "Weak";
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return "Strong";
    return "Medium";
  };

  // OTP auto focus
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otpArray];
    newOtp[index] = value;
    setOtpArray(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }

    if (!value && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  //////////////////////////////////////////////////////
  // SEND OTP
  //////////////////////////////////////////////////////
  const sendOtp = async () => {
    setError("");

    if (!validateEmail(email))
      return setError("Invalid email format");

    if (!captchaToken)
      return setError("Complete captcha");

    if (cooldown > 0) return;

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/signup/send-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, captchaToken })
        }
      );

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStep(2);
        setCooldown(60);
      } else {
        setError(data.message);
      }

    } catch {
      setLoading(false);
      setError("Server error");
    }
  };

  //////////////////////////////////////////////////////
  // VERIFY SIGNUP
  //////////////////////////////////////////////////////
  const verifySignup = async () => {
    setError("");

    const otp = otpArray.join("");

    if (!otp || !password)
      return setError("Enter OTP and password");

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/signup/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, password })
        }
      );

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        // If backend returns token:
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        navigate("/dashboard");
      } else {
        setError(data.message);
      }

    } catch {
      setLoading(false);
      setError("Server error");
    }
  };

  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////
  return (
    <div className={`card ${darkMode ? "dark" : ""}`}>

      <h2>Create Account</h2>

      <button
        className="dark-toggle"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      {error && <div className="error">{error}</div>}
      {loading && <div className="spinner"></div>}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="slide active">

          <input
            type="email"
            placeholder="Enter Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <ReCAPTCHA
            sitekey="6Le56G0sAAAAACbHhXzyin9gnrY4NfpUvBMeHCvU"
            onChange={(token) => setCaptchaToken(token)}
          />

          <button
            disabled={cooldown > 0}
            onClick={sendOtp}
          >
            {cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : "Send OTP"}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="slide active">

          <h4>Enter OTP</h4>

          <div className="otp-container">
            {otpArray.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                maxLength="1"
                className="otp-box"
                value={digit}
                onChange={(e) =>
                  handleOtpChange(e.target.value, index)
                }
              />
            ))}
          </div>

          <div style={{ position: "relative", marginTop: "15px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555"
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <small className={`strength-${getStrength()}`}>
            Strength: {getStrength()}
          </small>

          <button
            style={{ marginTop: "15px" }}
            onClick={verifySignup}
          >
            Verify & Signup
          </button>
        </div>
      )}

      <div className="link" onClick={() => navigate("/")}>
        Already have account? Login
      </div>

    </div>
  );
}

export default Signup;
