import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import { getPostBySlug } from "@/lib/sanity/queries";
import { Post } from "@/lib/sanity/types";
import { urlFor } from "@/lib/sanity/client";
import { BlogLayout } from "@/components/blog/blog-layout";
import { motion } from "framer-motion";
import { PortableTextBlock } from "@portabletext/types";
import { useTranslation } from "react-i18next";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, Sun, Moon, Share2 } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";
import { ButtonExpand } from "@/components/design/button-expand";
import "./blog.css";

// Define the specific languages for the blog post switcher
const blogLanguages = [
  { code: "fr", name: "FR" },
  { code: "en", name: "EN" },
  { code: "es", name: "ES" },
  { code: "pt", name: "PT" },
  { code: "zh", name: "ZH" },
];

// Helper function to get category from post
const getPostCategory = (post: Post): string => {
  // First try to get from categories array
  if (
    post.categories &&
    post.categories.length > 0 &&
    post.categories[0]?.slug?.current
  ) {
    return post.categories[0].slug.current;
  }

  // Fallback to legacy category field
  return post.category || "news";
};

// Function to get category color
const getCategoryColor = (category: string) => {
  if (!category)
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  const categoryColorMap: Record<string, string> = {
    news: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    opinion:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    payments:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    startupOpenSource:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "case-study":
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    "online-business":
      "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    categoryColorMap[category] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
};

// Simplified component type definitions
export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackButtonHovered, setIsBackButtonHovered] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const { theme, setTheme } = useTheme();

  // Added useEffect for glitch CSS
  useEffect(() => {
    if (!post && !loading) {
      // Only add styles if the post is not found (and not loading)
      const style = document.createElement("style");
      style.id = "glitch-style"; // Add an ID for easier removal
      style.textContent = `
        @import url('https://fonts.googleapis.com/css?family=Fira+Mono:400');

        .glitch-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          /* Removed fixed background color to allow theme background */
        }

        .glitch-text {
          font-size: 72px; /* Slightly smaller for blog context */
          font-family: 'Fira Mono', monospace;
          font-weight: 400;
          letter-spacing: -5px; /* Adjusted spacing */
          animation: glitch 1s linear infinite;
          position: relative;
          color: var(--foreground); /* Use theme color */
        }

        @keyframes glitch {
          2%,64% { transform: translate(2px,0) skew(0deg); }
          4%,60% { transform: translate(-2px,0) skew(0deg); }
          62% { transform: translate(0,0) skew(5deg); }
        }

        .glitch-text:before,
        .glitch-text:after {
          content: attr(title);
          position: absolute;
          left: 0;
          right: 0; /* Ensure centering */
          color: var(--foreground); /* Use theme color */
        }

        .glitch-text:before {
          animation: glitchTop 1s linear infinite;
          clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
          -webkit-clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
        }

        @keyframes glitchTop {
          2%,64% { transform: translate(2px,-2px); }
          4%,60% { transform: translate(-2px,2px); }
          62% { transform: translate(13px,-1px) skew(-13deg); }
        }

        .glitch-text:after {
          animation: glitchBotom 1.5s linear infinite;
          clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
          -webkit-clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
        }

        @keyframes glitchBotom {
          2%,64% { transform: translate(-2px,0); }
          4%,60% { transform: translate(-2px,0); }
          62% { transform: translate(-22px,5px) skew(21deg); }
        }

        .button-container {
          position: relative;
          z-index: 10; /* Lower z-index might be needed */
          pointer-events: auto;
        }

        .button-container button,
        .button-container a {
          pointer-events: auto;
          touch-action: manipulation;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const styleElement = document.getElementById("glitch-style");
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
      };
    }
    return undefined; // Explicitly return undefined for the other code path
  }, [post, loading]); // Rerun effect if post or loading state changes

  // Language switching logic for the blog post page
  const changeBlogLanguage = useCallback(() => {
    const currentIndex = blogLanguages.findIndex(
      (l) => l.code === i18n.language,
    );
    // Determine a valid starting index if the current language isn't in our specific list
    const validCurrentIndex =
      currentIndex === -1
        ? blogLanguages.findIndex((l) => l.code === "en") // Default to English index if not found
        : currentIndex;
    const nextIndex = (validCurrentIndex + 1) % blogLanguages.length;
    const nextLang = blogLanguages[nextIndex]?.code || "en"; // Fallback to 'en'

    i18n.changeLanguage(nextLang);
    localStorage.setItem("language", nextLang); // Persist choice
  }, [i18n]); // Dependency on i18n instance

  // Get the display name for the current language button
  const currentLangName =
    blogLanguages.find((l) => l.code === i18n.language)?.name ||
    blogLanguages.find((l) => l.code === "en")?.name ||
    "EN"; // Fallback display name

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        navigate("/blog");
        return;
      }

      try {
        const fetchedPost = await getPostBySlug(slug);

        // Debug multilingual content
        if (fetchedPost) {
          // Log body structure to debug list rendering issues
          const bodyKey =
            i18n.language !== "en" ? `body_${i18n.language}` : "body";
          const bodyContent = fetchedPost[bodyKey as keyof typeof fetchedPost];
          if (Array.isArray(bodyContent)) {
            console.log(
              `Body structure for ${bodyKey}:`,
              bodyContent.slice(0, 3),
            );
          } else {
            console.log(
              `Body structure for ${bodyKey}: not an array or undefined`,
            );
          }
        }

        setPost(fetchedPost);
      } catch (error) {
        console.error("Error fetching post:", error);
        navigate("/blog");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, navigate, i18n.language]);

  // Function to get the localized field based on current language
  const getLocalizedField = (field: string, fallback: string): string => {
    if (!post) return fallback;

    // Check for localized field based on current language
    const localizedFieldKey = `${field}_${currentLanguage}` as keyof Post;
    if (currentLanguage !== "en" && post[localizedFieldKey]) {
      return (post[localizedFieldKey] as string) || fallback;
    }
    return (post[field as keyof Post] as string) || fallback;
  };

  // Check if post has content in the current language
  const hasLanguageContent = () => {
    if (!post) return false;
    if (currentLanguage === "en") return true; // English is always available as the base language
    if (["fr", "es", "pt", "zh"].includes(currentLanguage)) {
      return post.languages?.includes(currentLanguage) || false;
    }
    return false;
  };

  if (loading) {
    return (
      <BlogLayout title={t("blog.loading")} description={t("blog.loadingDesc")}>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] flex-grow py-0">
          <Spinner />
        </div>
      </BlogLayout>
    );
  }

  if (!post || !hasLanguageContent()) {
    // Modified Not Found Block
    return (
      <BlogLayout
        title={t("blog.notFound")}
        description={t("blog.notFoundDesc")}
      >
        {/* Use flex-grow to take available space */}
        <div className="flex flex-col items-center justify-center flex-grow min-h-[calc(100vh-200px)] py-0">
          <div className="glitch-wrapper">
            {/* Adjusted glitch text positioning slightly */}
            <div className="relative mb-10">
              <div
                className="glitch-text"
                title={t("blog.notFound") || "Not Found"}
              >
                {t("blog.notFound")}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-4 mt-4">
            {" "}
            {/* Adjusted margin */}
            <div className="flex gap-4 mt-2 button-container">
              <ButtonExpand
                text={t("blog.backToBlog")}
                icon={ArrowLeft}
                iconPlacement="left"
                bgColor="bg-zinc-800/90 dark:bg-zinc-800/90" // Ensure dark mode style
                textColor="text-zinc-200 dark:text-zinc-200"
                hoverBgColor="hover:bg-zinc-700/90 dark:hover:bg-zinc-700/90"
                hoverTextColor="hover:text-white dark:hover:text-white"
                onMouseDown={() => navigate("/blog")} // Changed back to onMouseDown
                className="h-10 px-4 shadow-none rounded-sm" // Added rounded-sm
              />
            </div>
          </div>
        </div>
      </BlogLayout>
    );
  }

  // Get the appropriate content based on the current language
  const title = getLocalizedField("title", post.title);

  // Get localized body content with better fallback and debugging
  let body = post.body; // Default to English body
  if (currentLanguage !== "en") {
    const localizedBodyKey = `body_${currentLanguage}` as keyof Post;
    const localizedBody = post[localizedBodyKey] as
      | PortableTextBlock[]
      | undefined;

    // Check if localized body exists and has content
    if (localizedBody && localizedBody.length > 0) {
      console.log(`Using ${currentLanguage} body content`);
      body = localizedBody;
    } else {
      console.log(
        `No ${currentLanguage} body content available, using English fallback`,
      );
    }
  }

  // In development, add a debug message if there are known rendering issues with the content
  if (import.meta.env.DEV) {
    if (Array.isArray(body)) {
      console.log("Body content sample for rendering:", body.slice(0, 3));
    } else {
      console.log("Body content is not an array");
    }
  }

  const postUrl = window.location.href;

  return (
    <BlogLayout
      title={title}
      description={`${t("blog.readArticle")}: ${title}`}
      imageUrl={
        post.image
          ? urlFor(post.image).width(1200).height(630).quality(90).url()
          : post.mainImage
            ? urlFor(post.mainImage).width(1200).height(630).quality(90).url()
            : undefined
      }
      publishedAt={post.publishedAt}
      authorName={post.author?.name}
    >
      <div className="container mx-auto px-4 py-0 max-w-7xl">
        <div className="mb-8 pt-16 md:pt-20">
          <div className="flex flex-col md:flex-row md:items-start mb-6">
            <div className="md:w-[175px] shrink-0 mb-6 md:mb-0 flex flex-col items-start gap-4">
              <Link
                to="/blog"
                className="text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-colors inline-flex items-center"
                onMouseEnter={() => setIsBackButtonHovered(true)}
                onMouseLeave={() => setIsBackButtonHovered(false)}
              >
                <span
                  className="flex items-center transition-transform duration-300"
                  style={{
                    transform: isBackButtonHovered
                      ? "translateX(20px)"
                      : "translateX(0)",
                  }}
                >
                  <ArrowLeft
                    className={`mr-2 h-4 w-4 transition-all duration-300 absolute ${isBackButtonHovered ? "opacity-100 -translate-x-6" : "opacity-0 -translate-x-4"}`}
                  />
                  {t("blog.backToBlog")}
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={changeBlogLanguage}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-zinc-500/10 dark:hover:bg-zinc-400/10 hover:text-zinc-600 dark:hover:text-zinc-400 hover:border-zinc-500/20 dark:hover:border-zinc-400/20"
                  aria-label={t("blog.switchLanguage", "Switch Language")}
                >
                  <span className="font-medium text-xs">{currentLangName}</span>
                </button>

                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-zinc-500/10 dark:hover:bg-zinc-400/10 hover:text-zinc-600 dark:hover:text-zinc-400 hover:border-zinc-500/20 dark:hover:border-zinc-400/20"
                  aria-label={t("blog.switchTheme")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="text-zinc-600 dark:text-zinc-400 inline-flex items-center justify-center h-7 w-7 p-1.5 rounded-sm border border-transparent transition-colors duration-150 hover:bg-blue-400/10 dark:hover:bg-blue-400/20 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500/20 dark:hover:border-blue-400/30"
                  aria-label={t("blog.shareTitle")}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 max-w-2xl md:max-w-4xl">
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white leading-tight mb-4">
                {title}
              </h1>
              {/* Display localized excerpt if available */}
              {post.excerpt && (
                <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {getLocalizedField("excerpt", post.excerpt)}
                </p>
              )}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <article className="max-w-3xl sm:max-w-4xl mx-auto pb-10 sm: -pb-100">
            <header className="mb-6">
              <div className="flex flex-wrap items-center text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {post.author && (
                  <div className="flex items-center mr-6 mb-2">
                    {post.author.image && (
                      <div className="w-8 h-8 overflow-hidden mr-2 rounded-sm">
                        <img
                          src={urlFor(post.author.image)
                            .width(100)
                            .height(100)
                            .url()}
                          alt={post.author.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span>
                      {t("blog.byAuthor", { author: post.author.name })}
                    </span>
                  </div>
                )}

                {post.author && post.publishedAt && (
                  <span className="mx-2 mb-2 -ml-4">·</span>
                )}

                <div className="mb-2 flex items-center flex-wrap">
                  {post.publishedAt && (
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString(
                        currentLanguage === "zh" ? "zh-CN" : currentLanguage,
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </span>
                  )}

                  {post.publishedAt && <span className="mx-2">·</span>}

                  <span
                    className={`px-3 py-1 text-xs rounded ${getCategoryColor(getPostCategory(post))}`}
                  >
                    {t(`blog.categories.${getPostCategory(post)}`)}
                  </span>
                </div>
              </div>

              {post.image && (
                <div className="rounded-sm overflow-hidden mb-6 shadow-md">
                  <div className="aspect-[16/9] md:aspect-[16/9] relative">
                    <img
                      src={urlFor(post.image, {
                        width: 1200,
                        height: 675,
                        quality: 90,
                      }).url()}
                      alt={post.image.alt || title}
                      className="w-full h-full object-cover absolute top-0 left-0"
                      loading="eager"
                    />
                  </div>
                  {post.image.caption && (
                    <div className="text-[9px] sm:text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 italic px-2 md:text-right text-right border-b-transparent border-transparent dark:border-transparent pb-0 sm:border-b-transparent sm:pb-0">
                      {post.image.caption}
                    </div>
                  )}
                </div>
              )}

              {!post.image && post.mainImage && (
                <div className="rounded-sm overflow-hidden mb-6 shadow-md">
                  <div className="aspect-[16/9] md:aspect-[16/9] relative">
                    <img
                      src={urlFor(post.mainImage, {
                        width: 1200,
                        height: 675,
                        quality: 90,
                      }).url()}
                      alt={post.mainImage.alt || title}
                      className="w-full h-full object-cover absolute top-0 left-0"
                      loading="eager"
                    />
                  </div>
                  {post.mainImage.caption && (
                    <div className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-2 italic px-2 md:text-right text-right border-b-transparent border-transparent dark:border-transparent pb-0 sm:border-b-transparent sm:pb-0">
                      {post.mainImage.caption}
                    </div>
                  )}
                </div>
              )}
            </header>

            <div
              className="prose prose-zinc dark:prose-invert
                            prose-headings:font-bold
                            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6
                            prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
                            prose-h3:text-xl prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
                            prose-h4:text-lg prose-h4:font-medium prose-h4:mt-4 prose-h4:mb-2
                            prose-p:text-base prose-p:leading-relaxed prose-p:my-4
                            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5
                            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-5
                            prose-li:my-2 prose-li:pl-1
                            prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-300
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                            prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:mx-auto
                            prose-strong:font-bold prose-strong:text-zinc-900 dark:prose-strong:text-white
                            prose-em:italic
                            prose-code:bg-zinc-100 prose-code:text-zinc-800 dark:prose-code:bg-zinc-800 dark:prose-code:text-zinc-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                            prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                            max-w-none mx-auto px-0 sm:px-2 md:px-0"
            >
              <PortableText
                value={body}
                components={{
                  list: {
                    // Added explicit list renderers for better control
                    bullet: ({ children }) => (
                      <ul className="list-disc pl-5 my-6 space-y-2 text-zinc-800 dark:text-zinc-300">
                        {children}
                      </ul>
                    ),
                    number: ({ children }) => (
                      <ol className="list-decimal pl-5 my-6 space-y-2 text-zinc-800 dark:text-zinc-300">
                        {children}
                      </ol>
                    ),
                  },
                  listItem: {
                    // Explicitly handle list items for consistency
                    bullet: ({ children }) => (
                      <li className="pl-1 my-2">{children}</li>
                    ),
                    number: ({ children }) => (
                      <li className="pl-1 my-2">{children}</li>
                    ),
                  },
                  types: {
                    image: ({ value }) => {
                      if (!value?.asset?._ref) {
                        return null;
                      }
                      return (
                        <figure className="my-8">
                          <div className="aspect-[16/9] md:aspect-[16/9] relative rounded-sm shadow-md overflow-hidden">
                            <img
                              src={urlFor(value, {
                                width: 1200,
                                quality: 85,
                              }).url()}
                              alt={value.alt || title}
                              loading="lazy"
                              className="w-full h-full object-cover absolute top-0 left-0"
                            />
                          </div>
                          {value.caption && (
                            <figcaption className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic px-2 md:text-center text-right border-b border-zinc-200 dark:border-zinc-800 pb-2 sm:border-b-0 sm:pb-0">
                              {value.caption}
                            </figcaption>
                          )}
                        </figure>
                      );
                    },
                    codeBlock: ({ value }) => (
                      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 my-6 overflow-x-auto border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <pre className="text-sm font-mono">{value.code}</pre>
                      </div>
                    ),
                    infoBlock: ({ value }) => (
                      <div className="flex rounded-sm border border-blue-200 bg-blue-50 dark:border-blue-200/30 dark:bg-blue-950/30 p-4 my-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 flex-shrink-0 mt-1 text-blue-600 dark:text-blue-400"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                        <div className="ml-3 flex-1">
                          <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
                            {value.title || "Information"}
                          </h4>
                          <div className="text-[14px] leading-relaxed text-blue-700 dark:text-blue-300">
                            {value.text}
                          </div>
                        </div>
                      </div>
                    ),
                    warningBlock: ({ value }) => (
                      <div className="flex rounded-sm border border-yellow-200 bg-yellow-50 dark:border-yellow-200/30 dark:bg-yellow-950/30 p-4 my-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 flex-shrink-0 mt-1 text-yellow-600 dark:text-yellow-400"
                        >
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <path d="M12 9v4" />
                          <path d="M12 17h.01" />
                        </svg>
                        <div className="ml-3 flex-1">
                          <h4 className="font-semibold mb-2 text-yellow-600 dark:text-yellow-400">
                            {value.title || "Warning"}
                          </h4>
                          <div className="text-[14px] leading-relaxed text-yellow-700 dark:text-yellow-300">
                            {value.text}
                          </div>
                        </div>
                      </div>
                    ),
                    table: ({ value }) => (
                      <div className="overflow-x-auto my-8 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <table className="w-full border-collapse">
                          <thead className="bg-zinc-100 dark:bg-zinc-800">
                            <tr>
                              {value.rows[0].cells.map(
                                (cell: string, i: number) => (
                                  <th
                                    key={i}
                                    className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left font-semibold"
                                  >
                                    {cell}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {value.rows
                              .slice(1)
                              .map((row: { cells: string[] }, i: number) => (
                                <tr
                                  key={i}
                                  className={
                                    i % 2 === 0
                                      ? "bg-white dark:bg-zinc-900"
                                      : "bg-zinc-50 dark:bg-zinc-800/50"
                                  }
                                >
                                  {row.cells.map((cell: string, j: number) => (
                                    <td
                                      key={j}
                                      className="border border-zinc-300 dark:border-zinc-700 px-4 py-2"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ),
                    // Adding custom callout component for additional customization
                    callout: ({ value }) => (
                      <div className="my-6 p-4 border-l-4 border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 rounded-r">
                        <div className="font-medium mb-2">
                          {value.title || "Note"}
                        </div>
                        <div className="text-zinc-700 dark:text-zinc-300">
                          {value.text}
                        </div>
                      </div>
                    ),
                  },
                  marks: {
                    link: ({ value, children }) => {
                      const target = (value?.href || "").startsWith("http")
                        ? "_blank"
                        : undefined;
                      return (
                        <a
                          href={value?.href}
                          target={target}
                          rel={
                            target === "_blank"
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="text-primary hover:underline transition-colors"
                        >
                          {children}
                        </a>
                      );
                    },
                    highlight: ({ children }) => (
                      <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 py-0.5 rounded">
                        {children}
                      </span>
                    ),
                    button: ({ value, children }) => (
                      <a
                        href={value?.url}
                        className="inline-block px-4 py-2 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors my-2 font-medium shadow-sm"
                      >
                        {children}
                      </a>
                    ),
                    // Adding underline mark for additional customization
                    underline: ({ children }) => (
                      <span className="underline underline-offset-2 decoration-1">
                        {children}
                      </span>
                    ),
                    // Adding strikethrough mark for additional customization
                    strike: ({ children }) => (
                      <span className="line-through">{children}</span>
                    ),
                  },
                  block: {
                    normal: ({ children }) => (
                      <p className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed my-4">
                        {children}
                      </p>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mt-8 mb-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-medium text-zinc-900 dark:text-white mt-6 mb-3">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-lg font-medium text-zinc-900 dark:text-white mt-4 mb-2">
                        {children}
                      </h4>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-4 italic text-zinc-700 dark:text-zinc-300 my-6 py-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    customList: ({ children }) => (
                      <ul className="list-disc pl-5 my-4 text-zinc-800 dark:text-zinc-300 space-y-2">
                        {children}
                      </ul>
                    ),
                    // Updated lead paragraph to be lighter with font-light instead of changing color
                    lead: ({ children }) => (
                      <p className="text-xl font-light text-zinc-800 dark:text-zinc-200 leading-relaxed my-6">
                        {children}
                      </p>
                    ),
                  },
                }}
              />
            </div>
          </article>
        </motion.div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={postUrl}
        title={title}
      />
    </BlogLayout>
  );
}
