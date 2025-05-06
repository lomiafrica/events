import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllPosts } from "@/lib/sanity/queries";
import { Post } from "@/lib/sanity/types";
import { urlFor } from "@/lib/sanity/client";
import { BlogLayout } from "@/components/blog/blog-layout";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./blog.css";

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

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isBlogTitleHovered, setIsBlogTitleHovered] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log("Fetching posts...");
        const fetchedPosts = await getAllPosts();
        console.log("Fetched posts:", fetchedPosts);
        setPosts(fetchedPosts || []);
      } catch (error) {
        console.error("Error fetching posts:", error);
        // Show detailed error information
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        // Set an empty array to avoid undefined errors
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  // Function to get the localized field based on current language
  const getLocalizedField = (post: Post, field: string, fallback: string) => {
    if (currentLanguage === "fr" && post[`${field}_fr` as keyof Post]) {
      return post[`${field}_fr` as keyof Post] as string;
    } else if (currentLanguage === "es" && post[`${field}_es` as keyof Post]) {
      return post[`${field}_es` as keyof Post] as string;
    } else if (currentLanguage === "pt" && post[`${field}_pt` as keyof Post]) {
      return post[`${field}_pt` as keyof Post] as string;
    } else if (currentLanguage === "zh" && post[`${field}_zh` as keyof Post]) {
      return post[`${field}_zh` as keyof Post] as string;
    }
    return (post[field as keyof Post] as string) || fallback;
  };

  // Check if a post has content in the current language
  const hasLanguageContent = (post: Post) => {
    // For English, always show the post since it's the base language
    if (currentLanguage === "en") return true;

    // For other languages, check if the languages field includes the current language
    // If the languages field doesn't exist, check if there's content in the current language
    if (!post.languages) {
      if (currentLanguage === "fr") {
        return !!post.title_fr || !!post.excerpt_fr || !!post.body_fr;
      } else if (currentLanguage === "es") {
        return !!post.title_es || !!post.excerpt_es || !!post.body_es;
      } else if (currentLanguage === "pt") {
        return !!post.title_pt || !!post.excerpt_pt || !!post.body_pt;
      } else if (currentLanguage === "zh") {
        return !!post.title_zh || !!post.excerpt_zh || !!post.body_zh;
      }
      return false;
    }

    return post.languages.includes(currentLanguage);
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

  // Filter posts by language
  const filteredPosts = posts.filter((post) => hasLanguageContent(post));

  // For debugging
  console.log("Current posts state:", posts);
  console.log("Current language:", currentLanguage);
  console.log("Filtered posts:", filteredPosts);

  return (
    <BlogLayout
      title={t("blog.title")}
      description={t("blog.description")}
      imageUrl={
        filteredPosts.length > 0 && filteredPosts[0]?.image
          ? urlFor(filteredPosts[0].image)
              .width(1200)
              .height(630)
              .quality(90)
              .url()
          : undefined
      }
    >
      <div className="container mx-auto px-4 py-0 max-w-7xl">
        <div className="relative pt-16 md:pt-20 mb-12">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl tracking-tighter font-regular text-zinc-800 dark:text-white mb-6 cursor-pointer hover:opacity-80 transition-opacity"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => navigate("/")}
            onMouseEnter={() => setIsBlogTitleHovered(true)}
            onMouseLeave={() => setIsBlogTitleHovered(false)}
          >
            <span className="flex items-center">
              <ArrowLeft
                className={`mr-2 h-8 w-8 transition-all duration-300 absolute ${isBlogTitleHovered ? "opacity-100 -translate-x-6" : "opacity-0 -translate-x-4"}`}
              />
              <span
                className="transition-transform duration-300"
                style={{
                  transform: isBlogTitleHovered
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              >
                {t("blog.heading")}
              </span>
            </span>
          </motion.h1>
          <motion.p
            className="text-zinc-600 dark:text-zinc-200 text-base sm:text-lg md:text-xl leading-relaxed tracking-tight max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t("blog.subheading")}
          </motion.p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] py-20">
            <Spinner />
          </div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-8 mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">
              {t("blog.noPosts")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {t("blog.noPostsDesc")}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors"
            >
              {t("blog.backHome")}
            </button>
          </motion.div>
        ) : (
          <div className="mb-20 relative">
            <motion.div
              ref={scrollContainerRef}
              className="flex flex-col sm:flex-row overflow-x-auto hide-scrollbar gap-6 pb-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredPosts.map((post) => (
                <motion.div
                  key={post._id}
                  variants={itemVariants}
                  className="w-full sm:w-[290px] sm:flex-shrink-0 mb-6 sm:mb-0"
                  onMouseEnter={() => setHoveredCard(post._id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Link
                    to={`/blog/${post.slug.current}`}
                    className="group flex flex-col h-full"
                  >
                    <article className="flex flex-col bg-white dark:bg-zinc-900 rounded-sm overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800 h-full">
                      {post.image && (
                        <div className="aspect-[3/2] overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
                          <img
                            src={urlFor(post.image)
                              .width(320)
                              .height(213)
                              .url()}
                            alt={
                              post.image.alt ||
                              getLocalizedField(post, "title", post.title)
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex-grow flex flex-col">
                          {post.author && post.publishedAt && (
                            <div className="flex items-center mb-1">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(post.publishedAt).toLocaleDateString(
                                  currentLanguage === "zh"
                                    ? "zh-CN"
                                    : currentLanguage,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          )}

                          {!post.author && post.publishedAt && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                              {new Date(post.publishedAt).toLocaleDateString(
                                currentLanguage === "fr"
                                  ? "fr-FR"
                                  : currentLanguage === "es"
                                    ? "es-ES"
                                    : currentLanguage === "pt"
                                      ? "pt-BR"
                                      : currentLanguage === "zh"
                                        ? "zh-CN"
                                        : "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </p>
                          )}

                          <h2 className="font-medium text-lg mb-3 leading-tight text-zinc-900 dark:text-white min-h-fit">
                            {getLocalizedField(post, "title", post.title)}
                          </h2>
                          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 overflow-hidden line-clamp-2">
                            {getLocalizedField(post, "excerpt", "")}
                          </p>
                        </div>
                        <div className="mt-auto flex flex-row justify-between items-center">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(getPostCategory(post))}`}
                          >
                            {t(`blog.categories.${getPostCategory(post)}`)}
                          </span>

                          <div className="flex items-center text-primary text-sm font-medium">
                            <span
                              className="transition-transform duration-300"
                              style={{
                                transform:
                                  hoveredCard === post._id
                                    ? "translateX(-2px)"
                                    : "translateX(0)",
                              }}
                            >
                              {t("blog.readArticle")}
                            </span>
                            <ArrowRight
                              className={`ml-1 h-4 w-4 transition-all duration-300 ${hoveredCard === post._id ? "opacity-100 translate-x-1" : "opacity-0 -translate-x-3"}`}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </BlogLayout>
  );
}
