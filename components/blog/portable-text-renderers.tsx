import Image from "next/image";
import {
  PortableText,
  type PortableTextReactComponents,
  type PortableTextBlock,
} from "@portabletext/react";

// TODO: Ensure urlFor is correctly imported and configured from your Sanity client setup.
// import { urlFor } from '@/lib/sanity/client';
// Using a placeholder if actual urlFor is not available during this step:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const urlFor = (source: any) => ({
  image: () => ({
    url: () =>
      source?.asset?._ref ||
      "https://via.placeholder.com/800x400.png?text=Placeholder+Image",
  }),
});

interface BlockProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any; // TODO: Replace 'any' with more specific types if available (e.g., from @portabletext/types)
  // For example: value: PortableTextBlock | CustomBlockType;
}

// Code Block Renderer
const CodeBlockRenderer: React.FC<BlockProps> = ({ value }) => {
  if (!value?.code) return null;
  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 my-6 overflow-x-auto border border-zinc-200 dark:border-zinc-700 shadow-sm">
      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
        <code>{value.code}</code>
      </pre>
      {value.language && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
          Language: {value.language}
        </div>
      )}
    </div>
  );
};

// Info Block Renderer
const InfoBlockRenderer: React.FC<BlockProps> = ({ value }) => {
  if (!value?.text) return null;
  return (
    <div className="flex rounded-md border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30 p-4 my-6 shadow">
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
        className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <div className="ml-3 flex-1">
        {value.title && (
          <h4 className="font-semibold mb-1 text-blue-800 dark:text-blue-200">
            {value.title}
          </h4>
        )}
        <div className="text-sm text-blue-700 dark:text-blue-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
          {typeof value.text === "string" ? (
            <p>{value.text}</p>
          ) : (
            <PortableText
              value={value.text as PortableTextBlock[]}
              components={
                portableTextRenderers as Partial<PortableTextReactComponents>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Warning Block Renderer
const WarningBlockRenderer: React.FC<BlockProps> = ({ value }) => {
  if (!value?.text) return null;
  return (
    <div className="flex rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30 p-4 my-6 shadow">
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
        className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <div className="ml-3 flex-1">
        {value.title && (
          <h4 className="font-semibold mb-1 text-yellow-800 dark:text-yellow-200">
            {value.title}
          </h4>
        )}
        <div className="text-sm text-yellow-700 dark:text-yellow-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
          {typeof value.text === "string" ? (
            <p>{value.text}</p>
          ) : (
            <PortableText
              value={value.text as PortableTextBlock[]}
              components={
                portableTextRenderers as Partial<PortableTextReactComponents>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Table Renderer
const TableRenderer: React.FC<BlockProps> = ({ value }) => {
  if (!value?.rows || value.rows.length === 0) return null;
  const headerCells = value.rows[0]?.cells || [];
  const bodyRows = value.rows.slice(1);
  return (
    <div className="overflow-x-auto my-8 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-md">
      <table className="w-full min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        {headerCells.length > 0 && (
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              {headerCells.map((cell: string, i: number) => (
                <th
                  key={i}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white dark:bg-zinc-800/50 divide-y divide-zinc-200 dark:divide-zinc-700">
          {bodyRows.map(
            (row: { _key?: string; cells: string[] }, i: number) => (
              <tr
                key={row._key || i}
                className={
                  i % 2 === 0
                    ? "bg-white dark:bg-zinc-800/50"
                    : "bg-zinc-50 dark:bg-zinc-700/50"
                }
              >
                {row.cells.map((cell: string, j: number) => (
                  <td
                    key={j}
                    className="px-6 py-4 whitespace-normal text-sm text-zinc-700 dark:text-zinc-200"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
};

// Image Renderer for images within the PortableText body
const BodyImageRenderer: React.FC<BlockProps> = ({ value }) => {
  if (!value?.asset) return null;
  const imageUrl = urlFor(value).image().url();
  return (
    <figure className="my-8 transition-all duration-300 ease-in-out hover:shadow-2xl">
      <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
        <Image
          src={imageUrl}
          alt={value.alt || "Blog post image"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1024px"
          className="object-cover transform transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      </div>
      {value.caption && (
        <figcaption className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic px-2">
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
};

export const portableTextRenderers: Partial<PortableTextReactComponents> = {
  types: {
    image: BodyImageRenderer,
    codeBlock: CodeBlockRenderer,
    infoBlock: InfoBlockRenderer,
    warningBlock: WarningBlockRenderer,
    table: TableRenderer,
  },
  marks: {
    link: ({ value, children }) => {
      const href = value?.href as string | undefined;
      const target = href?.startsWith("http") ? "_blank" : undefined;
      return (
        <a
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-primary hover:underline decoration-primary/70 underline-offset-2 transition-colors"
        >
          {children}
        </a>
      );
    },
    highlight: ({ children }) => (
      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-medium">
        {children}
      </span>
    ),
    button: ({ value, children }) => {
      const url = value?.url as string | undefined;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block my-3 px-6 py-3 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/80 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-background"
        >
          {children}
        </a>
      );
    },
    underline: ({ children }) => (
      <span className="underline underline-offset-2 decoration-1 decoration-primary/70">
        {children}
      </span>
    ),
    strike: ({ children }) => (
      <span className="line-through text-zinc-500 dark:text-zinc-400">
        {children}
      </span>
    ),
  },
  block: {
    normal: ({ children }) => (
      <p className="my-5 leading-relaxed text-base md:text-lg">{children}</p>
    ),
    h1: ({ children }) => (
      <h1 className="text-3xl md:text-4xl font-bold text-primary mt-10 mb-5 pb-2 border-b border-border">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-semibold text-primary mt-8 mb-4 pb-1 border-b border-border">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-2xl font-semibold mt-7 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg md:text-xl font-semibold mt-6 mb-2">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/80 pl-5 italic text-zinc-600 dark:text-zinc-300 my-6 py-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-r-md shadow">
        {children}
      </blockquote>
    ),
    lead: ({ children }) => (
      <p className="text-lg md:text-xl font-light text-zinc-700 dark:text-zinc-300 leading-relaxed my-6 tracking-wide">
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 md:pl-8 my-5 space-y-2 marker:text-primary text-base md:text-lg">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 md:pl-8 my-5 space-y-2 marker:text-primary text-base md:text-lg">
        {children}
      </ol>
    ),
    customList: ({ children }) => (
      <ul className="list-none pl-6 md:pl-8 my-5 space-y-2 text-base md:text-lg">
        {children}
      </ul>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="pl-1 leading-relaxed">{children}</li>
    ),
    number: ({ children }) => (
      <li className="pl-1 leading-relaxed">{children}</li>
    ),
    customList: ({ children }) => (
      <li className="relative pl-1 leading-relaxed before:content-['▸'] before:absolute before:left-[-1.2em] before:text-primary before:font-bold">
        {children}
      </li>
    ),
  },
};
