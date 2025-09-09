interface ResultsCountProps {
  count: number;
}

export const ResultsCount = ({ count }: ResultsCountProps) => {
  return (
    <p className="text-sm text-muted-foreground text-center">
      {count} {count === 1 ? "product" : "products"}
    </p>
  );
};
