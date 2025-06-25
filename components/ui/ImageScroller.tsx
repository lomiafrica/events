"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "@/lib/styles/ImageScroller.module.css";
import Image from "next/image";
import { initImageScroller } from "@/lib/actions/ImageScroller.js";

interface EventImageData {
  _id: string;
  title: string;
  slug: string;
  featuredImage: string;
  date?: string;
  description?: string;
  ticketsAvailable?: boolean;
}

interface ImageScrollerProps {
  images: EventImageData[];
}

const ImageScroller: React.FC<ImageScrollerProps> = ({ images }) => {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [imageStyle, setImageStyle] = useState({});

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

      if (isMobile) {
        // Mobile horizontal scrolling
        const scrollPosition = scroller.scrollLeft;
        const itemWidth = 85; // thumbnail width + margin
        const index = Math.round(scrollPosition / itemWidth);
        const clampedIndex = Math.min(Math.max(index, 0), images.length - 1);
        setActiveImageIndex(clampedIndex);
      } else {
        // Desktop vertical scrolling - more precise
        const scrollPosition = scroller.scrollTop;
        const itemHeight = 65; // li height (55px) + margin (10px)
        const index = Math.round(scrollPosition / itemHeight);
        const clampedIndex = Math.min(Math.max(index, 0), images.length - 1);
        setActiveImageIndex(clampedIndex);
      }
    }
  }, [isMobile, images.length]);

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
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleImageClick = (index: number) => {
    setActiveImageIndex(index);
  };

  const handleMainImageClick = () => {
    const activeImage = getActiveImage();
    if (activeImage && activeImage.slug) {
      router.push(`/events/${activeImage.slug}`);
    } else {
      console.error("No active image or slug available for navigation");
    }
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

  const getActiveImage = (): EventImageData | null => {
    const currentImage = images[activeImageIndex];
    if (!currentImage) return null;
    return currentImage;
  };

  if (images.length === 0) {
    return <div>No images available</div>;
  }

  const activeImage = getActiveImage();
  if (!activeImage) return null;

  return (
    <div className={styles.imageScrollerContainer} ref={containerRef}>
      <div className={styles.imageBox}>
        <main className={styles.main}>
          <div className={styles.front} style={{ position: "relative" }}>
            <Image
              src={activeImage.featuredImage || "/placeholder.webp"}
              alt={activeImage.title}
              className={`${styles.mainImg} mainImg`}
              onClick={handleMainImageClick}
              style={{
                cursor: "pointer",
                ...imageStyle,
              }}
              width={800}
              height={600}
              priority={true}
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          </div>
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
                        src={image.featuredImage || "/placeholder.webp"}
                        alt={image.title}
                        className={styles.liImg}
                        loading={index <= 5 ? "eager" : "lazy"}
                        width={55}
                        height={55}
                        quality={75}
                        sizes="55px"
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
