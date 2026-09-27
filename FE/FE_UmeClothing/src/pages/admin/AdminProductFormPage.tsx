import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories';
import { errorText, parseApiError } from '../../api/client';
import { productsApi } from '../../api/products';
import ProductImagesManager from '../../components/admin/ProductImagesManager';
import ProductVariantsManager from '../../components/admin/ProductVariantsManager';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import type { Product, ProductRequest, ProductStatus } from '../../types';
import { PRODUCT_STATUS_LABEL } from '../../utils/labels';

interface FormState {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  rentalPrice: string;
  depositPrice: string;
  color: string;
  status: ProductStatus;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  categoryId: '',
  name: '',
  slug: '',
  description: '',
  rentalPrice: '',
  depositPrice: '0',
  color: '',
  status: 'Available',
};

const fromProduct = (p: Product): FormState => ({
  categoryId: String(p.categoryId),
  name: p.name,
  slug: p.slug,
  description: p.description ?? '',
  rentalPrice: String(p.rentalPrice),
  depositPrice: String(p.depositPrice),
  color: p.color,
  status: p.status,
});

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.categoryId) e.categoryId = 'Vui lòng chọn danh mục.';
  if (f.name.trim().length < 2) e.name = 'Tên sản phẩm phải có ít nhất 2 ký tự.';
  const rental = Number(f.rentalPrice);
  if (!f.rentalPrice || !Number.isFinite(rental) || rental <= 0) e.rentalPrice = 'Giá thuê phải lớn hơn 0.';
  const deposit = Number(f.depositPrice);
  if (f.depositPrice === '' || !Number.isFinite(deposit) || deposit < 0) e.depositPrice = 'Tiền cọc không hợp lệ.';
  if (!f.color.trim()) e.color = 'Màu sắc là bắt buộc.';
  return e;
}

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const productId = Number(id);
  const validId = !isEdit || (Number.isInteger(productId) && productId > 0);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const productQuery = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => productsApi.getById(productId),
    enabled: isEdit && validId,
  });

  // Nạp form một lần khi mở sản phẩm; không ghi đè khi ảnh thay đổi.
  useEffect(() => {
    if (productQuery.data) setForm(fromProduct(productQuery.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery.data?.id]);

  const saveMutation = useMutation({
    mutationFn: (payload: ProductRequest) => (isEdit ? productsApi.update(productId, payload) : productsApi.create(payload)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (isEdit) {
        queryClient.setQueryData(['admin', 'product', saved.id], saved);
        setForm(fromProduct(saved));
        toast('success', 'Đã lưu thay đổi.');
      } else {
        toast('success', 'Đã tạo sản phẩm. Hãy thêm hình ảnh.');
        navigate(`/admin/products/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (err) => setServerError(errorText(err)),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length > 0) return;

    saveMutation.mutate({
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      rentalPrice: Number(form.rentalPrice),
      depositPrice: Number(form.depositPrice),
      color: form.color.trim(),
      status: form.status,
    });
  };

  if (!validId) {
    return <EmptyState title="Đường dẫn không hợp lệ" action={<Link to="/admin/products" className="btn-primary">Về danh sách</Link>} />;
  }

  if (isEdit && productQuery.isLoading) return <Skeleton className="h-96 w-full" />;

  if (isEdit && productQuery.isError) {
    if (parseApiError(productQuery.error).status === 404) {
      return <EmptyState title="Không tìm thấy sản phẩm" action={<Link to="/admin/products" className="btn-primary">Về danh sách</Link>} />;
    }
    return <ErrorState message={errorText(productQuery.error)} onRetry={() => void productQuery.refetch()} />;
  }

  const err = (k: keyof FormState) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/admin/products" className="text-sm text-slate-500 hover:text-brand-700">
          ← Danh sách sản phẩm
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h1>
      </div>

      <form onSubmit={submit} noValidate className="card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="p-name" className="label">
              Tên sản phẩm *
            </label>
            <input id="p-name" className="input" maxLength={200} value={form.name} onChange={(e) => set('name', e.target.value)} />
            {err('name')}
          </div>

          <div>
            <label htmlFor="p-cat" className="label">
              Danh mục *
            </label>
            <select id="p-cat" className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.isActive ? ' (đã tắt)' : ''}
                </option>
              ))}
            </select>
            {err('categoryId')}
          </div>

          <div>
            <label htmlFor="p-status" className="label">
              Trạng thái catalog
            </label>
            <select id="p-status" className="input" value={form.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
              {(Object.keys(PRODUCT_STATUS_LABEL) as ProductStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PRODUCT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">Chỉ “Đang cho thuê” mới nhận đặt. Việc sản phẩm đang được thuê hay không được tính từ đơn thuê, không phải trạng thái này.</p>
          </div>

          <div>
            <label htmlFor="p-rental" className="label">
              Giá thuê / ngày (VND) *
            </label>
            <input id="p-rental" type="number" min={0} step={1000} className="input" value={form.rentalPrice} onChange={(e) => set('rentalPrice', e.target.value)} />
            {err('rentalPrice')}
            {isEdit && <p className="mt-1 text-xs text-slate-400">Đổi giá không ảnh hưởng các đơn đã đặt (giá được lưu cố định trong đơn).</p>}
          </div>

          <div>
            <label htmlFor="p-deposit" className="label">
              Tiền cọc (VND) *
            </label>
            <input id="p-deposit" type="number" min={0} step={1000} className="input" value={form.depositPrice} onChange={(e) => set('depositPrice', e.target.value)} />
            {err('depositPrice')}
          </div>

          <div>
            <label htmlFor="p-color" className="label">
              Màu sắc *
            </label>
            <input id="p-color" className="input" maxLength={50} value={form.color} onChange={(e) => set('color', e.target.value)} />
            {err('color')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="p-slug" className="label">
              Slug
            </label>
            <input id="p-slug" className="input" maxLength={200} placeholder="Để trống để tự tạo từ tên" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
            {isEdit && <p className="mt-1 text-xs text-slate-400">Đổi slug sẽ làm đổi URL công khai của sản phẩm.</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="p-desc" className="label">
              Mô tả
            </label>
            <textarea id="p-desc" className="input min-h-[120px]" maxLength={4000} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link to="/admin/products" className="btn-secondary">
            Quay lại
          </Link>
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </button>
        </div>
      </form>

      {isEdit && productQuery.data ? (
        <>
          <ProductVariantsManager productId={productQuery.data.id} variants={productQuery.data.variants} />
          <ProductImagesManager product={productQuery.data} />
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Hãy tạo sản phẩm trước, sau đó bạn có thể thêm size và tải hình ảnh lên.
        </p>
      )}
    </div>
  );
}
