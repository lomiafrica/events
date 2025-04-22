export function initImageScroller() {
  setTimeout(() => {
    const mainImg = document.querySelector('.mainImg');
    const imageScroller = document.querySelector('.imageScroller');
    const thumbnails = document.querySelectorAll('.li img');
    let touchStartX, touchStartY;

    if (!mainImg || !imageScroller || thumbnails.length === 0) {
      console.error('Required elements not found. ImageScroller initialization aborted.');
      return;
    }

    function changeMainImage(src) {
      mainImg.src = src;
    }

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

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          // Swipe left
          const nextImage = document.querySelector('.li.active').nextElementSibling;
          if (nextImage) {
            changeMainImage(nextImage.querySelector('img').src);
            nextImage.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            nextImage.classList.add('active');
            document.querySelector('.li.active').classList.remove('active');
          }
        } else {
          // Swipe right
          const prevImage = document.querySelector('.li.active').previousElementSibling;
          if (prevImage) {
            changeMainImage(prevImage.querySelector('img').src);
            prevImage.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            prevImage.classList.add('active');
            document.querySelector('.li.active').classList.remove('active');
          }
        }
      }

      touchStartX = null;
      touchStartY = null;
    }

    mainImg.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainImg.addEventListener('touchmove', handleTouchMove, { passive: true });

    imageScroller.addEventListener('touchstart', handleTouchStart, { passive: true });
    imageScroller.addEventListener('touchmove', handleTouchMove, { passive: true });

    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        changeMainImage(thumbnail.src);
        thumbnail.parentElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        document.querySelector('.li.active').classList.remove('active');
        thumbnail.parentElement.classList.add('active');
      });
    });

    // Intersection Observer to update active thumbnail
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.querySelectorAll('.li.active').forEach(li => li.classList.remove('active'));
            entry.target.classList.add('active');
            changeMainImage(entry.target.querySelector('img').src);
          }
        });
      },
      { root: imageScroller, threshold: 0.5 }
    );

    thumbnails.forEach(thumbnail => observer.observe(thumbnail.parentElement));
  }, 0);
}