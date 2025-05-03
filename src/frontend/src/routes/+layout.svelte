<script>
  import "../app.css";
  import Navbar from "$lib/components/Navbar.svelte";
</script>

<div class="app">
  <Navbar />

  <main>
    <slot />
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-section">
          <h3>Kaniya Dairy</h3>
          <p>Fresh dairy products delivered daily</p>
          <p>Suhagi, Jabalpur</p>
        </div>

        <div class="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/subscription">Subscribe</a></li>
            <li><a href="/about">About Us</a></li>
          </ul>
        </div>

        <div class="footer-section">
          <h3>Contact Us</h3>
          <p>Phone: 07089345065</p>
          <p>Email: info@kaniyadairy.com</p>
          <p>Address: Suhagi, Behind TI Bunglow, Jabalpur</p>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2023 Kaniya Dairy. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    padding: 1rem;
  }

  .footer {
    background-color: #f8f4e3;
    padding: 3rem 1rem 1rem;
    margin-top: 3rem;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .footer-content {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
  }

  .footer-section {
    flex: 1;
    min-width: 250px;
  }

  .footer-section h3 {
    color: #5eaa6f;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  .footer-section ul {
    list-style: none;
    padding: 0;
  }

  .footer-section li {
    margin-bottom: 0.5rem;
  }

  .footer-section a {
    text-decoration: none;
    color: #333;
  }

  .footer-section a:hover {
    color: #5eaa6f;
  }

  .footer-bottom {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
  }

  @media (max-width: 768px) {
    .footer-content {
      flex-direction: column;
    }
  }
</style>
