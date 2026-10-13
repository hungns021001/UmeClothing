export const shopInfo = {
  name: 'UME Dress',
  description: 'Cho thuê váy, áo dài dự tiệc và chụp ảnh.',
  startingPrice: '100.000đ',
  phone: '0359.279.546',
  phoneLink: '+84359279546',
  address: 'Tầng 2, 92B Lê Đại Hành, Phường Sông Trí, Hà Tĩnh',
  addressNote: 'Bên cạnh tiệm vàng Kim Khánh Thủy – chợ cũ Kỳ Anh',
  openingHours: '08:00 – 22:00, Thứ 2 – Chủ nhật',
  facebookPageId: '100086918512794',
} as const;

export const shopLinks = {
  messenger: `https://m.me/${shopInfo.facebookPageId}`,
  zalo: 'https://zalo.me/0359279546',
  directions: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shopInfo.address}, ${shopInfo.addressNote}`,
  )}`,
  mapEmbed: `https://www.google.com/maps?q=${encodeURIComponent(
    `${shopInfo.address}, ${shopInfo.addressNote}`,
  )}&output=embed`,
} as const;
