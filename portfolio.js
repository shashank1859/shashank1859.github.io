// 2. Get the canvas and its drawing tool
    const canvas = document.getElementById("bg");
    const ctx = canvas.getContext("2d");
    const introScreen = document.querySelector(".intro-screen");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let introComplete = !introScreen || prefersReducedMotion;
    document.getElementById("year").textContent = new Date().getFullYear();

    if (prefersReducedMotion && introScreen) {
      introScreen.remove();
    }

    document.documentElement.classList.add("js");
    const revealTargets = document.querySelectorAll(".reveal-on-scroll");
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const revealObserver = new IntersectionObserver(function (entries, observer) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      }, { rootMargin: "0px 0px -40px 0px", threshold: 0.08 });

      revealTargets.forEach(function (target) {
        revealObserver.observe(target);
      });
    } else {
      revealTargets.forEach(function (target) {
        target.classList.add("is-visible");
      });
    }

    // 3. Match the drawing surface to the browser's native pixel resolution
    let width = 0;
    let height = 0;
    let stars = [];
    let seed = 924731;

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      seed = 924731;
      const count = Math.max(260, Math.min(1200, Math.round(width * height / 1900)));
      const armCount = Math.round(count * 0.68);
      stars = [];

      for (let i = 0; i < count; i++) {
        let x;
        let y;
        const depth = 0.35 + random() * 0.65;

        if (i < armCount) {
          const radius = Math.sqrt(random());
          const arm = i % 4;
          const angle = arm * Math.PI / 2 + radius * 7.2 + (random() - 0.5) * 0.46;
          x = Math.cos(angle) * radius * width * 0.48;
          y = Math.sin(angle) * radius * height * 0.24;
          const tilt = -0.19;
          const tiltedX = x * Math.cos(tilt) - y * Math.sin(tilt);
          y = x * Math.sin(tilt) + y * Math.cos(tilt);
          x = tiltedX;
        } else {
          x = (random() - 0.5) * width;
          y = (random() - 0.5) * height;
        }

        stars.push({
          x: x + width * 0.52,
          y: y + height * 0.49,
          size: 0.45 + random() * 1.15,
          depth: depth,
          twinkle: random() * Math.PI * 2,
          rate: 0.45 + random() * 1.15,
          glow: i % 42 === 0
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resize);
    }

    function watchDevicePixelRatio() {
      const query = window.matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)");
      function handleChange() {
        if (query.removeEventListener) {
          query.removeEventListener("change", handleChange);
        } else {
          query.removeListener(handleChange);
        }
        resize();
        watchDevicePixelRatio();
      }

      if (query.addEventListener) {
        query.addEventListener("change", handleChange);
      } else {
        query.addListener(handleChange);
      }
    }
    watchDevicePixelRatio();

    // 4. Smooth the cursor position so nearby stars react gently
    const pointer = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, active: 0, targetActive: 0 };
    window.addEventListener("pointermove", function (event) {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.targetActive = 1;
    }, { passive: true });
    window.addEventListener("pointerleave", function () {
      pointer.targetActive = 0;
    });

    const orbitingStarCount = 9;

    function drawContourField(time, rotationCos, rotationSin) {
      const contourCount = 8;
      const pointCount = 88;
      const centerX = width * 0.52 + (width / 2 - pointer.x) * 0.025 * pointer.active;
      const centerY = height * 0.49 + (height / 2 - pointer.y) * 0.025 * pointer.active;
      const drift = time * 0.000055;
      ctx.lineWidth = 0.7;

      for (let ring = 0; ring < contourCount; ring++) {
        const scale = (ring + 1) / contourCount;
        const phase = drift + ring * 0.37;
        const radiusX = width * (0.12 + scale * 0.39);
        const radiusY = height * (0.1 + scale * 0.33);
        const ringX = centerX + Math.sin(phase * 0.4) * width * 0.012;
        const ringY = centerY + Math.cos(phase * 0.35) * height * 0.01;

        ctx.beginPath();
        for (let point = 0; point <= pointCount; point++) {
          const angle = point / pointCount * Math.PI * 2;
          const contour = 1
            + Math.sin(angle * 3 + phase) * 0.065
            + Math.cos(angle * 7 - phase * 0.72) * 0.022;
          const localX = Math.cos(angle) * radiusX * contour;
          const localY = Math.sin(angle) * radiusY * contour
            + Math.sin(angle * 2 + phase) * height * 0.006;
          const x = ringX + localX * rotationCos - localY * rotationSin;
          const y = ringY + localX * rotationSin + localY * rotationCos;

          if (point === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = "rgba(255, 255, 255, " + (0.025 + (1 - scale) * 0.04) + ")";
        ctx.stroke();
      }
    }

    // 5. Draw a custom contour field with stars moving in a shared orbit
    let animationFrame = null;
    function animate(time) {
      animationFrame = null;
      if (document.hidden) {
        return;
      }

      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.active += (pointer.targetActive - pointer.active) * 0.08;
      const rotation = time * 0.000003;
      const rotationCos = Math.cos(rotation);
      const rotationSin = Math.sin(rotation);
      drawContourField(time, rotationCos, rotationSin);

      for (const star of stars) {
        const offsetX = star.x - width * 0.52;
        const offsetY = star.y - height * 0.49;
        const angle = rotation * star.depth;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let x = width * 0.52 + offsetX * cos - offsetY * sin;
        let y = height * 0.49 + offsetX * sin + offsetY * cos;

        x += (width / 2 - pointer.x) * star.depth * 0.012 * pointer.active;
        y += (height / 2 - pointer.y) * star.depth * 0.012 * pointer.active;

        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0 && distance < 130) {
          const push = Math.pow(1 - distance / 130, 2) * 12 * pointer.active;
          x += dx / distance * push;
          y += dy / distance * push;
        }

        const shimmer = 0.52 + (Math.sin(time * 0.001 * star.rate + star.twinkle) + 1) * 0.23;
        ctx.globalAlpha = shimmer;
        ctx.fillStyle = "#ffffff";
        if (star.glow) {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 7;
        }
        ctx.fillRect(x, y, star.size, star.size);
        if (star.glow) {
          ctx.shadowBlur = 0;
        }
      }

      ctx.globalAlpha = 1;

      for (let i = 0; i < orbitingStarCount; i++) {
        const phase = (time * 0.000008 + i / orbitingStarCount) % 1;
        const angle = phase * Math.PI * 2;
        const radius = 0.72 + Math.sin(angle * 2) * 0.08;
        const localX = Math.cos(angle) * width * 0.48 * radius;
        const localY = Math.sin(angle) * height * 0.24 * radius;
        const x = width * 0.52 + localX * rotationCos - localY * rotationSin;
        const y = height * 0.49 + localX * rotationSin + localY * rotationCos;

        ctx.beginPath();
        ctx.moveTo(x + Math.sin(angle) * 11, y - Math.cos(angle) * 6);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (pointer.active > 0) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 105);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.085)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.x - 105, pointer.y - 105, 210, 210);
      }

      animationFrame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!document.hidden && introComplete && animationFrame === null) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
        animationFrame = null;
      } else {
        startAnimation();
      }
    });

    if (introComplete) {
      startAnimation();
    } else {
      function finishIntro() {
        if (introComplete) {
          return;
        }
        introComplete = true;
        introScreen.removeEventListener("animationend", handleIntroAnimationEnd);
        introScreen.remove();
        startAnimation();
      }

      function handleIntroAnimationEnd(event) {
        if (event.target === introScreen && event.animationName === "intro-exit") {
          finishIntro();
        }
      }

      introScreen.addEventListener("animationend", handleIntroAnimationEnd);
      window.setTimeout(finishIntro, 2100);
    }
