import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { errorText, parseApiError } from '../api/client';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ProductListing from '../components/ProductListing';
import Spinner from '../components/Spinner';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const categoryQuery = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.getBySlug(slug as string),
    enabled: !!slug,
  });

  if (categoryQuery.isLoading) return <Spinner />;

  if (categoryQuery.isError) {
    if (parseApiError(categoryQuery.error).status === 404) {
      return (
        <EmptyState
          title="Không tìm thấy danh mục"
          action={
            <Link to="/products" className="btn-primary">
              Xem tất cả sản phẩm
            </Link>
          }
        />
      );
    }
    return <ErrorState message={errorText(categoryQuery.error)} onRetry={() => void categoryQuery.refetch()} />;
  }

  const category = categoryQuery.data;
  if (!category) return null;

  return (
    <ProductListing
      key={category.slug}
      title={category.name}
      subtitle={category.description ?? undefined}
      fixedCategorySlug={category.slug}
    />
  );
}
