const EXAMPLES = {
    landing: `
<div class="hero">
    <h1>Welcome to Web2Roblox</h1>
    <p>Convert your web designs into Roblox GUIs instantly.</p>
    <button class="cta-btn">Get Started</button>
</div>
<style>
    .hero {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        height: 100%; background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white; text-align: center; padding: 20px; border-radius: 12px;
    }
    .hero h1 { font-size: 32px; margin-bottom: 10px; }
    .hero p { font-size: 16px; opacity: 0.9; margin-bottom: 20px; }
    .cta-btn {
        padding: 12px 24px; background: white; color: #6366f1;
        border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
    }
</style>`,
    
    card: `
<div class="profile-card">
    <img src="https://via.placeholder.com/80" alt="Avatar" class="avatar">
    <div class="info">
        <h3>Jane Doe</h3>
        <p>Roblox Developer</p>
    </div>
    <button class="follow-btn">Follow</button>
</div>
<style>
    .profile-card {
        display: flex; align-items: center; gap: 15px;
        background: #25252d; padding: 15px; border-radius: 12px;
        border: 1px solid #3a3a45; width: 300px;
    }
    .avatar { width: 60px; height: 60px; border-radius: 50%; }
    .info { flex: 1; }
    .info h3 { color: #e4e4e7; margin: 0; font-size: 16px; }
    .info p { color: #a1a1aa; margin: 4px 0 0; font-size: 13px; }
    .follow-btn {
        padding: 8px 16px; background: #6366f1; color: white;
        border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
    }
</style>`,

    nav: `
<nav class="navbar">
    <div class="logo">MyApp</div>
    <ul class="nav-links">
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Contact</a></li>
    </ul>
    <button class="login-btn">Login</button>
</nav>
<style>
    .navbar {
        display: flex; align-items: center; justify-content: space-between;
        background: #1e1e24; padding: 0 20px; height: 60px; border-bottom: 1px solid #3a3a45;
    }
    .logo { font-size: 20px; font-weight: bold; color: #6366f1; }
    .nav-links { display: flex; list-style: none; gap: 20px; margin: 0; padding: 0; }
    .nav-links a { color: #a1a1aa; text-decoration: none; font-size: 14px; }
    .nav-links a:hover { color: #e4e4e7; }
    .login-btn {
        padding: 8px 16px; background: transparent; border: 1px solid #6366f1;
        color: #6366f1; border-radius: 6px; cursor: pointer;
    }
</style>`
};