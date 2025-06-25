export function initImageScroller() {
  setTimeout(() => {
    const mainImg = document.querySelector(".mainImg");
    const imageScroller = document.querySelector(".imageScroller");
    const thumbnails = document.querySelectorAll(".li img");
    const thumbnailList = document.querySelectorAll(".li");
    let touchStartX, touchStartY;
    let isScrolling = false;
    let currentImageIndex = 0;

    if (!mainImg || !imageScroller || thumbnails.length === 0) {
      console.error(
        "Required elements not found. ImageScroller initialization aborted.",
      );
      return;
    }

    // Preload next and previous images for faster loading
    function preloadImage(src) {
      const img = new Image();
      img.src = src;
    }

    function preloadNearbyImages(currentIndex) {
      const totalImages = thumbnails.length;
      // Preload next 2 and previous 2 images
      for (let i = -2; i <= 2; i++) {
        const index = currentIndex + i;
        if (index >= 0 && index < totalImages && index !== currentIndex) {
          preloadImage(thumbnails[index].src);
        }
      }
    }

    function changeMainImage(src, index) {
      // Fast image switching with preloading
      if (mainImg.src !== src) {
        mainImg.src = src;
        currentImageIndex = index;
        preloadNearbyImages(index);
      }
    }

    function updateActiveState(activeIndex) {
      thumbnailList.forEach((li, index) => {
        li.classList.toggle("active", index === activeIndex);
      });
      currentImageIndex = activeIndex;
    }

    function scrollToThumbnail(index, smooth = true) {
      const thumbnail = thumbnailList[index];
      if (thumbnail) {
        const itemHeight = 65; // li height (55px) + margin (10px)
        imageScroller.scrollTo({
          top: index * itemHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }

    // Navigate to specific image
    function navigateToImage(newIndex) {
      if (
        newIndex >= 0 &&
        newIndex < thumbnails.length &&
        newIndex !== currentImageIndex
      ) {
        changeMainImage(thumbnails[newIndex].src, newIndex);
        updateActiveState(newIndex);
        scrollToThumbnail(newIndex, true);
      }
    }

    // Wheel handling for desktop - more incremental and prevent page scroll
    function handleWheel(e) {
      e.preventDefault();
      e.stopPropagation();

      if (isScrolling) return;

      isScrolling = true;

      if (e.deltaY > 0 && currentImageIndex < thumbnails.length - 1) {
        // Scroll down - next image
        navigateToImage(currentImageIndex + 1);
      } else if (e.deltaY < 0 && currentImageIndex > 0) {
        // Scroll up - previous image
        navigateToImage(currentImageIndex - 1);
      }

      setTimeout(() => {
        isScrolling = false;
      }, 150);
    }

    // Handle manual scrolling of the scroller
    let scrollTimeout;
    function handleScroll(e) {
      e.stopPropagation();

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isScrolling) return;

        const scrollPosition = imageScroller.scrollTop;
        const itemHeight = 65;
        const newIndex = Math.round(scrollPosition / itemHeight);
        const clampedIndex = Math.max(
          0,
          Math.min(newIndex, thumbnails.length - 1),
        );

        if (clampedIndex !== currentImageIndex) {
          changeMainImage(thumbnails[clampedIndex].src, clampedIndex);
          updateActiveState(clampedIndex);
        }
      }, 50);
    }

    // Touch handling for mobile
    function handleTouchStart(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        e.preventDefault();
        e.stopPropagation();

        if (deltaX > 0 && currentImageIndex < thumbnails.length - 1) {
          // Swipe left - next image
          navigateToImage(currentImageIndex + 1);
        } else if (deltaX < 0 && currentImageIndex > 0) {
          // Swipe right - previous image
          navigateToImage(currentImageIndex - 1);
        }
      }

      touchStartX = null;
      touchStartY = null;
    }

    // Mouse enter/leave for better focus
    function handleMouseEnter() {
      imageScroller.style.overflowY = "auto";
      imageScroller.focus();
    }

    function handleMouseLeave() {
      imageScroller.blur();
    }

    // Keyboard navigation
    function handleKeyDown(e) {
      if (
        document.activeElement === imageScroller ||
        imageScroller.contains(document.activeElement)
      ) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          navigateToImage(currentImageIndex + 1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          navigateToImage(currentImageIndex - 1);
        }
      }
    }

    // Event listeners with proper options
    imageScroller.addEventListener("wheel", handleWheel, { passive: false });
    imageScroller.addEventListener("scroll", handleScroll, { passive: true });
    imageScroller.addEventListener("mouseenter", handleMouseEnter);
    imageScroller.addEventListener("mouseleave", handleMouseLeave);

    // Touch events
    imageScroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    imageScroller.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    // Main image touch events
    mainImg.addEventListener("touchstart", handleTouchStart, { passive: true });
    mainImg.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Keyboard events
    document.addEventListener("keydown", handleKeyDown);

    // Thumbnail click handlers - ensure they work even when scrolling isn't needed
    thumbnails.forEach((thumbnail, index) => {
      thumbnail.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToImage(index);
      });

      // Also add click handler to the button wrapper for better reliability
      const button = thumbnail.closest("button");
      if (button && button !== thumbnail) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigateToImage(index);
        });
      }
    });

    // Make scroller focusable
    imageScroller.setAttribute("tabindex", "0");
    imageScroller.style.outline = "none";

    // Initialize with first image and preload nearby
    if (thumbnails.length > 0) {
      changeMainImage(thumbnails[0].src, 0);
      updateActiveState(0);
      preloadNearbyImages(0);
      scrollToThumbnail(0, false);
    }

    // Intersection Observer for scroll-based updates
    const observerOptions = {
      root: imageScroller,
      threshold: 0.8,
      rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isScrolling) {
          const index = Array.from(thumbnailList).indexOf(entry.target);
          if (index !== -1 && index !== currentImageIndex) {
            changeMainImage(thumbnails[index].src, index);
            updateActiveState(index);
          }
        }
      });
    }, observerOptions);

    thumbnailList.forEach((thumbnail) => observer.observe(thumbnail));

    // Cleanup function
    return () => {
      observer.disconnect();
      imageScroller.removeEventListener("wheel", handleWheel);
      imageScroller.removeEventListener("scroll", handleScroll);
      imageScroller.removeEventListener("mouseenter", handleMouseEnter);
      imageScroller.removeEventListener("mouseleave", handleMouseLeave);
      imageScroller.removeEventListener("touchstart", handleTouchStart);
      imageScroller.removeEventListener("touchmove", handleTouchMove);
      mainImg.removeEventListener("touchstart", handleTouchStart);
      mainImg.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, 0);
}
