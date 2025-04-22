"use client";

import React, {
  useEffect,
  useRef,
  useState,
  WheelEvent,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import styles from "@/lib/styles/ImageScroller.module.css";
import Image from "next/image";
import { initImageScroller } from "@/lib/actions/ImageScroller.js";

interface Image {
  _id: string;
  title: string;
  slug: string;
  featuredImage: string;
  excerpt?: string;
  section?: { name: string; slug: string };
  category?: { name: string; slug: string };
  credits?: string;
  author?: { name: string };
  publishedAt?: string;
  recommendationTag?: string;
  recommendedArticles?: Image[];
  date?: string;
}

interface ImageScrollerProps {
  images: Image[];
}

const ImageScroller: React.FC<ImageScrollerProps> = ({ images }) => {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [imageStyle, setImageStyle] = useState({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [horizontalIndex, setHorizontalIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        setActiveImageIndex((prev) =>
          prev > 0 ? prev - 1 : images.length - 1,
        );
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        setActiveImageIndex((prev) =>
          prev < images.length - 1 ? prev + 1 : 0,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length]);

  const handleHorizontalScroll = (direction: "left" | "right") => {
    const currentImage = images[activeImageIndex];
    const recommendedArticles = currentImage?.recommendedArticles || [];
    const filteredRecommended = recommendedArticles.filter(
      (article) => article._id !== currentImage._id,
    );
    const totalImages = filteredRecommended.length + 1;

    if (direction === "left") {
      setHorizontalIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
    } else {
      setHorizontalIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth <= 1024;
      setIsMobile(isMobileView);
      setImageStyle(
        isMobileView
          ? {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }
          : {},
      );
      setActiveImageIndex((prevIndex) =>
        Math.min(prevIndex, images.length - 1),
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [images.length]);

  const handleScroll = useCallback(() => {
    if (scrollerRef.current && images.length > 0) {
      const scroller = scrollerRef.current;
      const scrollPosition = isMobile
        ? scroller.scrollLeft
        : scroller.scrollTop;
      const scrollSize = isMobile
        ? scroller.scrollWidth
        : scroller.scrollHeight;
      const clientSize = isMobile
        ? scroller.clientWidth
        : scroller.clientHeight;
      const maxScroll = scrollSize - clientSize;
      const scrollPercentage = scrollPosition / maxScroll;

      let index = Math.round(scrollPercentage * (images.length - 1));
      index = Math.min(Math.max(index, 0), images.length - 1);

      setActiveImageIndex(index);
      setHorizontalIndex(0); // Reset horizontal index when changing vertical scroll
    }
  }, [isMobile, images.length, setActiveImageIndex, setHorizontalIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.addEventListener("scroll", handleScroll);
      return () => {
        scroller.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initImageScroller();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (scrollerRef.current) {
      if (isMobile) {
        scrollerRef.current.scrollLeft += e.deltaY;
      } else {
        scrollerRef.current.scrollTop += e.deltaY;
      }
    }
  };

  const handleImageClick = (index: number) => {
    setActiveImageIndex(index);
    setHorizontalIndex(0);
    setIsFlipped(false);
  };

  const handleMainImageClick = () => {
    const activeImage = getActiveImage();
    if (activeImage && activeImage.slug) {
      router.push(`/events/${activeImage.slug}`);
    } else {
      console.error("No active image available");
      // Optionally, you could show an error message to the user or handle this case differently
    }
  };

  const handleFlipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  const handleTouchStart = () => {
    if (scrollerRef.current) {
      scrollerRef.current.style.scrollBehavior = "auto";
    }
  };

  const handleTouchEnd = () => {
    if (scrollerRef.current) {
      scrollerRef.current.style.scrollBehavior = "smooth";
    }
  };

  const getActiveImage = () => {
    const currentImage = images[activeImageIndex];
    if (!currentImage) return null;

    if (horizontalIndex === 0) {
      return currentImage;
    } else {
      const recommendedArticles = currentImage.recommendedArticles || [];
      // Skip the main image if it appears in the recommended articles
      const filteredRecommended = recommendedArticles.filter(
        (article) => article._id !== currentImage._id,
      );
      return filteredRecommended[horizontalIndex - 1] || null;
    }
  };

  if (images.length === 0) {
    return <div>No images available</div>;
  }

  const renderBackContent = (image: Image) => {
    const isRecommended = horizontalIndex !== 0;

    return (
      <div className={styles.backContent}>
        <h3 className={styles.title}>{image.title}</h3>
        {image.date && (
          <button className={styles.metadataButton}>
            {new Date(image.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </button>
        )}
        {image.excerpt && <p className={styles.excerpt}>{image.excerpt}</p>}
        {!isRecommended && (
          <>
            <div className={styles.metadata}>
              {image.section && (
                <button className={styles.metadataButton}>
                  {image.section.name}
                </button>
              )}
              {image.category && (
                <button className={styles.metadataButton}>
                  {image.category.name}
                </button>
              )}
              {image.author && (
                <button className={styles.metadataButton}>
                  {image.author.name}
                </button>
              )}
            </div>
            {image.credits && (
              <button className={styles.metadataButton}>{image.credits}</button>
            )}
          </>
        )}
        <button
          onClick={handleMainImageClick}
          className={styles.readMoreButton}
        >
          View Event
        </button>
      </div>
    );
  };

  const activeImage = getActiveImage();
  if (!activeImage) return null;

  return (
    <div className={styles.imageScrollerContainer} ref={containerRef}>
      <div className={styles.imageBox}>
        <main className={styles.main} onWheel={handleWheel}>
          <div className={styles.mainImageContainer}>
            <div
              className={`${styles.flipper} ${isFlipped ? styles.flipped : ""}`}
            >
              <div className={styles.front}>
                <Image
                  src={activeImage.featuredImage}
                  alt={activeImage.title}
                  className={`${styles.mainImg} mainImg`}
                  onClick={handleMainImageClick}
                  style={{
                    cursor: "pointer",
                    ...imageStyle,
                  }}
                  loading="lazy"
                />
              </div>
              <div className={styles.back}>
                {renderBackContent(activeImage)}
              </div>
            </div>
            <button className={styles.flipButton} onClick={handleFlipClick}>
              <Image src="/flip.png" alt="Flip" className={styles.flipIcon} />
            </button>
          </div>
          <button
            className={`${styles.scrollButton} ${styles.leftButton}`}
            onClick={() => handleHorizontalScroll("left")}
            style={{
              display: images[activeImageIndex]?.recommendedArticles?.length
                ? "block"
                : "none",
            }}
          >
            &lt;
          </button>
          <button
            className={`${styles.scrollButton} ${styles.rightButton}`}
            onClick={() => handleHorizontalScroll("right")}
            style={{
              display: images[activeImageIndex]?.recommendedArticles?.length
                ? "block"
                : "none",
            }}
          >
            &gt;
          </button>
        </main>
        <div
          ref={scrollerRef}
          className={`${styles.imageScroller} imageScroller`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <aside className={styles.aside}>
            <nav>
              <ul className={styles.asideUl}>
                {images.map((image, index) => (
                  <li
                    key={image._id}
                    className={`${styles.li} ${index === activeImageIndex ? styles.active : ""} li`}
                  >
                    <button
                      onClick={() => handleImageClick(index)}
                      className={styles.liButton}
                    >
                      <Image
                        src={image.featuredImage}
                        alt={image.title}
                        className={styles.liImg}
                        loading="lazy"
                      />
                      <span className={styles.asideSpan}>{image.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ImageScroller;
