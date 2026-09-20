// Schematic positions: east is +x, north is -z. Distances are compressed for play.
export type CityViewId = 'overview' | 'old-quarter' | 'west-lake' | 'ba-dinh' | 'long-bien';
export type CityPlace = {
  id: string;
  name: string;
  vietnamese: string;
  x: number;
  z: number;
  height: number;
  kind: 'landmark' | 'scene';
  status: 'visit' | 'open' | 'planned';
  district: CityViewId;
  description: string;
  priority: number;
};

export const CITY_VIEWS: { id: CityViewId; label: string; x: number; z: number; span: number }[] = [
  { id: 'overview', label: '全城', x: 0, z: -4, span: 49 },
  { id: 'old-quarter', label: '老城 · 还剑湖', x: 8, z: 9, span: 21 },
  { id: 'west-lake', label: '西湖', x: -13, z: -22, span: 24 },
  { id: 'ba-dinh', label: '巴亭 · 文庙', x: -20, z: 8, span: 23 },
  { id: 'long-bien', label: '红河 · 龙边', x: 29, z: 0, span: 26 },
];

export const CITY_PLACES: CityPlace[] = [
  { id: 'cafe', name: '街角咖啡店', vietnamese: 'CÀ PHÊ · Lạc', x: 3, z: 7, height: 3.8, kind: 'scene', status: 'open', district: 'old-quarter', description: '走进咖啡馆，与 Lạc 用越南语完成一张点单任务。', priority: 100 },
  { id: 'hoan-kiem', name: '还剑湖 · 龟塔', vietnamese: 'Hồ Hoàn Kiếm', x: 10, z: 16, height: 2, kind: 'landmark', status: 'visit', district: 'old-quarter', description: '河内老城南侧的标志性湖泊。湖心的龟塔与沿岸绿地是这片城区的视觉中心。', priority: 95 },
  { id: 'west-lake', name: '西湖', vietnamese: 'Hồ Tây', x: -14, z: -24, height: .5, kind: 'landmark', status: 'visit', district: 'west-lake', description: '位于市中心西北侧的大湖，周围分布着寺庙、湖畔街道与现代居住街区。', priority: 94 },
  { id: 'tran-quoc', name: '镇国寺', vietnamese: 'Chùa Trấn Quốc', x: -4, z: -15, height: 4.8, kind: 'landmark', status: 'visit', district: 'west-lake', description: '西湖东南侧的寺庙景观，红色塔身与湖岸相映。沙盘保留了临水岛屿与塔的轮廓。', priority: 72 },
  { id: 'ba-dinh', name: '巴亭广场 · 胡志明陵', vietnamese: 'Quảng trường Ba Đình', x: -17, z: -1, height: 3.5, kind: 'landmark', status: 'visit', district: 'ba-dinh', description: '河内重要的纪念性公共空间，位于还剑湖西北方向，沙盘以广场草坪和纪念建筑呈现。', priority: 89 },
  { id: 'citadel', name: '升龙皇城', vietnamese: 'Hoàng thành Thăng Long', x: -9, z: 4, height: 3.6, kind: 'landmark', status: 'visit', district: 'ba-dinh', description: '河内历史核心之一。位于巴亭与老城区之间，沙盘保留城门、围墙与庭院的形态。', priority: 76 },
  { id: 'literature', name: '文庙 · 国子监', vietnamese: 'Văn Miếu – Quốc Tử Giám', x: -18, z: 14, height: 3, kind: 'landmark', status: 'visit', district: 'ba-dinh', description: '与越南教育历史密切相关的文庙建筑群，位于还剑湖以西，以院落和传统屋顶为特征。', priority: 86 },
  { id: 'cathedral', name: '圣若瑟主教座堂', vietnamese: 'Nhà thờ Lớn Hà Nội', x: 4, z: 18, height: 4.3, kind: 'landmark', status: 'visit', district: 'old-quarter', description: '还剑湖西侧的哥特式教堂，双塔立面是老城区容易辨认的地标。', priority: 60 },
  { id: 'opera', name: '河内大剧院', vietnamese: 'Nhà hát Lớn Hà Nội', x: 16, z: 23, height: 3.5, kind: 'landmark', status: 'visit', district: 'old-quarter', description: '位于还剑湖东南侧的剧院，拥有古典立面与柱廊，周边街区保留法式建筑氛围。', priority: 85 },
  { id: 'long-bien', name: '龙边桥', vietnamese: 'Cầu Long Biên', x: 23, z: -6, height: 3, kind: 'landmark', status: 'visit', district: 'long-bien', description: '跨越红河、连接老城与东岸的历史钢桁架桥。沙盘以重复的钢梁与铁路桥面呈现。', priority: 92 },
  { id: 'red-river', name: '红河', vietnamese: 'Sông Hồng', x: 30, z: 18, height: .4, kind: 'landmark', status: 'visit', district: 'long-bien', description: '红河从河内城区东侧流过，连接两岸的桥梁与沿河绿地构成沙盘的东部景观。', priority: 74 },
  { id: 'market', name: '同春市场', vietnamese: 'Chợ Đồng Xuân', x: 7, z: 0, height: 3.3, kind: 'scene', status: 'open', district: 'old-quarter', description: '走进独立市场沙盘，带着预算问价、议价，装满你的购物袋。采购体验版已开放。', priority: 80 },
  { id: 'hotel', name: '老街酒店', vietnamese: 'Khách sạn', x: 15, z: 6, height: 4, kind: 'scene', status: 'planned', district: 'old-quarter', description: '虚拟教学地点，预留入住、核对预订和提出住宿需求的对话任务。', priority: 35 },
  { id: 'restaurant', name: '河内餐馆', vietnamese: 'Nhà hàng', x: -1, z: 14, height: 2.8, kind: 'scene', status: 'planned', district: 'old-quarter', description: '虚拟教学地点，预留点餐、饮食偏好和结账任务。', priority: 34 },
  { id: 'bus', name: '公交站', vietnamese: 'Trạm xe buýt', x: 12, z: -3, height: 1.8, kind: 'scene', status: 'planned', district: 'old-quarter', description: '虚拟教学地点，预留问路、询问车次和购买车票的任务。', priority: 33 },
];

export const cityPlace = (id: string) => CITY_PLACES.find(place => place.id === id)!;

export function clampCityZoom(value: number) { return Math.min(2.2, Math.max(.75, value)); }

export const CITY_MAP_SOURCES = [
  { label: '河内景点 · 越南旅游局', url: 'https://vietnam.travel/things-to-do/11-must-see-attractions-ha-noi' },
  { label: '河内中心区参考地图', url: 'https://www.trailsofindochina.com/wp-content/uploads/2019/02/TOI_WelcomePack_VN_GuideBook_Ha-noi_FA2_Digital.pdf' },
];
