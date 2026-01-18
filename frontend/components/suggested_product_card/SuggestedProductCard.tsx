type ProductCardProps = {
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
};

export default function ProductCard({
  title,
  description,
  price,
  imageUrl,
}: ProductCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="h-48 w-full object-cover rounded-xl"
        />
      )}

      <div className="mt-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>

        <div className="mt-4 text-lg font-bold">${price}</div>
      </div>
    </div>
  );
}
