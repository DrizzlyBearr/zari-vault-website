/* ===========================
   ZARI VAULT — main.js
      =========================== */

      // --- Scroll-to-top button ---
      const scrollTopBtn = document.getElementById('scroll-top');

      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            scrollTopBtn.classList.add('visible');
              } else {
                  scrollTopBtn.classList.remove('visible');
                    }
                    });

                    scrollTopBtn.addEventListener('click', () => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      });

                      // --- Navbar logo smooth scroll ---
                      const logoLink = document.querySelector('.navbar .logo');
                      if (logoLink) {
                        logoLink.addEventListener('click', (e) => {
                            e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                  });
                                  }

                                  // --- Active nav link highlighting ---
                                  const sections = document.querySelectorAll('section[id]');
                                  const navLinks = document.querySelectorAll('.navbar nav a');

                                  const highlightNav = () => {
                                    let scrollPos = window.scrollY + 80;

                                      sections.forEach((section) => {
                                          const top = section.offsetTop;
                                              const height = section.offsetHeight;
                                                  const id = section.getAttribute('id');

                                                      if (scrollPos >= top && scrollPos < top + height) {
                                                            navLinks.forEach((link) => {
                                                                    link.classList.remove('active');
                                                                            if (link.getAttribute('href') === `#${id}`) {
                                                                                      link.classList.add('active');
                                                                                              }
                                                                                                    });
                                                                                                        }
                                                                                                          });
                                                                                                          };
                                                                                                          
                                                                                                          window.addEventListener('scroll', highlightNav);
                                                                                                          
                                                                                                          // --- Contact form submit handler ---
                                                                                                          const contactForm = document.querySelector('.contact-form');
                                                                                                          if (contactForm) {
                                                                                                            contactForm.addEventListener('submit', (e) => {
                                                                                                                e.preventDefault();
                                                                                                                    const btn = contactForm.querySelector('button[type="submit"]');
                                                                                                                        btn.textContent = 'Message sent!';
                                                                                                                            btn.disabled = true;
                                                                                                                                contactForm.reset();
                                                                                                                                    setTimeout(() => {
                                                                                                                                          btn.textContent = 'Send Message';
                                                                                                                                                btn.disabled = false;
                                                                                                                                                    }, 3000);
                                                                                                                                                      });
                                                                                                                                                      }
