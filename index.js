require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const session = require("express-session");

const app = express();

// ======================
// CONFIG
// ======================
const CLIENT_ID = process.env.CLIENT_ID;         // set in Render env
const CLIENT_SECRET = process.env.CLIENT_SECRET; // set in Render env
const REDIRECT_URI = process.env.REDIRECT_URI || "https://biblebot-guon.onrender.com/callback"; // updated domain
const PORT = process.env.PORT || 3000;

// ======================
// EXPRESS SETUP
// ======================
app.use(express.static(path.join(__dirname, "public"))); // serve files from public folder
app.use(session({
  secret: "discord_oauth_secret_key",
  resave: false,
  saveUninitialized: false
}));

// ======================
// ROUTES
// ======================

// Serve front-end
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Discord login redirect
app.get("/login", (req, res) => {
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=gdm.join`;
  res.redirect(oauthUrl);
});

// OAuth2 callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  try {
    // Exchange code for access token (remove scope here!)
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Save user to session
    req.session.user = userResponse.data;

    // Redirect to dashboard
    res.redirect("/dashboard");

  } catch (err) {
    console.error("Discord OAuth error:", err.response?.data || err.message);
    res.send("Error during Discord login");
  }
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  res.send(`
    <h1>Welcome, ${req.session.user.username}</h1>
    <p>You are logged in! Now you can manage or invite your bots.</p>
    <p><a href="/">Back to Home</a></p>
  `);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Endpoint for front-end to check session
app.get("/session", (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.session.user });
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
