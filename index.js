require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const session = require("express-session");

const app = express();

// ======================
// CONFIG
// ======================
const CLIENT_ID = "1460964137956933747"; // your client ID
const CLIENT_SECRET = "kgJTJWt45khYI7bIXjNIvVY_IxHx3MBe"; // your secret
const REDIRECT_URI = "https://biblebots-1shb.onrender.com/callback"; // your render URL
const PORT = process.env.PORT || 3000;

// ======================
// EXPRESS SETUP
// ======================
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "discord_oauth_secret_key",
  resave: false,
  saveUninitialized: false
}));

// ======================
// ROUTES
// ======================

// Root page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Login redirect
app.get("/login", (req, res) => {
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(oauthUrl);
});

// OAuth2 callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  try {
    // Exchange code for token
    const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      scope: "identify guilds"
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const accessToken = tokenResponse.data.access_token;

    // Get user info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const guildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Save to session
    req.session.user = userResponse.data;
    req.session.guilds = guildsResponse.data;

    // Redirect to homepage (you can now show bot links)
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Error during Discord login");
  }
});

// Dashboard page after login
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  // You can render a HTML here or just JSON
  res.send(`
    <h1>Welcome, ${req.session.user.username}</h1>
    <p>Your servers:</p>
    <ul>
      ${req.session.guilds.map(g => `<li>${g.name} (ID: ${g.id})</li>`).join("")}
    </ul>
    <p><a href="/">Go back</a></p>
  `);
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
