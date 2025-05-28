<script lang="ts">
  import { isEnglish } from "$lib/stores/languageStore";
</script>

<svelte:head>
  <title>{$isEnglish ? "About Us" : "हमारे बारे में"} - Kanhiya Dairy</title>
</svelte:head>

<div class="about-page">
  <div class="banner">
    <div class="container">
      <h1>{$isEnglish ? "About Kanhiya Dairy" : "कानिया डेयरी के बारे में"}</h1>
      <p>
        {$isEnglish
          ? "Delivering fresh dairy products since 2010"
          : "२०१० से ताजा डेयरी उत्पाद वितरित कर रहे हैं"}
      </p>
    </div>
  </div>

  <div class="container">
    <section class="about-section">
      <div class="about-content">
        <h2>{$isEnglish ? "Our Story" : "हमारी कहानी"}</h2>
        {#if $isEnglish}
          <p>
            Kanhiya Dairy has been serving the Suhagi, Jabalpur area for over 15
            years. What started as a small family business has grown into a
            trusted local dairy supplier, known for our commitment to quality
            and freshness.
          </p>
          <p>
            We believe in providing our customers with the purest dairy
            products, sourced directly from local farms and delivered fresh to
            your doorstep every day.
          </p>
        {:else}
          <p>
            कानिया डेयरी १५ वर्षों से अधिक समय से सुहागी, जबलपुर क्षेत्र में
            सेवा प्रदान कर रही है। एक छोटे पारिवारिक व्यवसाय के रूप में जो शुरू
            हुआ वह गुणवत्ता और ताजगी के प्रति हमारी प्रतिबद्धता के लिए जाने जाने
            वाले एक विश्वसनीय स्थानीय डेयरी आपूर्तिकर्ता के रूप में विकसित हुआ
            है।
          </p>
          <p>
            हम अपने ग्राहकों को शुद्धतम डेयरी उत्पाद प्रदान करने में विश्वास
            करते हैं, जो सीधे स्थानीय खेतों से प्राप्त होते हैं और हर दिन आपके
            दरवाजे पर ताजा पहुंचाए जाते हैं।
          </p>
        {/if}
      </div>
      <div class="about-image">
        <div class="placeholder-image">{$isEnglish ? "Image" : "छवि"}</div>
      </div>
    </section>

    <section class="mission-section">
      <h2>{$isEnglish ? "Our Mission" : "हमारा मिशन"}</h2>
      <div class="mission-cards">
        <div class="mission-card">
          <div class="icon">🌱</div>
          <h3>{$isEnglish ? "Fresh & Pure" : "ताजा और शुद्ध"}</h3>
          {#if $isEnglish}
            <p>
              We're committed to providing the freshest dairy products with no
              preservatives or additives.
            </p>
          {:else}
            <p>
              हम बिना किसी संरक्षक या योजक के सबसे ताज़ी डेयरी उत्पाद प्रदान
              करने के लिए प्रतिबद्ध हैं।
            </p>
          {/if}
        </div>
        <div class="mission-card">
          <div class="icon">🐄</div>
          <h3>{$isEnglish ? "Locally Sourced" : "स्थानीय रूप से प्राप्त"}</h3>
          {#if $isEnglish}
            <p>
              All our milk comes from well-cared-for cows at local farms within
              30km of Jabalpur.
            </p>
          {:else}
            <p>
              हमारा सारा दूध जबलपुर के ३० किलोमीटर के दायरे में स्थित स्थानीय
              खेतों में अच्छी तरह से देखभाल की जाने वाली गायों से आता है।
            </p>
          {/if}
        </div>
        <div class="mission-card">
          <div class="icon">♻️</div>
          <h3>{$isEnglish ? "Sustainable Practices" : "सतत अभ्यास"}</h3>
          {#if $isEnglish}
            <p>
              We use eco-friendly packaging and implement sustainable farming
              practices.
            </p>
          {:else}
            <p>
              हम पर्यावरण के अनुकूल पैकेजिंग का उपयोग करते हैं और टिकाऊ कृषि
              पद्धतियों को लागू करते हैं।
            </p>
          {/if}
        </div>
      </div>
    </section>

    <section class="team-section">
      <h2>{$isEnglish ? "Meet Our Team" : "हमारी टीम से मिलें"}</h2>
      <div class="team-members">
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">
              {$isEnglish ? "Photo" : "तस्वीर"}
            </div>
          </div>
          <h3>{$isEnglish ? "Patel Sir" : "पटेल सर"}</h3>
          <p class="member-title">
            {$isEnglish ? "Founder & CEO" : "संस्थापक और सीईओ"}
          </p>
          {#if $isEnglish}
            <p class="member-bio">
              Started Kanhiya Dairy with a vision to provide pure and fresh
              dairy products to the community.
            </p>
          {:else}
            <p class="member-bio">
              समुदाय को शुद्ध और ताज़ा डेयरी उत्पाद प्रदान करने की दृष्टि से
              कानिया डेयरी शुरू की।
            </p>
          {/if}
        </div>
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">
              {$isEnglish ? "Photo" : "तस्वीर"}
            </div>
          </div>
          <h3>{$isEnglish ? "Vishnu Vishwakarma" : "विष्णु विश्वकर्मा"}</h3>
          <p class="member-title">
            {$isEnglish ? "Software Engineer" : "सॉफ्टवेयर इंजीनियर"}
          </p>
          {#if $isEnglish}
            <p class="member-bio">
              Developed the Kanhiya Dairy app to make ordering dairy products
              more convenient.
            </p>
          {:else}
            <p class="member-bio">
              डेयरी उत्पादों को ऑर्डर करना अधिक सुविधाजनक बनाने के लिए कानिया
              डेयरी ऐप विकसित किया।
            </p>
          {/if}
        </div>
        <div class="team-member">
          <div class="member-photo">
            <div class="placeholder-image">
              {$isEnglish ? "Photo" : "तस्वीर"}
            </div>
          </div>
          <h3>{$isEnglish ? "Sunita Patel" : "सुनीता पटेल"}</h3>
          <p class="member-title">
            {$isEnglish ? "Delivery Coordinator" : "वितरण समन्वयक"}
          </p>
          {#if $isEnglish}
            <p class="member-bio">
              Ensures timely and efficient delivery of our products to all
              customers.
            </p>
          {:else}
            <p class="member-bio">
              सभी ग्राहकों को हमारे उत्पादों की समय पर और कुशल डिलीवरी सुनिश्चित
              करता है।
            </p>
          {/if}
        </div>
      </div>
    </section>

    <section class="testimonials-section">
      <h2>
        {$isEnglish ? "What Our Customers Say" : "हमारे ग्राहक क्या कहते हैं"}
      </h2>
      <div class="testimonials">
        <div class="testimonial">
          {#if $isEnglish}
            <div class="quote">
              "I've been buying milk from Kanhiya Dairy for over 10 years.
              Nothing compares to their freshness and taste!"
            </div>
            <div class="author">- Ravi Sharma, Suhagi</div>
          {:else}
            <div class="quote">
              "मैं १० से अधिक वर्षों से कानिया डेयरी से दूध खरीद रहा हूँ। उनकी
              ताजगी और स्वाद का कोई मुकाबला नहीं!"
            </div>
            <div class="author">- रवि शर्मा, सुहागी</div>
          {/if}
        </div>
        <div class="testimonial">
          {#if $isEnglish}
            <div class="quote">
              "Their paneer is absolutely amazing. My family loves it and we
              order it every week."
            </div>
            <div class="author">- Priya Tiwari, Jabalpur</div>
          {:else}
            <div class="quote">
              "उनका पनीर बिल्कुल अद्भुत है। मेरा परिवार इसे पसंद करता है और हम
              इसे हर हफ्ते ऑर्डर करते हैं।"
            </div>
            <div class="author">- प्रिया तिवारी, जबलपुर</div>
          {/if}
        </div>
        <div class="testimonial">
          {#if $isEnglish}
            <div class="quote">
              "The subscription service makes my life so much easier. Fresh milk
              delivered daily without having to remember to order."
            </div>
            <div class="author">- Amit Patel, Suhagi</div>
          {:else}
            <div class="quote">
              "सदस्यता सेवा मेरे जीवन को बहुत आसान बनाती है। ऑर्डर करने के लिए
              याद किए बिना प्रतिदिन ताजा दूध पहुंचाया जाता है।"
            </div>
            <div class="author">- अमित पटेल, सुहागी</div>
          {/if}
        </div>
      </div>
    </section>

    <section class="contact-section">
      <h2>{$isEnglish ? "Contact Us" : "हमसे संपर्क करें"}</h2>
      <div class="contact-details">
        <div class="contact-info">
          <h3>{$isEnglish ? "Visit Our Shop" : "हमारी दुकान पर जाएँ"}</h3>
          <p>{$isEnglish ? "Kanhiya Dairy Shop" : "कानिया डेयरी की दुकान"}</p>
          <p>{$isEnglish ? "Behind TI Bunglow" : "टी.आई. बंगले के पीछे"}</p>
          <p>{$isEnglish ? "Suhagi, Jabalpur" : "सुहागी, जबलपुर"}</p>
          <p>{$isEnglish ? "Madhya Pradesh, 482001" : "मध्य प्रदेश, ४८२००१"}</p>
          <p class="contact-phone">
            {$isEnglish ? "Phone: 07089345065" : "फ़ोन: ०७०८९३४५०६५"}
          </p>
          <p>
            {$isEnglish
              ? "Email: info@Kanhiyadairy.com"
              : "ईमेल: info@Kanhiyadairy.com"}
          </p>
          <p>
            {$isEnglish
              ? "Hours: 6:00 AM - 8:00 PM (Daily)"
              : "समय: सुबह ६:०० - रात ८:०० (प्रतिदिन)"}
          </p>
        </div>
        <div class="contact-map">
          <div class="placeholder-map">
            {$isEnglish ? "Map Location" : "मानचित्र स्थान"}
          </div>
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
