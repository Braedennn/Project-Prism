/**
 * Prism Launcher — Animation Engine
 * Controls all animations, transitions, and visual effects.
 */

const AnimationEngine = (() => {
  let animationsEnabled = true;

  /**
   * Enable or disable all animations
   */
  function setEnabled(enabled) {
    animationsEnabled = enabled;
    document.body.classList.toggle('reduce-motion', !enabled);
  }

  function isEnabled() {
    return animationsEnabled;
  }

  /**
   * Apply staggered fade-in to a list of elements
   */
  function staggerFadeIn(elements, baseDelay = 30) {
    if (!animationsEnabled) return;

    elements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
      el.style.transition = `opacity 250ms ease-out ${index * baseDelay}ms, transform 250ms ease-out ${index * baseDelay}ms`;

      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
    });
  }

  /**
   * Apply 3D tilt effect on mouse move (for game cards)
   */
  function applyTiltEffect(element) {
    if (!animationsEnabled) return;

    element.addEventListener('mousemove', (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      element.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';

      setTimeout(() => {
        element.style.transition = '';
      }, 400);
    });
  }

  /**
   * Create a ripple effect on click (for Play button)
   */
  function createRipple(event, element) {
    if (!animationsEnabled) return;

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }

  /**
   * Animate element entrance with fade and scale
   */
  function animateIn(element, type = 'fade-scale') {
    if (!animationsEnabled) {
      element.style.opacity = '1';
      return;
    }

    switch (type) {
      case 'fade-scale':
        element.classList.add('animate-fade-in-scale');
        break;
      case 'fade-up':
        element.classList.add('animate-fade-in-up');
        break;
      case 'fade':
        element.classList.add('animate-fade-in');
        break;
      case 'slide-left':
        element.classList.add('animate-slide-in-left');
        break;
      case 'slide-right':
        element.classList.add('animate-slide-in-right');
        break;
    }
  }

  /**
   * Animate element exit
   */
  function animateOut(element, duration = 250) {
    return new Promise(resolve => {
      if (!animationsEnabled) {
        resolve();
        return;
      }

      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      element.style.opacity = '0';
      element.style.transform = 'scale(0.95)';

      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * Smooth view transition between sections
   */
  function transitionView(outElement, inElement) {
    if (outElement) {
      outElement.classList.remove('view--active');
    }
    if (inElement) {
      inElement.classList.add('view--active');
    }
  }

  return {
    setEnabled,
    isEnabled,
    staggerFadeIn,
    applyTiltEffect,
    createRipple,
    animateIn,
    animateOut,
    transitionView
  };
})();
