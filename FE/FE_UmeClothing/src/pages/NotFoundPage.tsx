import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển."
      action={
        <Link to="/" className="btn-primary">
          Về trang chủ
        </Link>
      }
    />
  );
}
