import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
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

  // Math Captcha
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [mathAnswer, setMathAnswer] = useState("");

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
    setMathAnswer("");
  };

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

  // OTP Auto Focus
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
      return setError("Complete Google captcha");

    if (parseInt(mathAnswer) !== num1 + num2) {
      generateCaptcha();
      return setError("Wrong math captcha");
    }

    if (cooldown > 0) return;

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/login/send-otp",
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
  // VERIFY LOGIN
  //////////////////////////////////////////////////////
  const verifyLogin = async () => {
    setError("");

    const otp = otpArray.join("");

    if (!otp || !password)
      return setError("Enter OTP and password");

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/login/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, password })
        }
      );

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        localStorage.setItem("token", data.token);
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
      
      <h2>Login</h2>

      {/* Small Dark Mode Button */}
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

          <p>Solve: {num1} + {num2} =</p>

          <input
            placeholder="Enter Answer"
            value={mathAnswer}
            onChange={(e) => setMathAnswer(e.target.value)}
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

          {/* Password with Eye Icon */}
          <div style={{ position: "relative", marginTop: "15px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
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
            onClick={verifyLogin}
          >
            Verify & Login
          </button>

        </div>
      )}

      <div className="link" onClick={() => navigate("/signup")}>
        New user? Create account
      </div>

    </div>
  );
}

export default Login;
