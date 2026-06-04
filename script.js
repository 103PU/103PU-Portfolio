const revealNodes = document.querySelectorAll(".service-card, .timeline-item, .stat-card, .project-card, .testimonial-card, .blog-card, .idea-shell");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
revealNodes.forEach((node) => {
  node.classList.add("reveal-on-scroll");
  observer.observe(node);
});
