<script lang="ts">
</script>

<svelte:head>
  <title>About Us - Kaniya Dairy</title>
</svelte:head>

<div class="about-page">
  <div class="banner">
    <div class="container">
      <h1>About Kaniya Dairy</h1>
      <p>Delivering fresh dairy products since 2003</p>
    </div>
  </div>

  <div class="container">
    <section class="about-section">
      <div class="about-content">
        <h2>Our Story</h2>
        <p>
          Kaniya Dairy has been serving the Suhagi, Jabalpur area for over 20
          years. What started as a small family business has grown into a
          trusted local dairy supplier, known for our commitment to quality and
          freshness.
        </p>
        <p>
          We believe in providing our customers with the purest dairy products,
          sourced directly from local farms and delivered fresh to your doorstep
          every day.
        </p>
      </div>
      <div class="about-image">
        <div class="placeholder-image">Image</div>
      </div>
    </section>

    <section class="mission-section">
      <h2>Our Mission</h2>
      <div class="mission-cards">
        <div class="mission-card">
          <div class="icon">🌱</div>
          <h3>Fresh & Pure</h3>
          <p>
            We're committed to providing the freshest dairy products with no
            preservatives or additives.
          </p>
        </div>
        <div class="mission-card">
          <div class="icon">🐄</div>
          <h3>Locally Sourced</h3>
          <p>
            All our milk comes from well-cared-for cows at local farms within
            30km of Jabalpur.
          </p>
        </div>
        <div class="mission-card">
          <div class="icon">♻️</div>
          <h3>Sustainable Practices</h3>
          <p>
            We use eco-friendly packaging and implement sustainable farming
            practices.
          </p>
        </div>
      </div>
    </section>

    <section class="team-section">
      <h2>Meet Our Team</h2>
      <div class="team-members">
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">Photo</div>
          </div>
          <h3>Vishnu Vishwakarma</h3>
          <p class="member-title">Founder & CEO</p>
          <p class="member-bio">
            Started Kaniya Dairy with a passion for bringing fresh dairy
            products to the community.
          </p>
        </div>
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">Photo</div>
          </div>
          <h3>Ramesh Kumar</h3>
          <p class="member-title">Production Manager</p>
          <p class="member-bio">
            Oversees our production processes to ensure the highest quality
            standards.
          </p>
        </div>
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">Photo</div>
          </div>
          <h3>Sunita Patel</h3>
          <p class="member-title">Delivery Coordinator</p>
          <p class="member-bio">
            Ensures timely and efficient delivery of our products to all
            customers.
          </p>
        </div>
      </div>
    </section>

    <section class="testimonials-section">
      <h2>What Our Customers Say</h2>
      <div class="testimonials">
        <div class="testimonial">
          <div class="quote">
            "I've been buying milk from Kaniya Dairy for over 10 years. Nothing
            compares to their freshness and taste!"
          </div>
          <div class="author">- Ravi Sharma, Suhagi</div>
        </div>
        <div class="testimonial">
          <div class="quote">
            "Their paneer is absolutely amazing. My family loves it and we order
            it every week."
          </div>
          <div class="author">- Priya Tiwari, Jabalpur</div>
        </div>
        <div class="testimonial">
          <div class="quote">
            "The subscription service makes my life so much easier. Fresh milk
            delivered daily without having to remember to order."
          </div>
          <div class="author">- Amit Patel, Suhagi</div>
        </div>
      </div>
    </section>

    <section class="contact-section">
      <h2>Contact Us</h2>
      <div class="contact-details">
        <div class="contact-info">
          <h3>Visit Our Shop</h3>
          <p>Kaniya Dairy Shop</p>
          <p>Behind TI Bunglow</p>
          <p>Suhagi, Jabalpur</p>
          <p>Madhya Pradesh, 482001</p>
          <p class="contact-phone">Phone: 07089345065</p>
          <p>Email: info@kaniyadairy.com</p>
          <p>Hours: 6:00 AM - 8:00 PM (Daily)</p>
        </div>
        <div class="contact-map">
          <div class="placeholder-map">Map Location</div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .about-page {
    padding-bottom: 3rem;
  }

  .banner {
    background-color: #f8f4e3;
    padding: 5rem 1rem;
    margin-bottom: 3rem;
    text-align: center;
  }

  .banner h1 {
    font-size: 3rem;
    color: #5eaa6f;
    margin-bottom: 1rem;
  }

  .banner p {
    font-size: 1.25rem;
    color: #666;
  }

  section {
    margin-bottom: 5rem;
  }

  h2 {
    font-size: 2.2rem;
    color: #333;
    text-align: center;
    margin-bottom: 2.5rem;
    position: relative;
  }

  h2:after {
    content: "";
    display: block;
    width: 80px;
    height: 3px;
    background-color: #a3d2ca;
    margin: 0.5rem auto;
  }

  .about-section {
    display: flex;
    align-items: center;
    gap: 3rem;
  }

  .about-content {
    flex: 1;
  }

  .about-content h2 {
    text-align: left;
    margin-bottom: 1.5rem;
  }

  .about-content h2:after {
    margin: 0.5rem 0;
  }

  .about-content p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .about-image {
    flex: 1;
  }

  .placeholder-image {
    height: 300px;
    background-color: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 1.5rem;
    border-radius: 8px;
  }

  .mission-cards {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
  }

  .mission-card {
    flex: 1;
    padding: 2rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  .icon {
    font-size: 3.5rem;
    margin-bottom: 1.5rem;
  }

  .mission-card h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #5eaa6f;
  }

  .team-members {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
  }

  .team-member {
    flex: 1;
    text-align: center;
    padding: 1.5rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .member-photo {
    max-width: 200px;
    margin: 0 auto 1.5rem;
  }

  .member-photo .placeholder-image {
    height: 200px;
    border-radius: 50%;
  }

  .team-member h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .member-title {
    font-size: 1.1rem;
    font-weight: 500;
    color: #5eaa6f;
    margin-bottom: 1rem;
  }

  .member-bio {
    font-size: 0.95rem;
    color: #666;
  }

  .testimonials {
    display: flex;
    gap: 2rem;
  }

  .testimonial {
    flex: 1;
    padding: 2rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
  }

  .testimonial:before {
    content: '"';
    position: absolute;
    top: 10px;
    left: 15px;
    font-size: 4rem;
    color: #f8f4e3;
    z-index: 0;
  }

  .quote {
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    position: relative;
    z-index: 1;
  }

  .author {
    font-weight: 500;
    text-align: right;
    color: #5eaa6f;
  }

  .contact-details {
    display: flex;
    gap: 3rem;
  }

  .contact-info {
    flex: 1;
  }

  .contact-info h3 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #333;
  }

  .contact-info p {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  .contact-phone {
    margin-top: 1.5rem;
  }

  .contact-map {
    flex: 1.5;
  }

  .placeholder-map {
    height: 400px;
    background-color: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 1.5rem;
    border-radius: 8px;
  }

  @media (max-width: 992px) {
    .about-section {
      flex-direction: column;
    }

    .mission-cards,
    .team-members,
    .testimonials,
    .contact-details {
      flex-direction: column;
    }

    .mission-card,
    .team-member,
    .testimonial,
    .contact-info,
    .contact-map {
      width: 100%;
    }

    .placeholder-image,
    .placeholder-map {
      height: 250px;
    }
  }
</style>
